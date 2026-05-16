/**
 * Per-demo display name registry. Used by the floating demo nav (badge
 * shows the sample brand's name rather than the slug) and the /demo/
 * archive page (card titles).
 *
 * Promote to a per-demo manifest (demos/<demo>/demo.json) once the list
 * grows past a handful of entries.
 */
export const DEMO_NAMES: Record<string, string> = {
  flinthills: 'Flinthills Landscaping',
  'kc-snowplowing': 'KC Snowplowing',
};

export function demoDisplayName(id: string): string {
  return DEMO_NAMES[id] || id.charAt(0).toUpperCase() + id.slice(1);
}
