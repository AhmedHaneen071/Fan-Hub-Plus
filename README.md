# Fan Hub Plus

Fan Hub Plus is a responsive fandom portal for Anime, Gaming, Movies, TV Shows, K-Pop, Comics, Manga, and Cosplay. Fans can explore and search a shared catalogue, read long-form features, discover events, bookmark and rate content, manage preferences, and submit work for review. Merchandise is a discovery showcase only; there is no checkout or payment processing.

## Stack

| Area | Implementation |
|---|---|
| Runtime | Node.js 26.8.1 (tested locally); Node.js 20.9 or newer for Next.js 16 |
| Package manager | npm (use the committed `package-lock.json`) |
| Framework | Next.js 16.3.6 App Router, React 19, TypeScript 5 |
| Database | SQLite through Prisma ORM 6.19.3 |
| Authentication | Auth.js v5 credentials provider, JWT sessions, bcryptjs hashes |
| UI | Tailwind CSS 4, local shadcn/Radix primitives, Lucide icons |
| Validation | Zod 4 and React Hook Form |
| Events map | Leaflet and React Leaflet; OpenStreetMap tiles |
| Mail | Nodemailer with SMTP |

## Roles

- **Visitor**: browses public pages and uses the public chatbot. A signed-in visitor account is read-only for bookmarks, ratings, favorites, feedback, and submissions.
- **User**: can update their profile, choose fandoms, bookmark supported content and keep private notes, rate content, submit fan content, and send feedback.
- **Admin**: can manage the catalogue, fandom presentation, articles, characters, events, merchandise, FAQs, users, submissions, and feedback, and view real database-backed usage statistics. Server actions re-check admin authorization.

## Requirements

- Node.js 20.9+; the current project environment uses 26.8.1.
- npm.
- A valid `DATABASE_URL`. Local development uses SQLite.
- `AUTH_SECRET` for sessions.
- `APP_URL` for password-reset links, canonical metadata, and sitemap URLs.
- SMTP credentials are required to deliver password-reset emails. Without SMTP, the app does not deliver mail or expose a reset token.
- Local avatar uploads write to `public/uploads`. This is suitable for a single persistent Node host, not ephemeral or horizontally scaled hosting.

## Install and run

```powershell
Copy-Item .env.example .env
# Set AUTH_SECRET to a new random value and review all other values in .env.
npm ci
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`. The app applies migrations; it does not automatically seed or reset the database.

To add demo records to a fresh local database, run `npm run db:seed`. **The seed script deletes existing demo table rows before creating its sample dataset. Do not run it against a database containing data you want to preserve.** For routine schema changes, create a migration using `npx prisma migrate dev --name <description>` and review the SQL before applying it.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run lint` | ESLint |
| `npm run build` | Optimized production build and TypeScript checks |
| `npm run start` | Serve a production build |
| `npx prisma validate` | Validate Prisma schema |
| `npx prisma generate` | Generate the Prisma client |
| `npx prisma migrate deploy` | Apply committed migrations in deployment |
| `npm run db:migrate` | Run development migrations |
| `npm run db:seed` | Add local demo data (destructive to existing demo-table rows; see warning above) |
| `npm run db:studio` | Open Prisma Studio |

There is currently no `test` script or dedicated automated test suite in `package.json`.

## Environment variables

Copy `.env.example` to `.env`. `.env` is ignored by Git. Never commit credentials.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | SQLite connection string; local default is `file:./dev.db`. Use durable storage for deployment. |
| `AUTH_SECRET` | Yes | Cryptographic signing secret for Auth.js session tokens. Generate a unique production value. |
| `AUTH_TRUST_HOST` | Deployment dependent | Allows Auth.js to trust the configured host when behind a trusted reverse proxy. |
| `APP_URL` | Yes | Absolute public origin without a trailing slash. Used for reset links and canonical URLs. |
| `SMTP_HOST` | For mail | SMTP server host (example template uses Gmail). |
| `SMTP_PORT` | For mail | SMTP server port (example template uses 587). |
| `SMTP_USER` | For mail | SMTP account name. |
| `SMTP_PASS` | For mail | SMTP password or provider app password. |
| `MAIL_FROM` | For mail | Verified sender address. |

The active-user metric means distinct accounts with role User or Admin whose **successful login** occurred in the preceding 30 days. It is not a count of visits or sessions.

Mail delivery is **implemented but requires SMTP environment configuration**. It has not been verified against a live mail provider in this repository session. No map API key or external AI key is required. Geolocation uses the browser permission API; map tiles come from OpenStreetMap.

## Development/test accounts

These are created only by the demo seed and are **Development/Test Only**. Change them before exposing a seeded environment to anyone else. Do not use them in production.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fanhub.dev` | `HubAdmin!26-Local` |
| User | `user@fanhub.dev` | `HubFan!26-Local` |
| Visitor | `visitor@fanhub.dev` | `HubVisitor!26-Local` |

The seed script stores bcrypt hashes and is intended for local evaluation. The accounts do not exist until the seed has been run.

## Data model

Prisma schema and additive SQLite migrations are in `prisma/`. Core records include users, categories, content, featured articles, character profiles, merchandise, bookmarks, ratings, feedback, fan submissions, chatbot queries/FAQs, and events. Bookmark uniqueness is enforced by compound database constraints for each supported target type. Migrations should be reviewed and backed up before production deployment; never use `prisma migrate reset` on valuable data.

## Deployment notes

1. Provide a persistent SQLite volume and set `DATABASE_URL` to that file.
2. Configure unique `AUTH_SECRET`, `APP_URL`, and trusted host behavior for the deployment.
3. Configure SMTP values and verify the sender with the chosen mail provider before advertising password reset delivery.
4. Build with `npm run build`, apply migrations with `npx prisma migrate deploy`, then start with `npm run start`.
5. Back up the SQLite database and `public/uploads` together. Local uploads require a persistent writable filesystem. Use one app instance unless rate limiting and uploads are moved to shared durable services.
6. Keep secrets in the hosting provider's secret store. Never put secrets in `NEXT_PUBLIC_*` variables.

## Project deliverables and assumptions

- The visible sitemap is `/sitemap`; the machine-readable sitemap and crawler policy are generated at `/sitemap.xml` and `/robots.txt`.
- Events are discovery records and may contain ticket links; tickets are not sold by Fan Hub Plus.
- Merchandise has display prices and bookmarks only. No purchase, order, or payment flow is included.
- Admin-authored and approved article HTML is rebuilt through a strict allow-list before display. Timeline JSON is parsed defensively.
- AI-assisted development: OpenAI Codex was used as an implementation and review assistant. The application chatbot itself is a local FAQ/keyword matcher and does not call an external AI model.
- The required demonstration video has not been created in this repository.

## License

This project was created as a student showcase. Add a project-specific license before redistributing it beyond its intended evaluation context.
