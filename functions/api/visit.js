export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { path } = await request.json();
    if (!path) {
      return new Response("Path required", { status: 400 });
    }

    if (!env.VISITS) {
      return new Response("KV Namespace VISITS is not bound. Please bind it in Pages Settings.", { status: 500 });
    }

    const countStr = await env.VISITS.get(path) || "0";
    const newCount = parseInt(countStr, 10) + 1;
    await env.VISITS.put(path, String(newCount));
    
    return new Response(JSON.stringify({ path, visits: newCount }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
