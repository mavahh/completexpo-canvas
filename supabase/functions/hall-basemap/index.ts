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
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Expected: /hall-basemap?hallId=xxx

  try {
    const hallId = url.searchParams.get("hallId");
    if (!hallId) {
      return new Response(
        JSON.stringify({ error: "hallId query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: In production, load from Supabase DB + Storage
    // For now, return a mock basemap
    const mockBasemap = {
      hallId,
      units: "m",
      bbox: { minX: 0, minY: 0, maxX: 100, maxY: 60 },
      layers: [
        { id: "walls", name: "Muren", visible: true, kind: "walls" },
        { id: "text", name: "Labels", visible: true, kind: "text" },
        { id: "lights", name: "Verlichting", visible: false, kind: "lights" },
        { id: "other", name: "Overig", visible: true, kind: "other" },
      ],
      svgUrl: "",
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(mockBasemap), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
