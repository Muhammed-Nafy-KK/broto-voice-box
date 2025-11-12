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

interface AnnouncementEmailRequest {
  title: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, message }: AnnouncementEmailRequest = await req.json();

    console.log("Sending announcement email:", title);

    // Create Supabase client with service role key to fetch all user emails
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all user emails from profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name");

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No users found to send announcement to");
      return new Response(
        JSON.stringify({ message: "No users found" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Sending announcement to ${profiles.length} users`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📢 New Announcement</h1>
        </div>
        
        <div style="background-color: #F9FAFB; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">${title}</h2>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <p style="margin: 0; color: #555; line-height: 1.6;">${message}</p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Log in to your account to view more details.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 15px;">
            This is an automated message from the Student Grievance System.
          </p>
        </div>
      </div>
    `;

    // Send emails to all users
    const emailPromises = profiles.map((profile) =>
      resend.emails.send({
        from: "Grievance System <onboarding@resend.dev>",
        to: [profile.email],
        subject: `📢 ${title}`,
        html: emailHtml,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Emails sent: ${successful} successful, ${failed} failed`);

    // Log all email results
    const logPromises = results.map((result, index) => {
      const profile = profiles[index];
      return supabase.from("notification_logs").insert({
        notification_type: "email",
        recipient: profile.email,
        subject: `📢 ${title}`,
        content: emailHtml,
        status: result.status === 'fulfilled' ? 'sent' : 'failed',
        error_message: result.status === 'rejected' ? result.reason?.message : null,
        metadata: { announcement_title: title },
      });
    });

    await Promise.allSettled(logPromises);

    return new Response(
      JSON.stringify({ 
        message: "Announcement emails sent",
        successful,
        failed,
        total: profiles.length 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-announcement-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
