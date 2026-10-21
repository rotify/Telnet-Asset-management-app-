// The backend address lives in one place: the API_BASE_URL environment
// variable (.env.local on your machine, Environment Variables on Vercel).
// Every server route imports it from here, so changing the backend means
// changing that one variable.
export const API_BASE_URL = (process.env.API_BASE_URL ?? "").replace(/\/+$/, "");

if (!API_BASE_URL && process.env.NODE_ENV !== "production") {
  console.error("API_BASE_URL is not set. Add it to .env.local (see .env.example).");
}
