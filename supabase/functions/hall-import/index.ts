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

    // Accept 2 SVG uploads: plattegrond + technisch
    const plattegrondFile = formData.get("plattegrond") as File | null;
    const technischFile = formData.get("technisch") as File | null;
    // Legacy single file support
    const legacyFile = formData.get("file") as File | null;

    if (!plattegrondFile && !technischFile && !legacyFile) {
      return new Response(
        JSON.stringify({ error: "Upload at least one SVG file. Fields: 'plattegrond', 'technisch', or legacy 'file'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let bbox = { minX: 0, minY: 0, maxX: 100, maxY: 60 };
    let plattegrondUrl = "";
    let technischUrl = "";

    // Helper: upload SVG and extract bbox
    async function uploadSvg(file: File, storagePath: string): Promise<{ url: string; bbox?: typeof bbox }> {
      const filename = file.name.toLowerCase();
      if (!filename.endsWith(".svg")) {
        throw new Error(`Only .svg files are supported, got: ${filename}`);
      }

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("hall-backgrounds")
        .upload(storagePath, fileBuffer, {
          contentType: "image/svg+xml",
          upsert: true,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from("hall-backgrounds")
        .getPublicUrl(storagePath);

      // Parse SVG for bbox
      const svgText = new TextDecoder().decode(fileBuffer);
      let extractedBbox: typeof bbox | undefined;
      const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every(n => isFinite(n))) {
          extractedBbox = { minX: parts[0], minY: parts[1], maxX: parts[0] + parts[2], maxY: parts[1] + parts[3] };
        }
      }

      return { url: urlData.publicUrl, bbox: extractedBbox };
    }

    // Upload plattegrond
    if (plattegrondFile) {
      const result = await uploadSvg(plattegrondFile, `${hallId}/plattegrond.svg`);
      plattegrondUrl = result.url;
      if (result.bbox) bbox = result.bbox;
    } else if (legacyFile) {
      // Legacy: single file → stored as plattegrond
      const result = await uploadSvg(legacyFile, `${hallId}/plattegrond.svg`);
      plattegrondUrl = result.url;
      if (result.bbox) bbox = result.bbox;
    }

    // Upload technisch
    if (technischFile) {
      const result = await uploadSvg(technischFile, `${hallId}/technisch.svg`);
      technischUrl = result.url;
      // Use technisch bbox only if plattegrond didn't have one
      if (result.bbox && !plattegrondUrl) bbox = result.bbox;
    }

    // Update hall background_url (legacy compat – use plattegrond as primary)
    if (plattegrondUrl) {
      await supabase
        .from("halls")
        .update({ background_url: plattegrondUrl, background_type: "svg" })
        .eq("id", hallId);
    }

    // TODO: DWG→DXF→SVG conversion pipeline
    // Steps:
    //   1. Accept .dwg file upload
    //   2. Convert DWG→DXF (via ODA File Converter or external service)
    //   3. Convert DXF→SVG with layer mapping
    //   4. Detect units (mm vs m) from DWG header
    //   5. Extract/normalize layers into plattegrond + technisch SVGs
    //   6. Store both SVGs and return HallBasemap

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
      svgUrl: plattegrondUrl,
      plattegrondSvgUrl: plattegrondUrl,
      technischSvgUrl: technischUrl,
      updatedAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, basemap }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Processing failed: ${String(error)}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
