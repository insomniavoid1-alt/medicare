/**
 * ClearPath Medicare editor API (Cloudflare Worker).
 *
 * Configure Worker secrets:
 *   GITHUB_TOKEN     Fine-grained token, only insomniavoid1-alt/medicare,
 *                    repository Contents read/write permission.
 * Passwordless pre-launch configuration: editor routes are unauthenticated.
 * Configure Worker variable:
 *   SITE_ORIGIN      Exact public site origin, including https:// and no path.
 *
 * Bind this Worker to the site's /api/* route in Cloudflare. Never expose the
 * GitHub token in index.html or any browser code.
 */
const OWNER = "insomniavoid1-alt";
const REPO = "medicare";
const BRANCH = "main";
const API = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/";

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || origin !== env.SITE_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": env.SITE_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}
async function github(path, env, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "GitHub request failed (" + response.status + ")");
  return result;
}
function checkAuth() {
  // Passwordless mode requested for pre-launch editing. Anyone who can reach
  // this API route can publish changes; re-enable authentication before launch.
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === "OPTIONS") {
      if (!headers["Access-Control-Allow-Origin"]) return new Response("Origin not allowed", { status: 403 });
      return new Response(null, { status: 204, headers });
    }
    if (!headers["Access-Control-Allow-Origin"]) {
      return json({ error: "Origin not allowed. Configure SITE_ORIGIN to match the live website." }, 403);
    }
    if (url.pathname === "/api/health" && request.method === "GET") {
      if (!checkAuth()) return json({ error: "Editor access denied." }, 401, headers);
      return json({ ok: true, service: "ClearPath Medicare editor API" }, 200, headers);
    }
    if (!checkAuth(request, env)) return json({ error: "Editor password is incorrect." }, 401, headers);
    if (request.method !== "POST") return json({ error: "POST required." }, 405, headers);

    try {
      const body = await request.json();
      if (url.pathname === "/api/publish") {
        if (typeof body.html !== "string" || !body.html.toLowerCase().startsWith("<!doctype html>")) {
          return json({ error: "Valid page HTML is required." }, 400, headers);
        }
        if (body.html.length > 1500000) return json({ error: "Page HTML is too large." }, 413, headers);
        const current = await github("index.html?ref=" + BRANCH, env);
        const saved = await github("index.html", env, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Edit Medicare website using visual editor",
            content: bytesToBase64(new TextEncoder().encode(body.html)),
            sha: current.sha,
            branch: BRANCH
          })
        });
        return json({ ok: true, commit: saved.commit && saved.commit.sha, message: "Changes committed. Automated checks and deployment are starting." }, 200, headers);
      }
      if (url.pathname === "/api/upload") {
        if (typeof body.name !== "string" || typeof body.data !== "string" ||
            !/^[a-zA-Z0-9._-]{1,100}$/.test(body.name)) {
          return json({ error: "Invalid image upload." }, 400, headers);
        }
        if (body.data.length > 11500000) return json({ error: "Choose an image smaller than 8 MB." }, 413, headers);
        const binary = atob(body.data);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const signature = Array.from(bytes.slice(0, 12)).map(n => n.toString(16).padStart(2, "0")).join("");
        const isImage = signature.startsWith("ffd8ff") || signature.startsWith("89504e47") ||
          signature.startsWith("47494638") || signature.startsWith("52494646") ||
          signature.startsWith("000000");
        if (!isImage) return json({ error: "Please choose a supported image file." }, 400, headers);
        const name = body.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
        const path = "assets/uploads/" + Date.now() + "-" + name;
        await github(path, env, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Upload image using Medicare visual editor",
            content: bytesToBase64(bytes),
            branch: BRANCH
          })
        });
        return json({ ok: true, url: "/assets/uploads/" + path.split("/").pop() }, 200, headers);
      }
      return json({ error: "Unknown editor endpoint." }, 404, headers);
    } catch (error) {
      return json({ error: error && error.message ? error.message : "Unexpected error." }, 500, headers);
    }
  }
};
