// workers/ai-editor.ts

export interface Env {
  AI: Ai;
  KV_BINDING: KVNamespace;
  DB: D1Database;
  AI_GATEWAY: string;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_HISTORY = 10;

export default {
  async fetch(request: Request, env: Env) {
    // CORS headers for browser frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const prompt = body.prompt;
        const model = body.model || DEFAULT_MODEL;

        if (!prompt || prompt.trim() === "") {
          return new Response(
            JSON.stringify({ error: "Missing 'prompt' in request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Call AI
        const aiResponse = await env.AI.run(
          model,
          { prompt: `Modify this RuneScape 3D model: ${prompt}` },
          { gateway: { id: env.AI_GATEWAY } }
        );

        // Save to KV
        const key = `model-${Date.now()}`;
        await env.KV_BINDING.put(key, JSON.stringify({ prompt, aiResponse }));

        // Optionally, store in D1
        try {
          await env.DB.prepare(
            "INSERT INTO model_history (kv_key, prompt, response) VALUES (?, ?, ?)"
          ).bind(key, prompt, JSON.stringify(aiResponse)).run();
        } catch (_) {
          // ignore D1 errors on free tier
        }

        return new Response(JSON.stringify({ key, prompt, aiResponse }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "GET") {
        // List latest N items from KV (free-tier safe)
        const list = await env.KV_BINDING.list({ limit: MAX_HISTORY });
        const results = [];

        for (const key of list.keys) {
          const value = await env.KV_BINDING.get(key.name);
          if (value) results.push(JSON.parse(value));
        }

        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
