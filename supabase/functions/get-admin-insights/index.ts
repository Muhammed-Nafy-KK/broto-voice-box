import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get recent complaints data
    const { data: complaints, error } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Prepare data summary for AI
    const categoryCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let totalResponseTime = 0;
    let resolvedCount = 0;

    complaints.forEach(complaint => {
      categoryCounts[complaint.category] = (categoryCounts[complaint.category] || 0) + 1;
      statusCounts[complaint.status] = (statusCounts[complaint.status] || 0) + 1;
      
      if (complaint.status === 'Resolved') {
        resolvedCount++;
        const responseTime = new Date(complaint.updated_at).getTime() - new Date(complaint.created_at).getTime();
        totalResponseTime += responseTime;
      }
    });

    const avgResponseTime = resolvedCount > 0 ? totalResponseTime / resolvedCount / (1000 * 60 * 60) : 0;

    const dataSummary = `
Recent Complaints Analysis (Last 50):
- Total: ${complaints.length}
- By Category: ${JSON.stringify(categoryCounts)}
- By Status: ${JSON.stringify(statusCounts)}
- Resolution Rate: ${((resolvedCount / complaints.length) * 100).toFixed(1)}%
- Average Response Time: ${avgResponseTime.toFixed(1)} hours
`;

    // Get AI insights
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
            content: 'You are an AI assistant analyzing complaint data for administrators. Provide actionable insights, trends, and recommendations.'
          },
          {
            role: 'user',
            content: `${dataSummary}\n\nProvide 3-4 key insights and recommendations based on this data.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        insights,
        statistics: {
          total: complaints.length,
          categoryCounts,
          statusCounts,
          resolutionRate: ((resolvedCount / complaints.length) * 100).toFixed(1),
          avgResponseTime: avgResponseTime.toFixed(1)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-admin-insights function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
