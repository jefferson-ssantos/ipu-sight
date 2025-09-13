import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

// PostgreSQL connection utility
class PostgresConnection {
  private static instance: PostgresConnection;
  private client: any = null;

  private constructor() {}

  public static getInstance(): PostgresConnection {
    if (!PostgresConnection.instance) {
      PostgresConnection.instance = new PostgresConnection();
    }
    return PostgresConnection.instance;
  }

  async connect() {
    if (this.client) {
      return this.client;
    }

    try {
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      
      this.client = new Client({
        user: Deno.env.get('POSTGRES_USER'),
        password: Deno.env.get('POSTGRES_PASSWORD'),
        database: Deno.env.get('POSTGRES_DB'),
        hostname: Deno.env.get('POSTGRES_HOST'),
        port: parseInt(Deno.env.get('POSTGRES_PORT') || '5432'),
        tls: {
          enforce: Deno.env.get('POSTGRES_SSL_MODE') === 'require',
          caCertificates: [],
        },
      });

      await this.client.connect();
      console.log('Connected to PostgreSQL successfully');
      return this.client;
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async query(text: string, params: any[] = []) {
    const client = await this.connect();
    try {
      const result = await client.queryObject(text, params);
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw error;
    }
  }
}

// Utility function to validate JWT from Supabase
async function validateSupabaseJWT(authHeader: string | null) {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = "https://eiuyzzrhlwzflxczdctb.supabase.co";
  const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdXl6enJobHd6Zmx4Y3pkY3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjM3OTAsImV4cCI6MjA3MDgzOTc5MH0.OEvgT05a26JT-_YIrgRI7TPJOB7K1FrssJGTT-5amIA";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

// Utility function to get user's client_id
async function getUserClientId(user: any) {
  const postgres = PostgresConnection.getInstance();
  const result = await postgres.query(
    'SELECT cliente_id FROM profiles WHERE id = $1',
    [user.id]
  );
  
  if (!result || result.length === 0) {
    throw new Error('User profile not found');
  }
  
  return result[0].cliente_id;
}

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