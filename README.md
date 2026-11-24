# LakerPool — Full-stack MVP

A starter implementation grounded in `Prototype.docx`: search rides by origin/destination/date, compare estimated per-passenger prices, optionally filter by vehicle type, match routes, view student/driver information, request seats, message ride participants, submit safety reports, and review completed rides.

## Stack
- Frontend: Next.js 15 App Router, React, TypeScript, responsive CSS.
- Backend/API: Next.js Route Handlers with Zod validation.
- Database: Prisma ORM + PostgreSQL (hosted on Neon).
- Hosting: Vercel. The site runs online without a local server.
- Matching: transparent rule-based matching (route, departure time, verified profile). This is not a trained AI model.
- Route planner: shows driving miles/time and nearby demo driver profiles with sample ratings. It does not dispatch real drivers.

## Rider and driver apps
LakerPool has two separate clients that share one profile per browser:

- **Rider app (`/rider`)**: a student enters a pickup, a drop-off, a departure time, and how many people are riding. The app shows the route and fare first. The student then sends the request to drivers. After a driver accepts, the rider sees the driver's name, vehicle, license plate, and contact details, and the two can chat.
- **Driver app (`/driver`)**: a student with vehicle details sees open requests. Before accepting, each request shows the pickup and drop-off, an optional route map, the fare, and the student's profile: name, GVSU email, verification status, completed trips, and member-since date. The rider's phone number appears only after the driver accepts. Under **My trips**, a driver can chat with the rider, mark the trip completed, or release it to other drivers. Releasing deletes the chat.

How it works:
- The fare is `$4.50 + $1.45 × miles`, split evenly among the riders (`src/lib/fare.ts`). The server recalculates the route and fare when a request is created, so the browser cannot set the price. No payment is collected.
- Only one driver can accept a request. The status update is conditional, so if two drivers accept at the same moment, one gets an error.
- Both apps refresh automatically: trip lists every 8–10 seconds, chat every 4 seconds.
- Accounts use a GVSU email and a password. Passwords are stored only as scrypt hashes (`src/lib/auth.ts`). Signing in sets an HttpOnly session cookie that lasts 30 days, and one account works on the home page, in the rider app, and in the driver app. If someone signs up with an email that already has an account, the form switches to sign-in.

## Deploy to Vercel (no local server needed)
1. Push this repository to GitHub.
2. At [vercel.com](https://vercel.com), sign in with GitHub, choose **Add New → Project**, and import this repository. Keep the default settings.
3. In the Vercel project, open **Storage → Create Database → Neon (Postgres)**, use the free plan, and connect it to the project for all environments.
4. Under **Settings → Environment Variables**, confirm that `DATABASE_URL` and `DATABASE_URL_UNPOOLED` exist. If the Neon integration used different names, such as a custom prefix, add these two names with the pooled and direct connection strings.
5. Under **Deployments**, choose **Redeploy** on the latest deployment. The `vercel-build` script runs `prisma db push`, which creates the tables before building.
6. Open the `*.vercel.app` URL. Every later `git push` to `main` deploys again automatically.

## Run locally (optional)
1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env` and paste your Postgres connection strings. You can reuse the Neon database, or create a separate Neon branch for development. Map tiles, Photon geocoding, and OSRM routing need no API key.
3. Run `npm install`.
4. Run `npm run db:push`.
5. Run `npm run dev` and open `http://localhost:3000`.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health, including whether the database is reachable |
| POST | `/api/auth/login` | Sign in with email and password (sets the session cookie) |
| POST | `/api/auth/logout` | Sign out this browser |
| POST | `/api/users` | Create an account (`name`, GVSU `email`, `password` of 8+ characters, optional `phone` and `driver` vehicle details) and sign in |
| GET, PATCH | `/api/users/me` | Your profile (`{"user": null}` when signed out) / add a phone number or vehicle details to become a driver |
| GET, POST | `/api/trips` | `?view=rider` your requests, `?view=open` open requests (drivers), `?view=driver` your accepted trips / create a ride request |
| GET, PATCH | `/api/trips/:id` | Route for the map / `{"action": "accept" \| "release" \| "complete" \| "cancel"}` |
| GET, POST | `/api/trips/:id/messages` | Chat between the rider and the accepted driver |
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

Create an account (signs in and returns the session cookie):
```json
POST /api/users
{"name":"Alex Student","email":"alex@mail.gvsu.edu","password":"choose-a-password"}
```

Publish a ride. Browsers send the session cookie automatically. With curl, save it once with `curl -c cookies.txt …/api/auth/login`, then send it with `-b cookies.txt`:
```http
POST /api/rides
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
- Add password reset, rate limiting on sign-in, and CSRF tokens if the API will ever accept requests from other sites. The session cookie is `SameSite=Lax`.
- Implement actual GVSU email ownership verification (verification email/OTP); a domain check alone does not verify identity.
- Replace the `prisma db push` deploy step with versioned Prisma migrations, and set up database backups.
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
1. No map API key is needed. On Vercel, the map endpoints run as serverless functions.
2. For local development, follow **Run locally** above.
3. The public Photon/OSRM demo endpoints are shared community services with usage limits and no availability guarantee; use a hosted provider or self-host for production.

### Endpoints
- `GET /api/maps/autocomplete?input=Grand%20Rapids` — Photon location suggestions.
- `POST /api/maps/route` with `{"origin":"Allendale, MI","destination":"Detroit, MI"}` — returns route distances, durations, and map coordinates.

The map uses the public OpenStreetMap tile service for development. Keep visible OpenStreetMap attribution and respect its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). OSRM's public demo server may be unavailable or rate-limited; use a hosted provider or self-host for production/high traffic.

The map displays estimated driving miles/time and random nearby sample driver markers after a successful route calculation. Each demo driver has a sample rating and estimated solo price (`$4.50 base + driver-specific per-mile rate × route miles`). Shared pricing divides the selected driver fare among the chosen passenger count. Driver names, ratings, positions, and prices are demo data; real passenger matching, booking, fare collection, and GPS are not implemented.
# Lakerpool
