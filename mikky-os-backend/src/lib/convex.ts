import { ConvexHttpClient } from 'convex/browser';

// Initialize the Convex HTTP client for server-side calls
const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
    throw new Error('CONVEX_URL environment variable is not set');
}

export const convex = new ConvexHttpClient(convexUrl);
