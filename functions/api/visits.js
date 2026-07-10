export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.VISITS) {
      // Graceful fallback: return empty object if KV isn't bound yet
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const list = await env.VISITS.list();
    const results = {};
    for (const key of list.keys) {
      results[key.name] = parseInt(await env.VISITS.get(key.name) || "0", 10);
    }
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
