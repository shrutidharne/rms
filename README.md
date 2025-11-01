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

## Setup Options

You can run this project in two ways:
1. Using Docker (recommended, easier setup)
2. Local setup without Docker (requires manual PostgreSQL installation)

### Prerequisites

#### For Docker Setup
- Docker Desktop installed
- Git installed

#### For Local Setup
- Node.js 18+ installed
- PostgreSQL 15+ installed
- Git installed
- psql command-line tool available on PATH

## Option 1: Quick Start with Docker (Recommended)

1. Ensure Docker Desktop is running
2. From project root:

```bash
docker compose up --build
```

The application will be available at:
- API: `http://localhost:3000`
- Database: `localhost:5432` (db=rms/rms, user=rms, pass=rms)
- API Documentation: `http://localhost:3000/api-docs` (Interactive Swagger UI)

Verify everything is running:
```bash
# Check if containers are running
docker compose ps

# View logs if needed
docker compose logs
```

To stop the application:
```bash
docker compose down
```

## Option 2: Local Setup (Without Docker)

If you cannot use Docker, follow these steps to run the application locally:

1. **Install Prerequisites**
   - Node.js 18+ from https://nodejs.org/
   - PostgreSQL 15+ from https://www.postgresql.org/download/
   - Ensure `psql` is available in your terminal/command prompt

2. **Set Up Database**
   ```sql
   -- Run in psql or pgAdmin
   CREATE DATABASE rms;
   CREATE USER rms WITH PASSWORD 'rms';
   GRANT ALL PRIVILEGES ON DATABASE rms TO rms;
   ```

3. **Initialize Database Schema**
   ```cmd
   :: Windows CMD
   psql -U rms -d rms -f sql\init.sql

   # Linux/Mac
   psql -U rms -d rms -f sql/init.sql
   ```
   If prompted for password, enter: `rms`

4. **Install Dependencies and Start Application**
   ```bash
   # Go to app directory
   cd app

   # Install dependencies
   npm install

   # Set database connection (Windows CMD)
   set DATABASE_URL=postgres://rms:rms@localhost:5432/rms

   # Set database connection (Linux/Mac/PowerShell)
   # export DATABASE_URL=postgres://rms:rms@localhost:5432/rms
   # $env:DATABASE_URL = "postgres://rms:rms@localhost:5432/rms"

   # Start the application
   npm run dev
   ```

The application will be available at:
- API: `http://localhost:3000`
- API Documentation: `http://localhost:3000/api-docs`

### Getting Started (Both Docker and Local Setup)

1. **Get a Property ID**
   ```bash
   # With Docker:
   docker compose exec db psql -U rms -d rms -c "SELECT id, name FROM properties;"

   # Without Docker:
   psql -U rms -d rms -c "SELECT id, name FROM properties;"
   ```
   Copy the UUID returned - you'll need it to create reviews.

2. **Access API Documentation**
   - Open `http://localhost:3000/api-docs` in your browser
   - Use the interactive Swagger UI to test endpoints

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

## Development and Testing

### Running Tests
```bash
# With Docker:
docker compose exec app npm test

# Without Docker:
cd app
npm test
```

### Development Mode
```bash
# With Docker - uses hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Without Docker
cd app
npm install
npm run dev
```

### Environment Variables
- `DATABASE_URL`: Database connection string (default: `postgres://rms:rms@localhost:5432/rms`)
- `PORT`: API server port (default: 3000)

### Troubleshooting

#### Docker Setup Issues
- "Port already in use": Stop other services using port 3000 or change port in docker-compose.yml
- Container won't start: Check `docker compose logs`
- Database connection failed: Wait a few seconds for PostgreSQL to initialize

#### Local Setup Issues
- "psql: command not found": Add PostgreSQL bin directory to PATH
- Database connection failed: Verify PostgreSQL is running and credentials are correct
- Port 3000 in use: Set different port before starting app:
  ```bash
  set PORT=3001  # Windows
  export PORT=3001  # Linux/Mac
  ```

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
npm run dev
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
If the company cannot use Docker, they can run the app locally against a local or managed PostgreSQL instance. Below are copy-pasteable steps for Windows (cmd) and a brief PowerShell/Linux variant.

### 1) How would you handle concurrent publishes (two moderators publishing same time)?
The Core Problem: When two moderators try to save changes to the same review at the same time, a "last write wins" scenario can occur, silently overwriting the first moderator's work and causing data loss.

Here are three ways to remove this :
1. Database Locks (Pessimistic Locking)
How it works: The system places a temporary "lock" on a database record as soon as a moderator begins editing it. This lock prevents anyone else from modifying that same record until the first moderator saves their changes and releases the lock.

Analogy: A "Check Out" system in a library. Only one person can take a specific book home at a time. Others must wait for it to be returned.

Pros: Prevents conflicts completely.

Cons: Can harm performance and create user frustration if locks are held for a long time. Poor choice for a web application where users might open a tab and then walk away.

2. Optimistic Concurrency Control
How it works: This method is more permissive. It allows multiple moderators to edit the same data simultaneously. The conflict resolution happens only at the moment of saving.

When a moderator fetches a review to edit, the system also sends a hidden version_number 

The moderator makes changes and clicks "Publish."

The system executes a conditional database command: "Update this review ONLY IF its current version is still 5."

Success: If the update succeeds, the version number is incremented to 6.

Conflict: If it fails, it means another moderator has already saved their changes and updated the version to 6. The system then returns a clear error to the second moderator: "This review was modified by someone else after you opened it. Please refresh the page and re-apply your changes."

Analogy: Editing a Google Doc. You can both type, but if your changes clash, you get a notification and can see the other person's edits to resolve the conflict manually.

Pros: Excellent performance and a good user experience for most web applications. It doesn't block users.

Cons: Requires the user to perform a manual step if a conflict occurs.

3. Message Queue (Kafka)
How it works: Instead of saving directly to the database, every "publish" request is placed into an ordered line (a queue). A separate background process consumes these requests one by one, in the exact order they were received, and applies them to the database.

Analogy: A single-line queue for a rollercoaster. Riders (publish requests) line up and are loaded onto the ride (processed) one at a time, ensuring order and safety.

Pros: Guarantees order and prevents database overload by processing requests sequentially. Highly robust and scalable.

Cons: Adds significant system complexity. The publish action is not instant, as the request must wait in line to be processed.

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

Technical approach

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

