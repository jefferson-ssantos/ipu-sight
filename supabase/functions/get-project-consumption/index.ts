import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PostgresConnection, validateSupabaseJWT, getUserClientId } from '../postgres-connection/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const user = await validateSupabaseJWT(authHeader);
    const clientId = await getUserClientId(user);

    const { start_date, end_date, selected_project } = await req.json();

    const postgres = PostgresConnection.getInstance();
    
    const result = await postgres.query(
      'SELECT * FROM get_project_consumption_data($1, $2, $3, $4)',
      [start_date, end_date, selected_project || null, clientId]
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-project-consumption:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});