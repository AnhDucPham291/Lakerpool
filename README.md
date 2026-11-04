# LakerPool — Full-stack MVP

A starter implementation grounded in `Prototype.docx`: search rides by origin/destination/date, compare estimated per-passenger prices, optionally filter by vehicle type, match routes, view student/driver information, request seats, message ride participants, submit safety reports, and review completed rides.

## Stack
- Frontend: Next.js 15 App Router, React, TypeScript, responsive CSS.
- Backend/API: Next.js Route Handlers with Zod validation.
- Database: Prisma ORM + SQLite for local development.
- Matching: transparent rule-based matching (route, departure time, verified profile). This is not a trained AI model.
- Route planner: shows driving miles/time and nearby demo driver profiles with sample ratings. It does not dispatch real drivers.

## Run locally
1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env.local`. Map tiles, Photon geocoding, and OSRM routing need no API key for this prototype. The checked-in `.env` contains only the local SQLite URL for Prisma CLI.
3. Run `npm install`.
4. Run `npm run db:push`.
5. Run `npm run dev` and open `http://localhost:3000`.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| POST | `/api/users` | Create a GVSU-email profile |
| GET, POST | `/api/rides` | Search rides / publish a ride |
| GET | `/api/rides/:id` | Ride and driver/passenger details |
| POST | `/api/bookings` | Request seats |
| PATCH | `/api/bookings/:id/decision` | Driver accepts/declines |
| POST | `/api/reviews` | Review a completed ride |
| POST | `/api/reports` | Submit a safety report |
| GET, POST | `/api/messages` | Read/send ride messages |
| GET | `/api/match` | Route/time matching suggestions |
| POST | `/api/drivers/dispatch` | Demo-only nearby driver profiles and sample ratings for a pickup coordinate |

### Example requests
Search:
`GET /api/rides?origin=Allendale&destination=Grand%20Rapids&date=2026-11-15`

Create a user:
```json
POST /api/users
{"name":"Alex Student","email":"alex@mail.gvsu.edu"}
```

Publish a ride (MVP identity header):
```http
POST /api/rides
x-user-id: USER_ID
Content-Type: application/json
```
```json
{
  "origin":"Allendale, MI","destination":"Detroit, MI",
  "departureAt":"2026-11-15T14:00:00.000Z",
  "pickupDetails":"GVSU Kirkhof Center","dropoffDetails":"Downtown Detroit",
  "vehicleType":"Sedan","vehicleName":"Toyota Camry","vehicleColor":"Silver",
  "seatsTotal":3,"estimatedPrice":45,"stops":0
}
```

## Important production work
This is a functional MVP foundation, not a production-ready transportation or emergency-response service:
- Replace the demo `x-user-id` header with secure authentication, sessions, CSRF protection, and authorization checks.
- Implement actual GVSU email ownership verification (verification email/OTP); a domain check alone does not verify identity.
- Change SQLite to PostgreSQL for deployment and add migrations/backups.
- The route planner uses OpenStreetMap tiles, Photon geocoding, and OSRM routing. Its nearby driver profiles/ratings are simulated and are not a trained AI model or real dispatch service.
- Validate price calculation with your team. The current estimated price per passenger is `estimatedPrice / seatsTotal`; it is an estimate, not a payment or fare collection.
- Add live location tracking only with explicit consent, access controls, retention limits, and secure location handling.
- Safety reports are stored in the database only. They do **not** contact campus police or emergency services. Build a staffed escalation workflow and clear emergency instructions before launch.
- Add rate limiting, audit logs, moderation, secure messaging, privacy policy, terms, accessibility testing, and automated tests.
- Do not use this prototype to arrange real rides until identity, safety, insurance, and legal requirements have been reviewed.


## OpenStreetMap, Photon, and OSRM integration

- Leaflet renders the interactive map; OpenStreetMap supplies the map tiles and map data.
- The server-side `/api/maps/autocomplete` endpoint uses Photon place search.
- The server-side `/api/maps/route` endpoint geocodes both locations with Photon and requests driving routes from the OSRM public demo server.

### Setup
1. Copy `.env.example` to `.env.local` to configure the local SQLite database.
2. Run `npm run db:push`, then `npm run dev`.
3. The public Photon/OSRM demo endpoints are shared community services with usage limits and no availability guarantee; use a hosted provider or self-host for production.

### Endpoints
- `GET /api/maps/autocomplete?input=Grand%20Rapids` — Photon location suggestions.
- `POST /api/maps/route` with `{"origin":"Allendale, MI","destination":"Detroit, MI"}` — returns route distances, durations, and map coordinates.

The map uses the public OpenStreetMap tile service for development. Keep visible OpenStreetMap attribution and respect its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). OSRM's public demo server may be unavailable or rate-limited; use a hosted provider or self-host for production/high traffic.

The map displays estimated driving miles/time and random nearby sample driver markers after a successful route calculation. Each demo driver has a sample rating and estimated solo price (`$4.50 base + driver-specific per-mile rate × route miles`). Shared pricing divides the selected driver fare among the chosen passenger count. Driver names, ratings, positions, and prices are demo data; real passenger matching, booking, fare collection, and GPS are not implemented.
# Lakerpool
