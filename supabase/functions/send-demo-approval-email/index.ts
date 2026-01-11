import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to_email: string;
  contact_name: string;
  company_name: string;
  invite_link: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Email service not configured",
          message: "RESEND_API_KEY ontbreekt. Email is niet verzonden maar de aanvraag is goedgekeurd."
        }),
        {
          status: 200, // Return 200 so the approval flow continues
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { to_email, contact_name, company_name, invite_link }: EmailRequest = await req.json();

    console.log(`Sending demo approval email to ${to_email}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welkom bij Completexpo!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px;">Beste ${contact_name},</p>
          
          <p style="font-size: 16px;">
            Goed nieuws! Je demo aanvraag voor <strong>"${company_name}"</strong> is goedgekeurd.
          </p>
          
          <p style="font-size: 16px;">
            Klik op de onderstaande knop om je account te activeren en een wachtwoord aan te maken:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invite_link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Account activeren
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Of kopieer deze link in je browser:<br>
            <a href="${invite_link}" style="color: #667eea; word-break: break-all;">${invite_link}</a>
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Deze link is 7 dagen geldig.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; margin: 0;">
            Met vriendelijke groet,<br>
            Het Completexpo Team
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          © ${new Date().getFullYear()} Completexpo. Alle rechten voorbehouden.
        </div>
      </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Completexpo <info@lppayments.be>",
        to: [to_email],
        subject: "Je Completexpo account is goedgekeurd!",
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailData.message || "Failed to send email",
          message: "Email kon niet verzonden worden. Controleer de Resend configuratie."
        }),
        {
          status: 200, // Return 200 so approval flow continues
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-demo-approval-email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: "Er ging iets mis bij het versturen van de email."
      }),
      {
        status: 200, // Return 200 so approval flow continues
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
