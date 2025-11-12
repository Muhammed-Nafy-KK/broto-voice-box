import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  complaintId: string;
  phoneNumber: string;
  studentName: string;
  complaintTitle: string;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      complaintId,
      phoneNumber,
      studentName,
      complaintTitle,
      status,
    }: SMSRequest = await req.json();

    console.log("Sending SMS to:", phoneNumber);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const message = `Hi ${studentName}, your urgent complaint "${complaintTitle}" has been updated to: ${status}. Please check your email for details.`;

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", phoneNumber);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      throw new Error(`Twilio API error: ${errorData.message || twilioResponse.statusText}`);
    }

    const twilioData = await twilioResponse.json();
    console.log("SMS sent successfully:", twilioData.sid);

    // Log successful SMS send
    await supabase.from("notification_logs").insert({
      notification_type: "sms",
      recipient: phoneNumber,
      content: message,
      status: "sent",
      related_complaint_id: complaintId,
      metadata: { twilio_sid: twilioData.sid },
    });

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-sms-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
