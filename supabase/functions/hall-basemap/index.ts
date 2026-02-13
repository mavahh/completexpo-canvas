import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  try {
    const hallId = url.searchParams.get("hallId");
    if (!hallId) {
      return new Response(
        JSON.stringify({ error: "hallId query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load hall data
    const { data: hall, error: hallError } = await supabase
      .from("halls")
      .select("id, name, width_meters, height_meters, scale_ratio, background_url, background_type")
      .eq("id", hallId)
      .single();

    if (hallError || !hall) {
      return new Response(
        JSON.stringify({ error: "Hall not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const widthM = Number(hall.width_meters) || 100;
    const heightM = Number(hall.height_meters) || 60;
    const bbox = { minX: 0, minY: 0, maxX: widthM, maxY: heightM };

    // Check for plattegrond + technisch SVGs
    const basePath = hallId;
    const { data: files } = await supabase.storage.from("hall-backgrounds").list(basePath);
    const fileNames = (files || []).map((f: { name: string }) => f.name);

    const hasPlattegrond = fileNames.includes("plattegrond.svg");
    const hasTechnisch = fileNames.includes("technisch.svg");

    const { data: plattegrondUrlData } = supabase.storage.from("hall-backgrounds").getPublicUrl(`${basePath}/plattegrond.svg`);
    const { data: technischUrlData } = supabase.storage.from("hall-backgrounds").getPublicUrl(`${basePath}/technisch.svg`);

    const plattegrondSvgUrl = hasPlattegrond ? plattegrondUrlData.publicUrl : (hall.background_url || "");
    const technischSvgUrl = hasTechnisch ? technischUrlData.publicUrl : "";

    const basemap = {
      hallId,
      units: "m",
      bbox,
      layers: [
        { id: "walls", name: "Muren", visible: true, kind: "walls" },
        { id: "text", name: "Labels", visible: true, kind: "text" },
        { id: "lights", name: "Verlichting", visible: false, kind: "lights" },
        { id: "other", name: "Overig", visible: true, kind: "other" },
      ],
      svgUrl: plattegrondSvgUrl,
      plattegrondSvgUrl,
      technischSvgUrl,
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(basemap), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
