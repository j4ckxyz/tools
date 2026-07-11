// Proxy to a "cobalt" media-processing instance (https://github.com/imputnet/cobalt).
// yt-dlp itself cannot run in a browser or in a Cloudflare Pages Function, so this
// forwards the request to a cobalt API instance and relays its JSON response.
//
// The instance can be overridden per-request (from the UI) or via the COBALT_API_URL
// environment variable. An optional COBALT_API_KEY is sent as a Bearer token for
// instances that require authentication.

const DEFAULT_INSTANCE = "https://cobalt-backend.canine.tools";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const url = (payload.url || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return json({ error: "A valid http(s) URL is required" }, 400);
  }

  // Resolve the instance: request override -> env var -> default.
  let instance = (payload.instance || env.COBALT_API_URL || DEFAULT_INSTANCE).trim();
  if (!/^https?:\/\//i.test(instance)) {
    return json({ error: "Invalid cobalt instance URL" }, 400);
  }
  instance = instance.replace(/\/+$/, "");

  // Build the cobalt v10 request body from the whitelisted options.
  const body = { url, filenameStyle: "pretty" };

  if (payload.downloadMode === "audio") {
    body.downloadMode = "audio";
    body.audioFormat = payload.audioFormat === "best" ? "best" : "mp3";
    if (payload.audioBitrate) body.audioBitrate = String(payload.audioBitrate);
  } else {
    body.downloadMode = "auto";
    if (payload.videoQuality) body.videoQuality = String(payload.videoQuality);
    // Force an MP4-friendly codec so the result plays everywhere.
    body.youtubeVideoCodec = "h264";
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const apiKey = payload.apiKey || env.COBALT_API_KEY;
  if (apiKey) headers.Authorization = `Api-Key ${apiKey}`;

  let res;
  try {
    res = await fetch(instance, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return json({ error: `Could not reach the downloader instance: ${err.message}` }, 502);
  }

  let data;
  try {
    data = await res.json();
  } catch (_) {
    return json({ error: `Downloader returned a non-JSON response (HTTP ${res.status}).` }, 502);
  }

  // Pass cobalt's response straight through with CORS headers attached.
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : res.status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
