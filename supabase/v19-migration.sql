-- Art Nation V19 migration
-- Run once after V18.
update event_guide_access_codes set max_claims = null;
