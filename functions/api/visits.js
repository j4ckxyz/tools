export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.VISITS) {
      return new Response(JSON.stringify({ active: false, visits: {} }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const list = await env.VISITS.list();
    const visits = {};
    for (const key of list.keys) {
      visits[key.name] = parseInt(await env.VISITS.get(key.name) || "0", 10);
    }
    return new Response(JSON.stringify({ active: true, visits }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ active: false, error: e.message, visits: {} }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
