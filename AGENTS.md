# Fan Hub Plus project notes

- This repository uses a MERN stack: React + Vite in `client/`, Express 5 and Mongoose in `server/`, MongoDB on port 27017.
- Read the installed documentation for a library before using APIs that may have changed, especially Express, Mongoose, Vite, and React Router.
- Keep server authorization and request validation in the Express API. Do not rely on client-side hiding for access control.
- Never reset or drop the MongoDB database. The SQLite-to-Mongo migration is additive and must leave the SQLite source untouched.
- Preserve the user-provided `public/Logo.png`; do not replace or alter it.
- Keep `.env`, local databases, and uploaded files out of Git.
