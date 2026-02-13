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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const hallId = url.searchParams.get("hallId");

  if (!hallId) {
    return new Response(
      JSON.stringify({ error: "hallId query parameter is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded. Send a 'file' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filename = file.name.toLowerCase();
    const isDwg = filename.endsWith(".dwg");
    const isSvg = filename.endsWith(".svg");

    if (!isDwg && !isSvg) {
      return new Response(
        JSON.stringify({ error: "Only .dwg and .svg files are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Implement real DWG→DXF→SVG conversion pipeline
    // Steps:
    //   1. Store original file (dwg/svg) in Storage
    //   2. If DWG: convert to DXF (via external service), then DXF→SVG
    //   3. Detect units (mm vs m) from DWG metadata
    //   4. Extract layers from SVG (group by <g> elements)
    //   5. Compute bounding box from SVG viewBox
    //   6. Store basemap.svg + basemap.json
    //   7. Return HallBasemap

    if (isSvg) {
      // For SVG uploads: store directly and return basemap
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const fileBuffer = await file.arrayBuffer();
      const filePath = `${hallId}/basemap.svg`;

      const { error: uploadError } = await supabase.storage
        .from("hall-backgrounds")
        .upload(filePath, fileBuffer, {
          contentType: "image/svg+xml",
          upsert: true,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage
        .from("hall-backgrounds")
        .getPublicUrl(filePath);

      // Parse SVG for bbox
      const svgText = new TextDecoder().decode(fileBuffer);
      let bbox = { minX: 0, minY: 0, maxX: 100, maxY: 60 };

      const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every(n => isFinite(n))) {
          bbox = { minX: parts[0], minY: parts[1], maxX: parts[0] + parts[2], maxY: parts[1] + parts[3] };
        }
      }

      // Update hall background_url
      await supabase
        .from("halls")
        .update({ background_url: urlData.publicUrl, background_type: "svg" })
        .eq("id", hallId);

      const basemap = {
        hallId,
        units: "m" as const,
        bbox,
        layers: [
          { id: "walls", name: "Muren", visible: true, kind: "walls" },
          { id: "text", name: "Labels", visible: true, kind: "text" },
          { id: "lights", name: "Verlichting", visible: false, kind: "lights" },
          { id: "other", name: "Overig", visible: true, kind: "other" },
        ],
        svgUrl: urlData.publicUrl,
        updatedAt: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify({ success: true, basemap }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DWG stub
    return new Response(
      JSON.stringify({
        success: false,
        error: "DWG conversion is not yet implemented. Upload an SVG file instead.",
        // TODO: Implement DWG→DXF→SVG pipeline
        // - Use ODA File Converter or LibreCAD for DWG→DXF
        // - Use dxf-parser + svg-builder for DXF→SVG
        // - Detect units from DWG header
        // - Map DWG layers to basemap layers
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Processing failed: ${String(error)}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
