// supabase/functions/_shared/postgres-client.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import postgres from 'https://deno.land/x/postgresjs@v3.4.2/mod.js';
import { corsHeaders } from './cors.ts';

// Interface para a resposta do nosso manipulador
interface HandleRequestResponse {
  postgresClient?: postgres.Sql;
  clientId?: number;
  error?: { message: string; status: number };
  response?: Response;
}

// Supabase client para verificar o JWT
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function handleRequest(req: Request): Promise<HandleRequestResponse> {
  // Lida com a requisição pre-flight OPTIONS
  if (req.method === 'OPTIONS') {
    return { response: new Response('ok', { headers: corsHeaders }) };
  }

  try {
    // 1. Validação do JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return { error: { message: 'Authorization header é obrigatório', status: 401 } };
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError) {
      console.error('Erro de autenticação JWT:', userError);
      return { error: { message: 'Token inválido', status: 401 } };
    }

    const clientId = user?.user_metadata?.client_id;
    if (!clientId) {
      console.error('client_id não encontrado no metadata do usuário');
      return { error: { message: 'Usuário não associado a um cliente', status: 401 } };
    }

    // 2. Conexão com o PostgreSQL
    const postgresClient = postgres({
      host: Deno.env.get('POSTGRES_HOST'),
      port: parseInt(Deno.env.get('POSTGRES_PORT')!, 10),
      database: Deno.env.get('POSTGRES_DB'),
      user: Deno.env.get('POSTGRES_USER'),
      password: Deno.env.get('POSTGRES_PASSWORD'),
      ssl: Deno.env.get('POSTGRES_SSL_MODE') === 'require' ? 'require' : false,
    });

    return { postgresClient, clientId };

  } catch (err) {
    console.error('Erro inesperado no handleRequest:', err);
    return { error: { message: `Erro interno do servidor: ${err.message}`, status: 500 } };
  }
}
