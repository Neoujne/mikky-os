
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.CONVEX_URL || "https://nimble-gorilla-456.convex.cloud"; // Placeholder, should come from env

export const convex = new ConvexHttpClient(convexUrl);
