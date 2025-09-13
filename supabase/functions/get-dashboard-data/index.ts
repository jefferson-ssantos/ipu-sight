import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { handleRequest } from '../_shared/postgres-client.ts';

serve(async (req) => {
  // Utiliza nosso manipulador compartilhado para autenticação e conexão
  const { postgresClient, clientId, error, response } = await handleRequest(req);

  // Se o manipulador já retornou uma resposta (OPTIONS ou erro), a retornamos diretamente
  if (response) return response;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status,
    });
  }

  // Se tudo correu bem, postgresClient e clientId estão definidos
  // O '!' afirma ao TypeScript que eles não são nulos aqui
  const pg = postgresClient!; 
  const userClientId = clientId!;

  try {
    const { startDate, endDate, orgFilter } = await req.json();

    // Chama a função no PostgreSQL com os parâmetros corretos
    const result = await pg`
      SELECT * FROM get_dashboard_kpis(
        ${startDate || null},
        ${endDate || null},
        ${orgFilter || null},
        ${userClientId}
      )
    `;
    
    // Encerra a conexão com o banco de dados
    await pg.end();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Erro ao chamar a função get_dashboard_kpis:', err);
    // Garante que a conexão seja encerrada mesmo em caso de erro
    if (pg) await pg.end();
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
