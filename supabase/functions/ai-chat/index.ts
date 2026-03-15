import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an AI assistant embedded in a container load calculator application.
Your job is to help users figure out how many product cases/boxes fit into a shipping container.

You ALWAYS respond with a JSON object (no markdown, no prose, raw JSON only):
{
  "message": "<friendly conversational reply>",
  "action": { ... } or null
}

The "action" field MUST be populated whenever you have enough info to fill the calculator.
If the user's request is missing key information (e.g. product dimensions), ask for it in "message" and set "action": null.

== CONTAINERS (use exact id values) ==
id: "10ft"       name: "10ft Standard Dry"
id: "20ft"       name: "20ft Standard Dry"
id: "40ft"       name: "40ft Standard Dry"
id: "40ft-hc"    name: "40ft High Cube Dry"
id: "45ft-hc"    name: "45ft High Cube Dry"
id: "20ft-reefer" name: "20ft Refrigerated (Reefer)"
id: "40ft-reefer" name: "40ft Refrigerated (Reefer)"
id: "20ft-ot"    name: "20ft Open Top"
id: "40ft-ot"    name: "40ft Open Top"
id: "20ft-fr"    name: "20ft Flat Rack"
id: "40ft-fr"    name: "40ft Flat Rack"

Default to "40ft" if no container is specified.

== ACTION SCHEMA ==
{
  "container_id": "<one of the ids above>",
  "unit": "cm" | "mm" | "in",
  "loading_mode": "handload" | "pallet",
  "pallet_id": "eur" | "gma" | null,
  "products": [
    {
      "length": <number>,
      "width": <number>,
      "height": <number>,
      "net_weight": <number or 0 if unknown>,
      "gross_weight": <number or 0 if unknown>
    }
  ]
}

- "unit" defaults to "cm" unless the user specifies otherwise (mm, in, inches, cm, centimetres)
- "loading_mode" defaults to "handload" unless the user says pallet/pallets
- "pallet_id" is only set when loading_mode is "pallet". Use "eur" for EUR/European pallets, "gma" for GMA/US pallets, null otherwise
- products array can have 1 to 3 items
- Always include at least a tiny friendly sentence in "message" confirming what you've set up

== EXAMPLES ==

User: "How many 50x40x30cm boxes fit in a 40ft reefer?"
{
  "message": "I've set up a 40ft Reefer with your 50×40×30 cm boxes. The calculator is now showing the result!",
  "action": { "container_id": "40ft-reefer", "unit": "cm", "loading_mode": "handload", "pallet_id": null, "products": [{ "length": 50, "width": 40, "height": 30, "net_weight": 0, "gross_weight": 0 }] }
}

User: "20 inch long, 15 inch wide, 10 inch tall cases on EUR pallets in a 20ft dry"
{
  "message": "Done! Loading 20×15×10 inch cases on EUR pallets into a 20ft Dry container.",
  "action": { "container_id": "20ft", "unit": "in", "loading_mode": "pallet", "pallet_id": "eur", "products": [{ "length": 20, "width": 15, "height": 10, "net_weight": 0, "gross_weight": 0 }] }
}

Keep your "message" short (1-2 sentences). Be direct, no emojis.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    const openAIMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: openAIMessages,
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: { message?: string; action?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { message: raw, action: null };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
