import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { handleRequest } from '../_shared/postgres-client.ts';

serve(async (req) => {
  const { postgresClient, clientId, error, response } = await handleRequest(req);

  if (response) return response;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status,
    });
  }

  const pg = postgresClient!;
  const userClientId = clientId!;

  try {
    const { cycleLimit, orgFilter } = await req.json();

    const result = await pg`
      SELECT * FROM get_billing_periods_data(
        ${cycleLimit || null},
        ${orgFilter || null},
        ${userClientId}
      )
    `;
    
    await pg.end();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Erro ao chamar a função get_billing_periods_data:', err);
    if (pg) await pg.end();
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
