# Review Management System (RMS)

## Assignment Overview
This project implements a Review Management System (RMS) for property reviews with fraud detection and moderation capabilities. The system is built as a RESTful API service using Node.js (Express) and PostgreSQL.

### Key Features
- Create and manage property reviews
- Automatic fraud detection system
- Review moderation workflow
- Top 5 reviews caching per property
- Comprehensive API documentation
- Full test coverage

### Tech Stack
- Backend: Node.js with Express
- Database: PostgreSQL 15
- Testing: Jest with Supertest
- Documentation: OpenAPI/Swagger
- Containerization: Docker & Docker Compose
- Version Control: Git/GitHub

## Prerequisites
- Docker Desktop installed
- Git installed
- Node.js 18+ (for local development)

## Quick Start (Docker)

1. Ensure Docker Desktop is running
2. From project root:

```bash
docker compose up --build
```

App: `http://localhost:3000`  DB: `localhost:5432` (db=rms/rms, user=rms, pass=rms)

API Documentation: `http://localhost:3000/api-docs` (Interactive Swagger UI)

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

## Project Structure
```
rms/
├── app/                    # Application source code
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── tests/         # Test files
│   │   ├── db.js         # Database configuration
│   │   └── server.js     # Express server setup
│   ├── package.json       # Dependencies
│   └── Dockerfile        # App container configuration
├── sql/                   # Database scripts
│   ├── init.sql          # Schema initialization
│   └── backfill_top5.sql # Top reviews update script
└── docker-compose.yml     # Container orchestration
```

## Implementation Details

### 1. Review Creation & Fraud Detection
- Endpoint: `POST /api/reviews`
- Validates input data (rating range, review length)
- Implements fraud detection:
  - Checks review text length (min 10 chars)
  - Monitors user activity (max 3 reviews/24h)
- Auto-publishes valid reviews, holds suspicious ones

### 2. Review Moderation
- Endpoint: `POST /api/reviews/:id/publish`
- Manual review process for held reviews
- Updates top 5 reviews on publish
- Handles concurrent modifications safely

### 3. Top Reviews Display
- Endpoint: `GET /api/properties/:id/top5`
- Caches top 5 reviews in JSONB
- Updates cache on review status changes
- Optimized for quick property page loads

## Testing

```bash
cd app
npm test
```

## API Documentation
The API is fully documented using OpenAPI/Swagger:
1. Start the application
2. Visit `http://localhost:3000/api-docs`
3. Interactive documentation with try-it-out functionality

## Schema

See `sql/init.sql`. Uses JSONB cache `properties.top_5_reviews` updated on publish.

## Backfill

```bash
psql "$DATABASE_URL" -f sql/backfill_top5.sql
```

## Development Guide

### Local Setup (Without Docker)
1. Install PostgreSQL 15 or higher
2. Create database and user:
```sql
CREATE DATABASE rms;
CREATE USER rms WITH PASSWORD 'rms';
GRANT ALL PRIVILEGES ON DATABASE rms TO rms;
```
3. Set up the application:
```bash
cd app
npm install
export DATABASE_URL="postgres://rms:rms@localhost:5432/rms"
npm run dev
```

### Running Tests
```bash
cd app
npm test
```

### Making Changes
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Create a pull request

## Design Q&A

1. Concurrency on publish: use a transaction plus `UPDATE ... WHERE id=$1` and recompute top 5 in the same transaction; optionally `FOR UPDATE` lock on the property row to serialize updates. In PG, `SERIALIZABLE` or advisory locks can guarantee order if needed.
2. Extend to room/dorm reviews: add `rooms`/`dorms` tables and a polymorphic `subject` via `(subject_type, subject_id)` or dedicated tables plus views; maintain separate `top_5_reviews` per entity.
3. Prevent fake reviews at scale: rate limits per IP/user, email/phone verification, device fingerprint, ML-based spam scoring, blacklists, heuristic signals (velocity, text similarity), human review queues.
4. Caching: cache `top_5_reviews` in Redis keyed by property id and invalidate on publish; TTL to absorb bursts; warm cache for popular properties.

## Extension & Thought Questions

### 1) How would you handle concurrent publishes (two moderators publishing at the same time)?
Core Problem: When two moderators try to publish or update the same review at the exact same time, it can create a "race condition." This could lead to one moderator's changes being silently overwritten by the other's, resulting in lost data.

Technical Solutions
1. Database Locks (Pessimistic Locking)
How it works: Think of this as a "reserved" sign on a library book. When the first moderator opens a review to edit it, the database immediately locks that record. The second moderator cannot edit it until the first one saves their changes and the lock is released.

Analogy: Only one person can edit a shared Google Doc at a time.

Pros: Simple to understand; guarantees no conflicts.

Cons: Can create bottlenecks and slow down the system (poor performance) if many moderators are waiting. If the first moderator forgets to finish, it can leave the record locked.
2. Optimistic Concurrency Control (The Better Way)
How it works: This method is more trusting. It allows everyone to edit freely but checks for conflicts at the moment of saving.

When a moderator fetches a review to edit, the system also sends a hidden version_number (e.g., version=5).

The moderator makes their changes and hits "Publish."

The system performs this check: "Update the review WHERE id=123 AND version_number=5."

If it works: The update succeeds, and the version_number is incremented to 6.

If it fails: It means someone else (another moderator) already updated the review and changed the version number to 6. The system throws an error to the second moderator: "This review was modified by someone else after you opened it. Please refresh and apply your changes again."

Analogy: Editing a Wikipedia article. You get a warning if someone has saved an edit while you were writing yours.

Pros: Highly efficient for read-heavy applications (like a review site). No waiting.

Cons: Requires the user to retry their action if a conflict occurs.

3. Message Queue (Kafka/RabbitMQ)
How it works: This approach decouples the action of "publishing" from the actual processing. Instead of updating the database directly, every "Publish" request is placed in an ordered line (a queue).

A separate background process takes these requests one-by-one from the queue and applies them to the database

### 2) How would you extend this RMS to support Room-level or Dorm-level reviews?
Currently, reviews are only for the property (e.g,“Boys Hostel A”). To support more detail, we can add “Dorm” and “Room” levels inside each property so students can review a specific dorm or room instead of the whole property.

Technical Thinking:

Database structure:
Create a hierarchy —

Property → Dorm → Room
Add two new fields in the reviews table:
review_type → indicates whether the review is for a property, dorm, or room

parent_id → stores the ID of that property/dorm/room

Frontend:
When writing a review, the user selects whether they are reviewing the full property, a dorm, or a specific room.
The system then sends the review_type and parent_id to the backend to save correctly.

### 3) How would you prevent fake reviews at scale?
Just like social media platforms stop fake accounts, we will prevent fake reviews using verification and detection measures.

Technical approach (concise)

User verification: Require students to sign up with a verified institutional email address (e.g., .edu.in).

Booking verification: Allow only users who have a matching booking/residency record to submit a review for that property.

Machine learning / heuristics: Analyze review text, rating patterns, and timing. Flag users who consistently post extreme ratings or repetitive language.

Rate limiting: Limit each user to a small number of reviews per month (e.g., 3–4) to reduce abuse.

Network analysis / fraud signals: Detect suspicious activity such as many accounts created from the same IP addressing praising or attacking the same property — mark those reviews as likely fake and flag for moderation.

### 4) How can caching (e.g., Redis) make this faster for property pages?
Caching helps improve the speed of property pages by temporarily storing frequently accessed data in memory (Redis).
When a user opens a property page for the first time, the server fetches all details (like reviews, ratings, and photos) from the database and stores a copy in Redis.
When another user opens the same page, the data is retrieved directly from Redis instead of querying the database again, which makes the page load much faster and reduces database load.
Whenever a new review is added or property details are updated, the cache is refreshed or invalidated to ensure that users always see the most recent data.

