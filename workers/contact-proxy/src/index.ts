// Brand routing config — single source of truth shared with the smoke test
// (scripts/smoke.mjs). Adding/removing a brand: edit brands.json and redeploy.
// The smoke test picks up the new brand automatically.
//
// Convention for child-brand sites without their own verified Emailit domain:
//   from: '<Brand> via GoMKS <hello@gomks.com>'   (verified parent domain)
//   to:   'leads@gomks.com'                        (centralized leads inbox)
// See memory/emailit_domain_verification.md for the why.
import brandsConfig from '../brands.json';

type BrandConfig = {
  from: string;
  to: string;
  origin: string;
  // Additional admin recipients copied on every submission for this brand,
  // regardless of form_source. Use for "the lead@ inbox is the operational
  // mailbox, but I also want a copy in my own inbox" routing.
  notify?: string[];
};

const BRANDS: Record<string, BrandConfig> = brandsConfig.brands as Record<string, BrandConfig>;
const FALLBACK_BRAND: string = brandsConfig.fallbackBrand;

const REQUIRED_FIELDS = ['name', 'email', 'message', 'terms'] as const;
const EMAILIT_ENDPOINT = 'https://api.emailit.com/v2/emails';

/* Attachment policy. Emailit caps total email size at 40MB; after base64
 * inflation (~33%) that leaves ~30MB of raw payload. We keep the per-file
 * cap well under that and limit the file count so a single submission can
 * never approach the email-size ceiling. Type whitelist is intentionally
 * narrow — these are the formats that make sense for logo / artwork
 * attachments coming through an onboarding flow. */
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_ATTACHMENTS = 4;
const ALLOWED_ATTACHMENT_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'application/pdf',
]);

interface Env {
  EMAILIT_API_KEY: string;
}

interface EmailitAttachment {
  filename: string;
  content: string;
  content_type: string;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') ?? '';

  if (request.method === 'OPTIONS') {
    return preflight(origin);
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Expected multipart/form-data.' }, 400, origin);
  }

  if (str(form, '_gotcha')) {
    return json({}, 200, origin);
  }

  const brandKey = str(form, 'brand') ?? '';
  const brand = BRANDS[brandKey] ?? BRANDS[FALLBACK_BRAND];
  const resolvedBrandKey = BRANDS[brandKey] ? brandKey : FALLBACK_BRAND;

  const missing = REQUIRED_FIELDS.filter((f) => !str(form, f));
  if (missing.length) {
    return json(
      { error: `Please fill out: ${missing.join(', ')}.` },
      400,
      origin,
    );
  }

  /* Collect File entries from the multipart payload. Forms that don't
   * include any file inputs (start, contact) just fall through with an
   * empty attachments array, so this path is a no-op for them.
   *
   * NOTE: workers-types top-level index.d.ts mistypes `entries()` as
   * yielding `[string, string]` even though the runtime can return File.
   * The cast restores the correct (File | string) value type. */
  const attachments: EmailitAttachment[] = [];
  const formIter = form.entries() as unknown as IterableIterator<[string, string | File]>;
  for (const [, value] of formIter) {
    if (typeof value === 'string') continue;
    if (value.size === 0) continue;
    if (attachments.length >= MAX_ATTACHMENTS) {
      return json(
        { error: `Too many files. Max ${MAX_ATTACHMENTS} per submission.` },
        400,
        origin,
      );
    }
    if (value.size > MAX_ATTACHMENT_BYTES) {
      return json(
        { error: `File "${value.name}" is too large. Max ${(MAX_ATTACHMENT_BYTES / 1024 / 1024).toFixed(0)}MB per file.` },
        400,
        origin,
      );
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(value.type)) {
      return json(
        { error: `File type "${value.type || 'unknown'}" is not supported. Use PNG, JPG, SVG, WebP, or PDF.` },
        400,
        origin,
      );
    }
    const buf = await value.arrayBuffer();
    attachments.push({
      filename: sanitizeFilename(value.name),
      content: arrayBufferToBase64(buf),
      content_type: value.type,
    });
  }

  const visitorEmail = str(form, 'email')!;
  const subject =
    str(form, '_subject') || `New inquiry from ${brandKey || resolvedBrandKey}`;
  const { html, text } = renderEmail(form, {
    brandKey,
    resolvedBrandKey,
    origin,
    attachmentNames: attachments.map((a) => a.filename),
  });

  const recipients = [brand.to, ...(brand.notify ?? [])].filter(
    (addr, i, all) => addr && all.indexOf(addr) === i,
  );

  // Dry-run mode: smoke tests / synthetic monitoring set `_dry_run=1` to
  // exercise the full inbound path (CORS, validation, brand resolution,
  // recipient computation) WITHOUT actually calling Emailit. Returns the
  // resolved routing so the caller can assert it matches expectations,
  // and avoids burning Emailit quota / generating inbox noise on every
  // health check. NOT triggerable by ordinary form posts (form HTML
  // never includes _dry_run).
  if (str(form, '_dry_run') === '1') {
    return json(
      {
        ok: true,
        dryRun: true,
        resolved: {
          brand: resolvedBrandKey,
          from: brand.from,
          to: recipients,
          subject,
          attachments: attachments.map((a) => ({ filename: a.filename, content_type: a.content_type })),
        },
      },
      200,
      origin,
    );
  }

  const sendRes = await fetch(EMAILIT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.EMAILIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: brand.from,
      to: recipients,
      reply_to: visitorEmail,
      subject,
      html,
      text,
      ...(attachments.length > 0 && { attachments }),
    }),
  });

  const sendBody = await sendRes.text();
  if (!sendRes.ok) {
    console.error('emailit error', sendRes.status, sendBody);
    return json({ error: 'Upstream email delivery failed.' }, 502, origin);
  }
  // Log the Emailit success response so we can correlate with their
  // dashboard / delivery status when troubleshooting "API said 200 but
  // recipient never got the email" reports.
  console.log(
    'emailit ok',
    sendRes.status,
    'brand=' + resolvedBrandKey,
    'to=' + recipients.join(','),
    'body=' + sendBody.slice(0, 500),
  );

  return json({ ok: true }, 200, origin);
}

// Scheduled handler — fired by Cloudflare on the cron schedules in
// wrangler.toml. Invokes the same code path as a real form post (via
// handleRequest with a synthetic Request) for each brand, in dry-run mode
// for high-cadence checks and real-send mode for the weekly delivery
// proof. Failures are logged AND emailed as an [ALERT].
async function handleScheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  // event.cron is the literal string from wrangler.toml that fired this
  // invocation — switch behavior based on it. Treat anything not on the
  // weekly schedule as the dry-run cadence (safer default).
  const realMode = event.cron === '0 13 * * 1';
  const cronLabel = realMode ? 'weekly-real' : '6h-dry';
  const startedAt = new Date().toISOString();
  const brandKeys = Object.keys(BRANDS);

  console.log(`[cron-smoke ${cronLabel}] starting — ${brandKeys.length} brands @ ${startedAt}`);

  const results = await Promise.all(
    brandKeys.map(async (brandKey) => {
      const form = new FormData();
      form.set('brand', brandKey);
      form.set('name', 'Cron Smoke');
      form.set('email', 'noreply@gomks.com');
      form.set('message', `Cron smoke (${cronLabel}) @ ${startedAt}`);
      form.set('terms', 'cron-smoke');
      form.set('_subject', `[CRON-SMOKE${realMode ? '' : '-DRY'}] ${brandKey} @ ${startedAt}`);
      form.set('form_source', 'cron-smoke');
      if (!realMode) form.set('_dry_run', '1');

      const req = new Request('https://contact-proxy.anthony-abc.workers.dev/', {
        method: 'POST',
        body: form,
      });

      try {
        const res = await handleRequest(req, env);
        const body: any = await res.json().catch(() => ({}));
        return {
          brand: brandKey,
          ok: res.ok && body.ok === true,
          status: String(res.status),
          error: body.error || null,
        };
      } catch (e) {
        return {
          brand: brandKey,
          ok: false,
          status: 'EXCEPTION',
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );

  const failed = results.filter((r) => !r.ok);
  const summary = `${results.length - failed.length}/${results.length} ok`;
  console.log(`[cron-smoke ${cronLabel}] done — ${summary}`);
  if (failed.length > 0) {
    console.error(
      `[cron-smoke ${cronLabel}] FAILURES:`,
      JSON.stringify(failed),
    );
    // ctx.waitUntil keeps the worker alive past the scheduled handler return
    // so the alert email actually has time to send before the runtime kills
    // the invocation. Best-effort: if Emailit itself is the broken thing,
    // the alert won't deliver — log is the backup signal.
    ctx.waitUntil(sendCronAlert(env, cronLabel, results, failed, startedAt));
  }
}

async function sendCronAlert(
  env: Env,
  cronLabel: string,
  results: Array<{ brand: string; ok: boolean; status: string; error: string | null }>,
  failed: Array<{ brand: string; ok: boolean; status: string; error: string | null }>,
  startedAt: string,
): Promise<void> {
  try {
    const subject = `[ALERT] contact-proxy smoke failed: ${failed.length}/${results.length} brand(s) (${cronLabel})`;
    const passed = results.filter((r) => r.ok);
    const text = [
      `Scheduled smoke detected ${failed.length} failed brand(s) at ${startedAt}.`,
      ``,
      `Cadence: ${cronLabel}`,
      `Worker:  contact-proxy.anthony-abc.workers.dev`,
      ``,
      `Failures (${failed.length}):`,
      ...failed.map((f) => `  - ${f.brand}: status=${f.status} error=${f.error || '(none)'}`),
      ``,
      `Passed (${passed.length}):`,
      ...(passed.length === 0 ? ['  (none)'] : passed.map((r) => `  - ${r.brand}`)),
      ``,
      `Investigate live logs:`,
      `  cd workers/contact-proxy && npx wrangler tail`,
      ``,
      `Re-run smoke locally:`,
      `  cd workers/contact-proxy && npm run smoke           (dry-run)`,
      `  cd workers/contact-proxy && npm run smoke -- --real (full path)`,
    ].join('\n');

    const res = await fetch(EMAILIT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAILIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Contact Proxy Monitor <hello@gomks.com>',
        to: ['leads@gomks.com'],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[cron-smoke] alert email send failed:', res.status, body);
    } else {
      console.log('[cron-smoke] alert email sent');
    }
  } catch (e) {
    console.error('[cron-smoke] alert email exception:', e);
  }
}

export default {
  fetch: handleRequest,
  scheduled: handleScheduled,
};

function str(form: FormData, name: string): string | null {
  const v = form.get(name);
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/* btoa() chokes on large strings if you spread the Uint8Array into
 * String.fromCharCode in one shot — both because the spread blows the
 * argument-count limit and because constructing the intermediate string
 * is O(n^2). Chunked accumulation keeps memory linear and avoids the
 * stack-overflow path for ~5MB inputs. */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, Array.from(slice) as unknown as number[]));
  }
  return btoa(chunks.join(''));
}

/* Strip path separators and exotic characters from filenames so a hostile
 * upload can't smuggle directory traversal or weird unicode through to
 * mail clients. Keep alphanumerics, dots, dashes, underscores, spaces. */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\- ]+/g, '_').replace(/_{2,}/g, '_').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'upload';
}

type RenderMeta = { brandKey: string; resolvedBrandKey: string; origin: string; attachmentNames?: string[] };

function renderEmail(form: FormData, meta: RenderMeta): { html: string; text: string } {
  const rows: Array<[string, string]> = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith('_') || key === 'brand' || typeof value !== 'string') continue;
    rows.push([key, value]);
  }
  if (meta.attachmentNames && meta.attachmentNames.length > 0) {
    rows.push(['attachments', meta.attachmentNames.join(', ')]);
  }

  const footer = buildFooter(meta);
  const text =
    rows.map(([k, v]) => `${labelize(k)}: ${v}`).join('\n\n') + '\n\n---\n' + footer.text;
  const html =
    '<table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">' +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 12px;vertical-align:top;color:#666;white-space:nowrap"><strong>${escape(
            labelize(k),
          )}</strong></td><td style="padding:8px 12px;vertical-align:top">${escape(v).replace(
            /\n/g,
            '<br>',
          )}</td></tr>`,
      )
      .join('') +
    '</table>' +
    `<p style="font-family:system-ui,sans-serif;font-size:12px;color:#888;margin-top:20px;border-top:1px solid #eee;padding-top:10px">${footer.html}</p>`;

  return { html, text };
}

function buildFooter(meta: RenderMeta): { html: string; text: string } {
  const fellBack = meta.resolvedBrandKey !== meta.brandKey;
  const parts: string[] = [];
  if (meta.brandKey) parts.push(`brand: ${meta.brandKey}`);
  if (fellBack) parts.push(`routed via fallback (${meta.resolvedBrandKey}) — source brand has no verified emailit domain`);
  if (meta.origin) parts.push(`origin: ${meta.origin}`);
  const line = parts.join(' · ') || 'submission metadata unavailable';
  return { html: escape(line), text: line };
}

function labelize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    Vary: 'Origin',
  };
}

function preflight(origin: string): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
