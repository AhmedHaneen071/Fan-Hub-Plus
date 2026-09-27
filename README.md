# Fan Hub Plus

Fan Hub Plus is a shared home for Anime, Gaming, Movies, TV Shows, K-pop, Comics, Manga, and Cosplay. Fans can explore a common catalogue, read community stories, find characters and events, keep bookmarks, rate discoveries, submit writing, and personalize their home. The merchandise shelf is for display and discovery only; it has no checkout or payments.

## Stack

- **Client:** React 19, TypeScript, Vite, React Router, Leaflet, Lucide.
- **API:** Node.js, Express 5, Zod validation, JWT in an HTTP-only cookie, bcrypt password hashes.
- **Database:** MongoDB through Mongoose. The local connection uses `mongodb://127.0.0.1:27017/fanhubplus`; connect to the same database in MongoDB Compass.
- **Email:** Nodemailer over SMTP for password reset. Email requires provider configuration.
- **Legacy data transfer:** The old SQLite/Prisma schema and migrations are retained only for the optional one-way importer. The importer copies records to MongoDB with stable IDs and leaves SQLite unchanged.

Use Node.js 20.19 or newer and npm. MongoDB Community Server must be running locally on port 27017. Compass is a database viewer; it does not start the MongoDB server by itself.

## Install and run

1. Start the MongoDB service.
2. Copy `.env.example` to `.env`. Generate a private `AUTH_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. Install packages with `npm install` (or `npm ci` when using the lockfile).
4. Start the combined Express API and Vite client with `npm run dev`.
5. Open <http://localhost:5173>. The UI and API share this port; API requests use `/api`.

On first start, the app creates the eight fandom category records if they do not exist. It never drops or resets MongoDB data.

### Load local demo data

Run `npm run data:seed-demo` to add example content, characters, stories, showcase items, events, FAQs, and test activity to MongoDB. The command is repeatable: it inserts missing examples without replacing existing records. It only runs against the local `fanhubplus` database outside production.

Development/Test Only accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fanhubplus.test` | `FanHubDemo2026!` |
| Registered fan | `fan@fanhubplus.test` | `FanHubDemo2026!` |

These are local demo accounts, not production credentials. Do not reuse the demo password in any other environment.

### Bring forward existing local SQLite data

The existing ignored `prisma/dev.db` remains untouched. If it contains the records you want to move, copy it into this project and set `DATABASE_URL` in `.env` to its SQLite path. Then run:

```sh
npx prisma generate
npm run data:migrate
```

The script copies users, fandoms, content, characters, stories, merchandise, events, bookmarks, ratings, feedback, submissions, chatbot history/FAQs, and password reset records. It uses deterministic Mongo IDs so rerunning the command updates the same imported records. It does not delete from SQLite. Back up both databases before running a migration against valuable data. Local `prisma/dev.db` is not committed.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express and Vite together on port `5173` |
| `npm run build` | Type-check and build the React client |
| `npm run start` | Serve the built client and API from Express |
| `npm run lint` | Type-check the client |
| `npm run data:migrate` | Copy an existing SQLite database to MongoDB without deleting the source |
| `npm run data:seed-demo` | Add repeatable local demo data to the MongoDB collections |

Build before starting in production: `npm run build`, then `npm run start`. Deploy the Express server and `client/dist` together. Use HTTPS, a persistent MongoDB service, secure secrets, a configured SMTP sender, and durable storage for `/public/uploads`.

## Environment variables

Copy the template to `.env`; never commit `.env` or real credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes for deployment | MongoDB connection URI. Local default: `mongodb://127.0.0.1:27017/fanhubplus`. |
| `AUTH_SECRET` | Yes | At least 32 characters of random data used to sign sessions. Use a new unique production value. |
| `PORT` | No | Combined development server port; defaults to `5173`. |
| `CLIENT_ORIGIN` | No | Allowed browser origin for credentialed requests; defaults to `http://localhost:5173`. |
| `APP_URL` | For password reset | Public client origin used to construct reset links; local default `http://localhost:5173`. |
| `SMTP_HOST` | For email | SMTP server host. |
| `SMTP_PORT` | For email | SMTP server port; defaults to `587`. |
| `SMTP_USER` | Provider dependent | SMTP account username. |
| `SMTP_PASS` | Provider dependent | SMTP password or app password. |
| `MAIL_FROM` | For email | Verified sender address. |
| `DATABASE_URL` | Only for legacy import | Existing SQLite path used by the one-way migration utility. |

Password reset uses the same generic response whether an address exists or not. Without a working SMTP configuration no message can be delivered; configure and verify SMTP before offering account recovery in production.

## Capabilities and access

- **Visitor:** browse the public catalogue, stories, characters, events, showcase, and public FAQ helper.
- **Registered user:** manage a profile and favorite fandoms; save supported records; rate catalogue items; send feedback and writing; use account recovery.
- **Admin:** create, edit, and remove fandom categories, catalogue entries, characters, stories, merchandise showcases, events, and FAQ entries; review/publish submissions; read feedback; view usage counts. API routes check the current database role on every protected request.

Merchandise records support display prices only. No shopping, payment, or order processing is implemented.

## Uploads and external services

Avatar uploads accept PNG, JPEG, and WebP images up to 2 MB. Filenames are generated by the server and stored in `public/uploads`; use durable writable storage in production. Browser geolocation is optional and permission based. The event map uses OpenStreetMap tiles. No external AI provider is required; the FAQ helper matches local admin-curated entries. Password reset email requires SMTP.

## Data and security notes

Mongoose schemas enforce required fields, enums, and unique account/bookmark/rating constraints. Protected mutations validate request bodies with Zod and perform role checks server-side. Passwords use bcrypt; session cookies are HTTP-only and same-site; reset tokens are stored as SHA-256 hashes. Article markup is cleaned through an explicit HTML allow-list before being sent to the browser. Keep MongoDB backups and `/public/uploads` backups together.

AI-assisted development: OpenAI Codex was used as an implementation assistant. The application itself does not call an AI model.
