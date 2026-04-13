import axios from "axios";

// Determine base URL dynamically (allow overrides in env)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // We include credentials so HTTP-Only cookies are sent cross-origin if needed
  withCredentials: true,
});

// We no longer strictly need an interceptor to attach bearer tokens from LocalStorage
// because we will be using Next.js Server Actions to handle setting HTTP-only cookies.
// The cookies will automatically fly with requests to our internal Next.js API Routes,
// which will then proxy to the Django server.

// However, if we do direct client-to-django requests, we need the token.
// Since we want true Bank-Grade security (avoiding LocalStorage), we will route
// sensitive client requests through Next.js Route Handlers.
