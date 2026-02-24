// netlify/functions/keep-trpc-warm.ts

import type { Config } from "@netlify/functions";

export default async () => {
  const baseUrl =
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    "https://dotasksapp.netlify.app";

  const trpcEndpoint = `${baseUrl}/trpc`;
  const pingUrl = `${trpcEndpoint}/health.ping?batch=1`;

  try {
    await fetch(pingUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Netlify Warmer / Scheduled",
      },
      cache: "no-store",
    });
  } catch {
    // silently ignore failures — the warmer should not fail the function
  }

  return new Response("Warm-up complete", { status: 200 });
};

export const config: Config = {
  schedule: "*/10 * * * *",
};
