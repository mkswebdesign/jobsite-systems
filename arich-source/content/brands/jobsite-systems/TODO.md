# Jobsite Systems — content TODO list

Things that need real content before / shortly after public launch. Each item
is something a human (not the agent) has to source.

## Testimonials
- Replace pilot / beta-tester paraphrases in `testimonials.json` with real
  client quotes. Required attribution format:
  - Real first name + last initial (e.g. "Kyle M.")
  - Specific business type AND city/state (e.g. "Owner, Apex HVAC — Cleveland, OH")
  - Optional: small headshot
- Until those land, mark any non-paying-client quote as `Beta tester` or
  `Pilot client` rather than presenting them as paying customers.
- The home page (`pages/home/sections/05-testimonials.json`) currently surfaces
  five quotes by id. Same source pool used on Services / Work / Contact / Pricing.

## About page
- Founder bio (2–3 sentences): name, years in web work, why they started
  Jobsite Systems. Lives at `pages/about/...` (block name TBD when scaffolded).
- Real founder photo.
- Optional credibility counter (e.g. "10+ sites shipped" or "Onboarding our
  first cohort"). Even a small number beats nothing.

## Work page
- Real client launches (with permission + city/state) replace the demo cards
  on `/work/` as practices come online.

## SLA wording
- The "99.99% Uptime SLA" line on the homepage hero needs to be backed by
  Terms of Service language (credit/refund mechanics) OR softened to
  "typical uptime / monitored 24/7" if not contractually guaranteed.
