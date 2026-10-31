# Street Taste Truck

A bilingual (English / Arabic, LTR / RTL) Next.js App Router application with two independent storefronts, PostgreSQL / Drizzle persistence, custom secure authentication, and private operations workspaces.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL` (a PostgreSQL or Neon connection string).
3. Apply the schema: `npx drizzle-kit push`. Versioned SQL is also included in `drizzle/`.
4. Seed initial trucks, menus, regions, branding, and accounts: `npx tsx src/db/seed.ts`.
5. Run `npm run dev`, or `npm run build` followed by `npm run start` for a local production instance.

Seeding is idempotent. It does not replace existing menus, prices, passwords, or settings. All money is stored as integer fils; one Bahraini dinar is 1,000 fils.

## Customer routes

- `/` — strictly two customer destinations; no staff links or staff route disclosures in the UI.
- `/beverage` and `/food` — independent menus, category filters, search, ingredient customization, persistent cart, pickup / delivery, coupon validation, subscriptions, guest checkout, registration and account history.

## Private routes

Access these URLs directly. Route obscurity is not the security mechanism: all data and mutations also require authenticated server-side permission checks.

| Workspace | URL | Initial username | Initial password |
| --- | --- | --- | --- |
| Global management | `/admin/global` | `ahmad` | `Verde@123` |
| Beverage management | `/admin/beverage` | `ahmad` | `Verde@123` |
| Food management | `/admin/food` | `ahmad` | `Verde@123` |
| Beverage kitchen | `/kitchen/beverage` | `beverage` | `12345678` |
| Food kitchen | `/kitchen/food` | `kitchen` | `12345678` |

**Before exposing the app publicly, change all seeded passwords.** Ahmad changes his own password in workspace account settings. Only Ahmad can create, alter, assign permissions to, or delete secondary staff. No management mutation can edit or delete Ahmad's protected account. Staff credentials are never rendered on customer pages.

Employee permissions are independently scoped to a truck and to orders, reports, menu, delivery regions, promotions, CRM, subscriptions, and settings. Kitchen accounts can only complete orders and cannot reverse completion, including through direct API requests. Management overrides are recorded in the audit log. Sessions are 256-bit random tokens; only SHA-256 digests are stored in PostgreSQL. Cookies are HTTP-only, SameSite=Lax, and Secure in production. Passwords use bcrypt with cost 12. Login, OTP, checkout, and recovery attempts are rate-limited in the database.

## Resend email setup

Configure both `RESEND_API_KEY` and `RESEND_FROM` in your deployment environment. The sender must belong to a verified domain in Resend. Set `APP_URL` to the canonical HTTPS deployment origin.

Registration verifies a customer's email using a 6-digit code, expiring after ten minutes, with five attempts maximum. Password recovery uses a separate single-use OTP. Verification / reset codes are never returned in API responses or exposed in the UI or logs. Successful resets invalidate existing sessions. CRM password recovery emails the customer rather than giving employees access to passwords.

Without email configuration, guest checkout remains fully functional. Registration and email recovery report a clear configuration error rather than pretending an email was sent. Order confirmation emails are attempted when email service is configured; an email delivery failure does not discard an accepted order.

## Operational behavior

- Truck opening shifts and subscription discounts are independent database settings. Default shifts are 08:00–14:00 and 17:00–23:00, daily, Bahrain time (UTC+3).
- Customer selectors and server validation restrict orders to operating slots. Closing times are exclusive; slots are generated every 30 minutes. Standard orders may be scheduled up to 30 days ahead.
- Subscription ranges span at most 60 days. Customers select active weekdays and a separate item / quantity for each weekday. The server recalculates all prices, applies the configured discount to items only, and adds the area delivery fee to every delivery. The subscription and all scheduled orders are written in one transaction.
- Existing subscriptions retain their agreed discount, totals, and scheduled orders when settings change. Changes apply to new plans.
- Prices, availability, fees, coupon validity, customer scope, and all discounts are validated server-side. Client-supplied totals are ignored.
- Payment is **cash / pay on pickup or delivery**. There is no card gateway, card storage, or claim of an online payment. Report revenue represents placed orders, not reconciled cash collections.
- Live boards poll every ten seconds; customer receipts also poll every ten seconds. Menu availability refreshes every minute. This works on Vercel without long-lived WebSocket servers.
- Kitchen direct-order reminders repeat every three minutes. Subscription reminders start 60 minutes before delivery and repeat every five minutes. Click **Enable sound** once per browser tab: browsers require an explicit gesture before playing audio. Visual alerts work independently. Keep the kitchen tab open and the device awake for reliable browser alarms.
- Announcements are date-scoped, truck-specific, and dismissed per browser session. Images can be HTTPS URLs or PNG / JPEG / WebP uploads up to 2 MB. Uploads are stored in PostgreSQL, not an ephemeral Vercel filesystem. A managed object store can be substituted for higher-volume deployments.
- Anonymous order receipts require a 256-bit private tracking token. Registered customers can access only their own history.

## APIs

- `GET /api/site` — public homepage branding.
- `GET /api/catalog/:truck` — active menu, categories, delivery regions, hours, discount, scheduled announcements.
- `GET /api/auth`, `POST /api/auth` — login, registration, verify / resend OTP, forgot / reset password, logout, profile, own password update.
- `GET /api/orders`, `POST /api/orders`, `PATCH /api/orders` — private receipt / account history, validated checkout, scoped status transitions.
- `GET /api/subscriptions`, `POST /api/subscriptions` — account plans and transactional scheduled plan creation.
- `POST /api/coupons` — rate-limited active-code validation.
- `GET /api/manage?resource=...&truck=...`, `POST /api/manage` — permission-protected CRUD, CRM recovery, staff, branding, operating hours, and global discount controls.
- `GET /api/reports?truck=food|beverage|global&from=YYYY-MM-DD&to=YYYY-MM-DD&format=xlsx|pdf` — authenticated Excel / PDF export. Omit `format` for analytics JSON. Report workbooks include summary, orders, and item performance.
- `GET /api/health` — database connectivity healthcheck.

SheetJS CE 0.20.3 is used for report generation (via the version-pinned npm distribution `@e965/xlsx`, avoiding the outdated `xlsx` npm release). jsPDF generates multi-page reports. No untrusted Excel workbook parsing is exposed.

## Vercel + Neon deployment

1. Push the repository to GitHub, excluding `.env` and local build artifacts.
2. Create a Neon PostgreSQL database and set the pooled `DATABASE_URL` in Vercel. Include the TLS options supplied by Neon.
3. Configure `RESEND_API_KEY`, verified `RESEND_FROM`, and the canonical `APP_URL` in Vercel. Secrets are read only on the server.
4. Run the migration / `drizzle-kit push` and the seed script against the target database as an explicit deployment setup step. Do not run destructive schema commands in application request handlers.
5. Deploy with the standard Next.js preset (`npm run build`). The application uses the Node.js runtime for PostgreSQL and reports.
6. Change seeded passwords, test email delivery from the verified domain, and enable audio on each kitchen device.

For ongoing operations, periodically prune expired sessions, OTP tokens, and rate-limit rows. Configure database backups, production monitoring, and an appropriate data-retention policy. Reconcile actual cash receipts separately from order-value reports.

## Validation and tests

- `npx next typegen`
- `npm exec tsc -- --noEmit --pretty false`
- `npm run build`
- `BASE_URL=http://localhost:3000 npx tsx tests/api-smoke.ts` (against a running seeded instance; cleans up its own test records)
- Browser smoke coverage and screenshots: `BASE_URL=http://localhost:3000 npx tsx tests/browser-smoke.ts` after `npx playwright install --with-deps chromium`.

The landing photography and selected menu product photos are custom-generated for this application. Additional menu photography uses Pexels imagery, with local hero fallbacks if remote media is unavailable. Fonts are self-hosted so deployment builds do not depend on Google Fonts network availability.
