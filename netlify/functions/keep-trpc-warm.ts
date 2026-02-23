import type { Config } from "@netlify/functions";

export default async () => {
  // Use the deployed URL — falls back gracefully
  const baseUrl =
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    "https://your-site-name.netlify.app";

  // tRPC endpoint — adjust if you have a rewrite (e.g. to /trpc/* instead of /.netlify/functions/trpc)
  const trpcEndpoint = `${baseUrl}/.netlify/functions/trpc`;

  // Or if rewritten in netlify.toml / next.config.js:
  // const trpcEndpoint = `${baseUrl}/trpc`;

  const pingUrl = `${trpcEndpoint}/health.ping?batch=1`; // batch=1 makes it a single request

  try {
    const res = await fetch(pingUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // No origin header needed — your CORS allows missing origin or localhost
        "User-Agent": "Netlify Warmer / Scheduled",
      },
      cache: "no-store",
      // timeout if needed (fetch doesn't have built-in, but Netlify functions timeout at 30s anyway)
    });

    if (!res.ok) {
      console.error(`Ping failed: ${res.status} ${res.statusText}`);
    } else {
      console.log(`tRPC warmed: ${res.status}`);
    }
  } catch (err) {
    console.error("Warmer failed:", err);
  }

  return new Response("Warm-up run", { status: 200 });
};

export const config: Config = {
  schedule: "*/10 * * * *", // every 10 minutes — very effective balance
  // More aggressive: "*/5 * * * *"  (every 5 min → ~288 invocations/month)
  // Lighter:      "*/15 * * * *"   (every 15 min → still helps a lot)
};
