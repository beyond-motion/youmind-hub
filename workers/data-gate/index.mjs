// youmind-hub data gate: serve /data/<slug>.json from R2 with CORS.
// Allowed origins: the canonical site (*.beyondmotion.net), the GitHub Pages
// mirror (*.github.io, *.pages.dev), and local dev. Adjust if you use other hosts.

const ALLOWED_HOST_SUFFIXES = [".beyondmotion.net", ".github.io", ".pages.dev"];
const FALLBACK_ORIGIN = "https://youmind.beyondmotion.net";

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : FALLBACK_ORIGIN,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405, headers: corsHeaders(origin) });
    }

    const key = new URL(request.url).pathname.replace(/^\/+/, "");
    if (!/^data\/[a-z0-9][a-z0-9._-]*\.json$/.test(key)) {
      return new Response("not found", { status: 404, headers: corsHeaders(origin) });
    }

    const object = await env.DATA.get(key);
    if (!object) {
      return new Response("not found", { status: 404, headers: corsHeaders(origin) });
    }

    const headers = new Headers(corsHeaders(origin));
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "public, max-age=300, must-revalidate");
    object.writeHttpMetadata(headers);

    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  }
};
