-- Art Nation V18 migration
-- Run this ONCE after V17.
-- It makes guide-access records properly unique and cleans up duplicates before adding the constraint.

delete from customer_guide_access a
using customer_guide_access b
where a.customer_id=b.customer_id
  and a.guide_id=b.guide_id
  and a.ctid>b.ctid;

create unique index if not exists idx_customer_guide_access_unique
  on customer_guide_access(customer_id,guide_id);
