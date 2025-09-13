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
    const { startDate, endDate } = await req.json();

    const result = await pg`
      SELECT * FROM get_cost_distribution_data(
        ${startDate || null},
        ${endDate || null},
        ${userClientId}
      )
    `;
    
    await pg.end();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Erro ao chamar a função get_cost_distribution_data:', err);
    if (pg) await pg.end();
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
