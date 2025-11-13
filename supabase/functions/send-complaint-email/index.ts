import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ComplaintEmailRequest {
  complaintId: string;
  studentEmail: string;
  studentName: string;
  complaintTitle: string;
  status: string;
  adminRemarks?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      complaintId,
      studentEmail,
      studentName,
      complaintTitle,
      status,
      adminRemarks,
    }: ComplaintEmailRequest = await req.json();

    console.log("Sending complaint email to:", studentEmail);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          Complaint Status Update
        </h1>
        
        <p>Dear ${studentName},</p>
        
        <p>Your complaint <strong>"${complaintTitle}"</strong> has been updated.</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="color: #4F46E5;">${status}</span></p>
          ${
            adminRemarks
              ? `<p style="margin: 5px 0;"><strong>Admin Response:</strong></p>
                 <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 4px;">${adminRemarks}</p>`
              : ""
          }
        </div>
        
        <p>You can view the full details of your complaint by logging into your account.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          Student Grievance System Team
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Grievance System <noreply@brotorise.example.com>",
      to: [studentEmail],
      subject: `Complaint Update: ${complaintTitle}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log successful email send
    await supabase.from("notification_logs").insert({
      notification_type: "email",
      recipient: studentEmail,
      subject: `Complaint Update: ${complaintTitle}`,
      content: emailHtml,
      status: "sent",
      related_complaint_id: complaintId,
      metadata: { email_response: emailResponse },
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-complaint-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
