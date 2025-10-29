# Review Management System (RMS)

Backend service to manage property-level reviews using Node.js (Express) and PostgreSQL.

## Quick Start (Docker)

1. Ensure Docker Desktop is running
2. From project root:

```bash
docker compose up --build
```

App: `http://localhost:3000`  DB: `localhost:5432` (db=rms/rms, user=rms, pass=rms)

## Endpoints

- POST `/api/reviews` – create a review (auto-publish if passes fraud checks)
- POST `/api/reviews/:id/publish` – publish a review and update top 5
- GET `/api/properties/:id/top5` – fetch cached top 5 reviews

### Create Review Example

```bash
curl -X POST http://localhost:3000/api/reviews \
 -H "Content-Type: application/json" \
 -d '{
  "property_id": "UUID",
  "user_name": "Shruti",
  "overall_rating": 5,
  "structured": {"cleanliness":5,"comfort":5},
  "body": "Excellent stay and friendly staff!"
 }'
```

### Publish Review

```bash
curl -X POST http://localhost:3000/api/reviews/<review_id>/publish
```

### Get Top 5

```bash
curl http://localhost:3000/api/properties/<property_id>/top5
```

## Development

```bash
cd app
npm install
npm run dev
```

Set `DATABASE_URL` if not using Docker (default `postgres://rms:rms@localhost:5432/rms`).

## Testing

```bash
cd app
npm test
```

## Schema

See `sql/init.sql`. Uses JSONB cache `properties.top_5_reviews` updated on publish.

## Backfill

```bash
psql "$DATABASE_URL" -f sql/backfill_top5.sql
```

## Design Q&A

1. Concurrency on publish: use a transaction plus `UPDATE ... WHERE id=$1` and recompute top 5 in the same transaction; optionally `FOR UPDATE` lock on the property row to serialize updates. In PG, `SERIALIZABLE` or advisory locks can guarantee order if needed.
2. Extend to room/dorm reviews: add `rooms`/`dorms` tables and a polymorphic `subject` via `(subject_type, subject_id)` or dedicated tables plus views; maintain separate `top_5_reviews` per entity.
3. Prevent fake reviews at scale: rate limits per IP/user, email/phone verification, device fingerprint, ML-based spam scoring, blacklists, heuristic signals (velocity, text similarity), human review queues.
4. Caching: cache `top_5_reviews` in Redis keyed by property id and invalidate on publish; TTL to absorb bursts; warm cache for popular properties.
