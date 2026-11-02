# LakerPool — Full-stack MVP

A starter implementation grounded in `Prototype.docx`: search rides by origin/destination/date, compare estimated per-passenger prices, optionally filter by vehicle type, match routes, view student/driver information, request seats, message ride participants, submit safety reports, and review completed rides.

## Stack
- Frontend: Next.js 15 App Router, React, TypeScript, responsive CSS.
- Backend/API: Next.js Route Handlers with Zod validation.
- Database: Prisma ORM + SQLite for local development.
- Matching: transparent rule-based matching (route, departure time, verified profile). This is not a trained AI model.

## Run locally
1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env.local` and add your two restricted Google Maps API keys. The checked-in `.env` contains only the local SQLite URL for Prisma CLI.
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
- Add maps/geocoding and real route distance/time estimates. The current match endpoint uses a transparent heuristic and does not call an external AI model.
- Validate price calculation with your team. The current estimated price per passenger is `estimatedPrice / seatsTotal`; it is an estimate, not a payment or fare collection.
- Add live location tracking only with explicit consent, access controls, retention limits, and secure location handling.
- Safety reports are stored in the database only. They do **not** contact campus police or emergency services. Build a staffed escalation workflow and clear emergency instructions before launch.
- Add rate limiting, audit logs, moderation, secure messaging, privacy policy, terms, accessibility testing, and automated tests.
- Do not use this prototype to arrange real rides until identity, safety, insurance, and legal requirements have been reviewed.


## Google Maps Platform integration

The app now includes:
- Places API (New) Autocomplete through a server-side endpoint.
- Routes API `computeRoutes` for driving distance, duration, and alternate routes.
- Maps JavaScript API to render the route polyline on the dark map.

### Google Cloud setup
1. Create/select a Google Cloud project and enable billing.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Create a browser key restricted by HTTP referrers (for local development use `http://localhost:3000/*`; add your production domain later). Restrict it to Maps JavaScript API.
4. Create a separate server key. Restrict it to Places API (New) and Routes API; restrict by server IP when deployed.
5. Copy `.env.example` to `.env.local`, then fill:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = browser key (visible to the browser; referrer/API restrictions are essential)
   - `GOOGLE_MAPS_SERVER_KEY` = private server key (never expose it with a `NEXT_PUBLIC_` prefix)
6. Restart `npm run dev`.

### Google Maps endpoints
- `GET /api/maps/autocomplete?input=Grand%20Rapids` — location suggestions.
- `POST /api/maps/route` with `{"origin":"Allendale, MI","destination":"Detroit, MI"}` — returns distance, duration, and encoded route geometry.

The map currently previews routes; it does not yet store a selected Google Place ID in the ride record, estimate actual carpool fare, or automatically match live driver GPS positions. Those are follow-on features.

### Billing and key safety
Google Maps Platform requires a billing-enabled Cloud project for these services. Set quota limits and budget alerts, monitor usage, and keep the server key private. Browser keys are necessarily exposed to users, so restrict them by website referrer and API. Never commit `.env.local` or publish private keys.
# Lakerpool
