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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const adminEmail = 'admin@complaint-system.com';
    let userId: string;
    let wasCreated = false;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === adminEmail);

    if (existingUser) {
      console.log('Admin user already exists, updating role:', existingUser.id);
      userId = existingUser.id;

      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: 'System Admin',
          role: 'admin'
        }
      });
    } else {
      // Create new admin user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: 'Admin@123',
        email_confirm: true,
        user_metadata: {
          full_name: 'System Admin',
          role: 'admin'
        }
      });

      if (authError) {
        console.error('Error creating admin user:', authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;
      wasCreated = true;
      console.log('Admin user created successfully:', userId);
    }

    // Update or insert admin role in user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role: 'admin' 
      }, { 
        onConflict: 'user_id,role' 
      });

    if (roleError) {
      console.error('Error updating user role:', roleError);
    }

    // Update profile role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', full_name: 'System Admin' })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: wasCreated ? 'Admin account created successfully' : 'Admin role updated successfully',
        email: 'admin@complaint-system.com',
        password: 'Admin@123'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-admin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
