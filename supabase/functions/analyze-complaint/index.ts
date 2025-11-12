import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const complaintText = `Title: ${title}\nDescription: ${description}`;

    // Analyze complaint using Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes student complaints. 
            
Categorize the complaint into one of these categories ONLY:
- Technical: Issues with computers, software, internet, lab equipment
- Mentor: Issues with teaching, mentoring, guidance, faculty
- Facility: Issues with classrooms, hostels, infrastructure, cleanliness
- Administrative: Issues with paperwork, processes, rules, management
- Other: Everything else

Also analyze the sentiment/urgency:
- urgent: Immediate attention needed, critical issues, safety concerns
- frustrated: High emotion, repeated issues, demanding tone
- neutral: Normal reporting, calm description

Respond in this EXACT JSON format (nothing else):
{
  "category": "category_name",
  "sentiment": "sentiment_level",
  "reasoning": "brief explanation"
}`
          },
          {
            role: 'user',
            content: complaintText
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback to default values
      analysis = {
        category: 'Other',
        sentiment: 'neutral',
        reasoning: 'Could not analyze'
      };
    }

    // Map sentiment to priority
    const priorityMap: Record<string, string> = {
      'urgent': 'urgent',
      'frustrated': 'high',
      'neutral': 'medium'
    };

    return new Response(
      JSON.stringify({
        category: analysis.category,
        sentiment: analysis.sentiment,
        priority: priorityMap[analysis.sentiment] || 'medium',
        reasoning: analysis.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-complaint function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
