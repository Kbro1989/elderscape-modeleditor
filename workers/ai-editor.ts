export interface Env {
  AI: Ai;
  KV_BINDING: KVNamespace;
  DB: D1Database;
}

export default {
  async fetch(request, env) {
    const { prompt, model } = await request.json();

    const response = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
      { prompt: `Modify this RuneScape 3D model as described: ${prompt}` },
      { gateway: { id: "pick-of-gods" } }
    );

    await env.KV_BINDING.put(`model-${Date.now()}`, JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
