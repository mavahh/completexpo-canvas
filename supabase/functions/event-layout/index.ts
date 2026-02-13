import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const hallId = url.searchParams.get("hallId");

  if (!eventId || !hallId) {
    return new Response(
      JSON.stringify({ error: "eventId and hallId query parameters required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    if (req.method === "GET") {
      // TODO: Load from database
      const mockLayout = {
        eventId,
        hallId,
        objects: [],
        version: 1,
      };

      return new Response(JSON.stringify(mockLayout), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      const body = await req.json();

      // TODO: Validate and save to database, bump version
      const saved = {
        ...body,
        eventId,
        hallId,
        version: (body.version || 0) + 1,
      };

      return new Response(JSON.stringify(saved), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
