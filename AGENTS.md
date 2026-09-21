# Art Nation future architecture notes

This section documents the destination architecture. It is guidance only; do not create speculative tables or migrations from it without a scoped implementation task.

- Artwork is a reusable catalog asset, separate from an event. Artwork may be used by public, private and off-site events, lessons, guides, and products or kits.
- Services and experiences are distinct from scheduled sessions and events.
- Customers are persistent CRM identities across events, school, and commerce. Participants are event attendees. Students are persistent learning identities, commonly linked to parent or guardian customers.
- The standard Art Nation lesson package is currently 10 lessons. Packages and enrollments need purchased, used, and remaining credits. Attendance should consume credits according to policy rather than merely creating a reservation.
- Each lesson should eventually support a teacher, project or artwork, structured skills, teacher notes, photos, and optional video. Parents and students should eventually have a portal showing remaining credits, attendance, lesson history, teacher notes, artwork portfolio, media, and progress reports. End-of-package reports summarize the 10-lesson period.
- AI may assist with draft summaries of teacher notes and structured progress, but teacher observations remain the source record and AI-generated reports require teacher review and approval before publication. Student progress is maintained across multiple packages.
- School analytics should eventually include active students, attendance frequency, revenue, outstanding credits, package renewals, inactive students, and customer or student lifetime value. Customer LTV should aggregate Paint & Sip, lessons or packages, products or kits, and other purchases where identities can be safely matched.
- Products and kits should be able to reuse Artwork and Guide assets.
- Organizations and partners should eventually support private or off-site events with controlled registration and attendance portals. Those events should support host-paid and individual-guest-paid models.
- Messenger and email communications and follow-up should operate from the persistent customer relationship rather than isolated bookings.

## Core domain foundation

The canonical internal term for a reusable painting-library asset is **Artwork**. Existing `guides` remain the operational source for current painting content; `guides.artwork_id` points to the canonical artwork, allowing one artwork to have multiple guide variants without duplicating guide steps or breaking existing guide routes. Artwork may exist without a guide.

**Services** describe what Art Nation sells, such as Paint & Sip, lessons, private events, or workshops. **Sessions** describe when and where a service happens. The existing `events` and `event_sessions` tables remain the compatibility layer and continue to serve current public URLs and bookings; nullable service and artwork links let the domain migrate gradually.

Customers remain persistent CRM identities. Participants remain attendees tied to a booking. Students are persistent learning identities and connect to customer guardians through `student_guardians`; a one-off child participant does not automatically become a student. `lesson_packages` and `student_enrollments` establish the 10-lesson package and purchase snapshot foundation. Current credit balance is derived from `lesson_credit_transactions.credit_delta`; there is intentionally no mutable `credits_used` or `credits_remaining` source of truth. A package opening transaction is positive, while attendance, qualifying cancellation, or no-show transactions are negative according to policy. A lesson reservation does not consume a credit; proper rescheduling normally consumes zero credits.

Future lesson records can connect students, sessions, teachers, artwork, skills, notes, and media. Parent/student portals, progress reports, AI-assisted drafts requiring teacher approval, lifetime progress, school analytics, product/kit reuse, organizations, private/off-site events, and host-paid or guest-paid models remain future work. Commerce continues to use the existing `orders`, `payments`, and `bookings` model; future package, product, and event purchases should extend that model rather than create separate checkouts.
