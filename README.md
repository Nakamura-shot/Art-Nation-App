# Art Nation Cebu Booking App — Database-backed V1

This build is the first usable replacement layer for SimplyBookMe. It includes public event discovery, direct event/QR pages, multi-participant booking, event-specific intake fields, early-bird pricing, manual GCash/InstaPay receipt upload, Supabase persistence, admin authentication, receipt review, and payment confirmation.

## 1. Create a Supabase project
Create a new Supabase project, then open **SQL Editor**. Run `supabase/schema.sql` first and `supabase/seed.sql` second.

## 2. Configure environment variables
Copy `.env.example` to `.env.local` and paste the values from **Supabase > Project Settings > API**.

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable or expose it to the browser.

## 3. Create the Art Nation admin account
In **Supabase > Authentication > Users**, create the email/password account that Art Nation staff will use. Any valid Supabase Auth user can currently enter `/admin/login`; role restrictions are a later hardening step.

## 4. Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`. Admin login is at `http://localhost:3000/admin/login`.

Without Supabase environment variables, the public event pages still display the bundled demo events, but booking submission and admin functions require Supabase.

## Booking flow
1. Customer opens an event-specific URL or scans its QR code.
2. Customer selects participant quantity and fills the event-specific intake form.
3. Server re-checks capacity and calculates the active Regular/Early Bird price itself.
4. Customer chooses GCash or InstaPay and uploads a payment receipt.
5. Booking, participants, payment and private receipt are stored in Supabase.
6. Admin signs in, opens the receipt, and clicks **Confirm payment**.
7. Order, booking and payment records become confirmed/verified.

## Important next development work
The next practical milestone is an admin **Event Manager** so Art Nation can create/edit locations, sessions, prices, capacities, Early Bird deadlines and intake fields without using the Supabase dashboard. After that, add the multi-event cart and then the painting-guide system.


## V8
Admin Event Manager: `/admin/events` and `/admin/events/new`. Create published sessions with type, location, date/time, capacity, pricing, early-bird deadline and dynamic participant questions.


## V9
Redesigned admin backend: live dashboard, metrics, upcoming events, recent bookings, quick actions, event performance, modern event list, duplicate/publish controls, and a redesigned event editor with preview.


## V10 — Rich Event Creator

Before using V10 on an existing Supabase project, run `supabase/v10-migration.sql` once in the Supabase SQL Editor.

V10 adds:
- Rich-text event descriptions with headings, font family, font size, text color, bold, italic, underline, strike-through, alignment and lists.
- HTML-aware public event descriptions, preserving paragraphs, spacing and line breaks.
- Event dates default to today's date in Asia/Manila.
- Cover-photo upload to the public `event-covers` Supabase Storage bucket.
- Cover photos displayed on event cards and event detail pages.
- Reusable participant-form templates, including a starter `Default Paint & Sip Form`.
- Save the current participant questions as a named template and optionally make it the default.


## V11
- Real cover-photo thumbnails in the admin Events list.
- Edit button for every event.
- Full event editing for title, rich description, cover image, event type, venue, date/time, capacity, prices, Early Bird deadline and participant questions.
- Existing bookings remain attached when an event is edited.


## V12 — Locations Manager

Run `supabase/v12-migration.sql` once on an existing V10/V11 Supabase database.

Adds:
- Dedicated `/admin/locations` manager.
- Add/edit venue name, address, contact person, phone, email, map URL, capacity/setup notes and internal notes.
- Activate/deactivate venues without deleting history.
- Safe deletion only when a venue has never been used by an event.
- Assign a saved participant-form template to a location.
- New event creator can automatically switch to a venue's saved form when that location is selected.
- Locations link activated in the admin sidebar and dashboard.


## V13 — Admin session fix
- Stores Supabase refresh tokens as secure httpOnly cookies.
- Admin write routes automatically refresh expired access tokens.
- Prevents "Unauthorized" errors when an admin page has been open for more than the access-token lifetime.
- Adds a visible Sign out button.
- Existing browser sessions created before V13 do not contain a refresh token; sign in once after upgrading to V13.


## V14 — Public Location Pages + Venue Menus

Run `supabase/v14-migration.sql` once after V12.

Adds:
- Venue hero/photo upload in Locations Manager.
- Public URL slug, public description, website and opening-hours fields.
- Menu highlights with item photo, description, category and price.
- Filterable public `/locations` directory.
- Rich public `/locations/[slug]` page with venue hero, address, upcoming events, menu photos, embedded Google Map and contact details.
- Event booking pages link the venue name directly to its public location page.
- Public event cards on venue pages use real event cover images.


## V15 — Painting Library + Techniques Library

Run `supabase/v15-migration.sql` once after V14.

Adds:
- Admin Painting Library at `/admin/paintings`.
- Painting profiles with cover image, difficulty, time, canvas size, materials and public guide.
- Guide Builder with ordered steps, beginner-friendly instructions, step image, short-video upload/external URL and reusable technique reference.
- Admin Techniques Library at `/admin/techniques`.
- Technique instructions, category, image, uploaded short video or external video URL.
- Starter techniques: Background Wash, Blending, Shading, Highlights and Dry Brushing.
- Public `/guides`, `/guides/[slug]`, `/techniques`, and `/techniques/[slug]` pages.
- Each guide step links to its referenced technique.
- Event creator/editor can attach a painting guide to an event.
- Booking event pages show the attached painting guide.


## V16 — Customer Guide Access + Kit QR Activation

Run `supabase/v16-migration.sql` once after V15.

Adds:
- Restricted vs public painting-guide access.
- Automatic guide unlock when an admin confirms a booking whose event has a painting guide attached.
- Customer `My Guides` portal with a unique private access link.
- Admin Customers page showing booking/customer history and unlocked guides.
- Admin Guide Access manager for generating one or many activation codes.
- QR-ready activation links for physical Paint & Sip kits.
- Configurable uses per activation code and optional expiry.
- Public `/activate/[code]` flow that grants the selected guide to an existing/new customer.
- Restricted guide pages validate the customer's portal access token before showing step content.


## V17 — Multi-Participant Guide Entitlements + Expiring Event QR

Run `supabase/v17-migration.sql` once after V16.

Adds:
- One digital-guide entitlement per paid participant rather than one entitlement per booking.
- Optional guide-access email for every participant during booking.
- Participant 1 automatically uses the booking email when "same as booking person" is checked.
- Stable booking references used for event guide claiming.
- Confirmation creates one entitlement for each participant and automatically assigns guides where a participant email is known.
- Booking pages advertise the included guide but no longer expose an Open Guide link before confirmation.
- Admin `/admin/event-access` creates a generic QR for a workshop.
- Event QR defaults to opening 1 hour before the event and expiring 2 hours after it ends.
- Optional manual open/expiry times and maximum claim count.
- Event QR still requires a confirmed booking reference + participant number, preventing unrestricted QR sharing.
- Each entitlement can only be claimed once.
- Successful QR claims add the guide to that participant's Art Nation My Guides portal.


## V18 — Payment Confirmation Reliability Fix

Run `supabase/v18-migration.sql` once after V17.

Fixes:
- Payment confirmation no longer depends on PostgREST `ON CONFLICT` against a partial index.
- Guide entitlements are created idempotently with select/update-or-insert logic.
- Customer guide access uses the same reliable pattern.
- Payment/order/booking confirmation succeeds even if a guide-entitlement record has a recoverable problem; guide warnings are returned separately.
- Kit activation and event QR claiming use the same safer guide-access logic.
- Adds a unique database index for customer + guide access after safely removing duplicate rows.


## V19 — Frictionless Event QR
Run `supabase/v19-migration.sql` once after V18. Workshop QR: scan -> immediate guide access while active. No booking reference, participant number, name, email, login or account required. Permanent guide ownership and kit activation remain separate.


## V20 — QR Management
Adds persistent View QR, Download QR, Copy Link, Deactivate/Reactivate actions for kit and event QR codes, printable kit QR cards, and a full-screen workshop presentation mode. No database migration is required for V20.


## V21 — Booking & Customer Filters
Adds live admin filtering for Bookings by customer/reference search, location, event, booking status and event date range. Customers can be filtered by name/contact, venues/events they have booked, booking history and event date range. Filtered booking totals show booking count, participant count and booking value. No database migration is required.


## V22 — Customer Communications
Run `supabase/v22-migration.sql` once after V21.

Adds a Messenger-first Communications module with reusable templates, merge fields from customers/bookings/events, personalized Messenger previews, one-click copy + Messenger inbox workflow, manual sent/prepared logging, communication history, optional saved Messenger customer details, and Message shortcuts from Bookings and Customers. Direct Meta Messenger API automation is intentionally deferred until a Meta app/Page access setup is configured.


## V23 — Messenger Connection & Consent
Run `supabase/v23-migration.sql` once after V22.

Adds:
- Public `/messenger` opt-in page for Facebook/website visitors.
- Booking-form Messenger update and optional promotional consent.
- Post-booking "Continue in Messenger" connection flow.
- Unique short-lived referral tokens linking a Messenger conversation to the correct Art Nation customer and booking.
- Meta Messenger webhook endpoint: `/api/meta/messenger-webhook`.
- Stores the Page-scoped Messenger user ID (PSID), connection time, service-message opt-in, marketing opt-in and consent source.
- Customer filters/status for Connected, Marketing opt-in and Not connected.
- Communications module now shows Messenger connection status.

Environment variables for the Meta connection:
```
FACEBOOK_PAGE_USERNAME=your_page_username
META_VERIFY_TOKEN=choose_a_long_random_verify_token
META_APP_SECRET=your_meta_app_secret
```
Configure the Meta app Messenger webhook callback as:
`https://YOUR-DOMAIN/api/meta/messenger-webhook`

Subscribe the Page/app to the referral/messaging webhook events required by your Meta app setup. V23 records the PSID when Meta sends the unique referral token back with the Messenger conversation.

Important: a stored PSID and marketing opt-in are not blanket permission to send unlimited promotional messages. Actual automated sends must still follow Meta's currently applicable Messenger messaging windows, tags and Page/app permissions.


## V24 — Gmail / Google Workspace Email Inbox

Run `supabase/v24-migration.sql` once after V23.

V24 adds an Admin → Email module that:
- Connects one Gmail or Google Workspace mailbox using Google OAuth 2.0.
- Reads the live inbox from Gmail (mail is not copied into Supabase).
- Supports Gmail search queries, Inbox, Sent, Starred and Unread views.
- Opens full Gmail threads and safely displays HTML email in a sandboxed frame.
- Sends new email and replies through the connected Gmail account.
- Matches inbound senders to Art Nation customers by email address.
- Adds Email shortcuts on customer and booking rows.
- Logs outgoing customer emails into Art Nation communication history.
- Encrypts the Google refresh token before storing it in Supabase.

Required `.env.local` values:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_URL=http://localhost:3000
EMAIL_TOKEN_ENCRYPTION_KEY=use-a-long-random-secret-here
```

In Google Cloud Console, enable the Gmail API and create a Web application OAuth client. Add this development redirect URI:
`http://localhost:3000/api/admin/email/google/callback`

For production, also add:
`https://YOUR-DOMAIN/api/admin/email/google/callback`

The OAuth scopes requested are `gmail.readonly` and `gmail.send` plus basic Google account email identity. The application does not request permission to delete mail or change mailbox content.


## V25 — cPanel / Roundcube-compatible Email + Editable Templates

**V25 supersedes the Gmail-specific V24 email implementation.** Art Nation's actual mailbox is `hello@artnation.ph` on the cPanel mail server, so Google OAuth is no longer used.

Run `supabase/v25-migration.sql` once. It is safe whether or not the abandoned V24 migration was previously run.

Configure `.env.local`:
```
EMAIL_IMAP_HOST=artnation.ph
EMAIL_IMAP_PORT=993
EMAIL_SMTP_HOST=artnation.ph
EMAIL_SMTP_PORT=465
EMAIL_USERNAME=hello@artnation.ph
EMAIL_PASSWORD=YOUR_EMAIL_ACCOUNT_PASSWORD
EMAIL_FROM_NAME=Art Nation Cebu
EMAIL_FROM_ADDRESS=hello@artnation.ph
```

V25 features:
- Admin → Email reads the cPanel mailbox through secure IMAP (993).
- Sends from `hello@artnation.ph` through secure SMTP (465).
- Inbox, Unread and Sent views.
- Search across the most recent mailbox messages.
- Full email reading with HTML isolated in a sandboxed iframe.
- Reply and new-message composition.
- Outgoing SMTP mail is also appended to the IMAP Sent folder so the Art Nation admin and Roundcube remain synchronized.
- Matches incoming sender addresses against Art Nation customers.
- Compose directly from Customers and Bookings.
- Customer + booking selection inside Compose.
- Editable reusable email templates with subject and body.
- Merge fields for customer/event data.
- Template categories for booking, payment, reminders, guides, follow-up and promotions.
- Seed templates for Booking Received, Payment Confirmed, Event Reminder, Painting Guide Ready, Thank You & Review, and New Workshops & Special Offers.
- Outgoing customer email is logged to communication history.
- Test Connection button verifies both IMAP and SMTP from the admin.

V25 adds these npm packages: `imapflow`, `mailparser`, and `nodemailer`. Run `npm.cmd install` before building.


## V25.1 build fix
Adds `@types/mailparser` required by TypeScript during `next build`.


## V25.2 — IMAP Inbox Reliability
Fixes cPanel inbox refresh by enumerating actual IMAP UIDs instead of mailbox sequence ranges. The inbox list now fetches lightweight envelope metadata for the newest messages and downloads full message content only when an email is opened. Adds a manual Refresh button, refresh timestamp, and automatic mailbox refresh every 60 seconds while the inbox is visible.
No Supabase migration is required.


## V25.3 — Faster Inbox Refresh
Automatically checks the visible mailbox every 15 seconds instead of every 60 seconds. Manual Refresh remains available. No migration required.


## V25.4 — Booking Messenger Hydration Fix
Fixes the React/HTML hydration error caused by rendering the compact Messenger connection form inside the main booking form. The compact booking version now uses a normal container and button instead of nesting a second `<form>`. The standalone `/messenger` page still uses a proper form. No migration required.


## V25.5 — Definitive Nested Form Fix
Removes the `<form>` element from MessengerConnectForm entirely and moves the post-booking Messenger connection panel outside the booking form in the React tree. This eliminates all possible Messenger-related nested-form hydration paths. No migration required.


## V25.6 — Booking Confirmation UX
After a successful reservation, the booking form is now replaced by a clear confirmation screen instead of leaving the form and Reserve button visible. The confirmation shows the booking reference and payment-verification status. Messenger appears only once as the optional next step, eliminating the duplicate Messenger experience. No migration required.


## V25.7 — Clean Booking Confirmation
Removes the Messenger connection panel from the post-booking confirmation screen. Customers now see only the reservation reference, payment status, and a simple note that updates will use their supplied email/mobile details. Messenger setup/configuration errors are no longer exposed on the booking page. No migration required.
