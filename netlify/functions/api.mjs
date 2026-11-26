import { getStore } from "@netlify/blobs";
import santaConfig from "../../config.mjs";
import { createApi } from "./lib/core.mjs";

export default async (req) => {
  const store = getStore({ name: "secret-santa", consistency: "strong" });
  return createApi({ store, config: santaConfig, adminKey: process.env.ADMIN_KEY })(req);
};

export const config = { path: "/api/*" };
