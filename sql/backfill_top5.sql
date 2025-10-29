-- Recompute top_5_reviews for all properties
WITH latest AS (
  SELECT r.property_id, r.id, r.user_name, r.overall_rating, r.structured, r.body, r.created_at,
         ROW_NUMBER() OVER (PARTITION BY r.property_id ORDER BY r.created_at DESC) rn
  FROM reviews r
  WHERE r.status = 'published'
)
UPDATE properties p
SET top_5_reviews = COALESCE((
  SELECT jsonb_agg(to_jsonb(l) - 'rn' - 'property_id')
  FROM latest l
  WHERE l.property_id = p.id AND l.rn <= 5
), '[]'::jsonb),
updated_at = now();

