import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SpamCheckRequest {
  title: string;
  description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description }: SpamCheckRequest = await req.json();

    console.log("Checking complaint for spam:", { title, description });

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a spam detection system for a student grievance system. Your job is to identify whether a complaint is spam/gibberish or legitimate.

IMPORTANT RULES:
1. Mark as SPAM if the content is random gibberish like "adfsdfhghf", "qwerty", "asdasd", random keyboard mashing
2. Mark as LEGITIMATE if the content has meaning, even with typos or poor grammar
3. Mark as LEGITIMATE if it's a short but meaningful complaint like "wifi not working", "food is bad"
4. Consider both title and description together

Respond with a JSON object in this exact format:
{
  "is_spam": true/false,
  "reason": "brief explanation",
  "confidence": 0.0-1.0
}`
          },
          {
            role: "user",
            content: `Analyze this complaint:
Title: "${title}"
Description: "${description}"

Is this spam or legitimate?`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_complaint",
              description: "Classify if a complaint is spam or legitimate",
              parameters: {
                type: "object",
                properties: {
                  is_spam: {
                    type: "boolean",
                    description: "Whether the complaint is spam/gibberish"
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation of the classification"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level between 0 and 1"
                  }
                },
                required: ["is_spam", "reason", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_complaint" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Spam detection result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in detect-spam-complaint function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
