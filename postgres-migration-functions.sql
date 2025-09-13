-- Database Functions para PostgreSQL Externo
-- Execute este script no seu PostgreSQL para criar as funções necessárias

-- 1. Função para obter KPIs do dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date, org_filter text DEFAULT NULL::text, user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(configuracao_id integer, billing_period_start_date date, billing_period_end_date date, total_ipu numeric, active_orgs bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    cs.configuracao_id,
    cs.billing_period_start_date,
    cs.billing_period_end_date,
    SUM(cs.consumption_ipu) as total_ipu,
    COUNT(DISTINCT cs.org_id) as active_orgs
  FROM api_consumosummary cs
  WHERE cs.configuracao_id = ANY(config_ids)
    AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    AND (start_date IS NULL OR cs.billing_period_start_date >= start_date)
    AND (end_date IS NULL OR cs.billing_period_end_date <= end_date)
    AND (org_filter IS NULL OR cs.org_id = org_filter)
  GROUP BY cs.configuracao_id, cs.billing_period_start_date, cs.billing_period_end_date
  ORDER BY cs.billing_period_end_date DESC;
END;
$function$;

-- 2. Função para dados de evolução de custo
CREATE OR REPLACE FUNCTION public.get_cost_evolution_data(cycle_limit integer DEFAULT NULL::integer, org_filter text DEFAULT NULL::text, user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(billing_period_start_date date, billing_period_end_date date, org_id text, org_name character varying, consumption_ipu numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH unique_cycles AS (
    SELECT DISTINCT cs.billing_period_start_date, cs.billing_period_end_date
    FROM api_consumosummary cs
    WHERE cs.configuracao_id = ANY(config_ids)
      AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    ORDER BY cs.billing_period_end_date DESC
    LIMIT COALESCE(cycle_limit, 1000)
  )
  SELECT 
    cs.billing_period_start_date,
    cs.billing_period_end_date,
    cs.org_id,
    cs.org_name,
    SUM(cs.consumption_ipu) as consumption_ipu
  FROM api_consumosummary cs
  INNER JOIN unique_cycles uc ON cs.billing_period_start_date = uc.billing_period_start_date 
    AND cs.billing_period_end_date = uc.billing_period_end_date
  WHERE cs.configuracao_id = ANY(config_ids)
    AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    AND cs.consumption_ipu > 0
    AND (org_filter IS NULL OR cs.org_id = org_filter)
  GROUP BY cs.billing_period_start_date, cs.billing_period_end_date, cs.org_id, cs.org_name
  ORDER BY cs.billing_period_end_date DESC;
END;
$function$;

-- 3. Função para dados de períodos de billing
CREATE OR REPLACE FUNCTION public.get_billing_periods_data(cycle_limit integer DEFAULT NULL::integer, org_filter text DEFAULT NULL::text, user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(billing_period_start_date date, billing_period_end_date date, org_id text, org_name character varying, meter_name character varying, consumption_ipu numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH unique_cycles AS (
    SELECT DISTINCT cs.billing_period_start_date, cs.billing_period_end_date
    FROM api_consumosummary cs
    WHERE cs.configuracao_id = ANY(config_ids)
      AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    ORDER BY cs.billing_period_end_date DESC
    LIMIT COALESCE(cycle_limit, 1000)
  )
  SELECT 
    cs.billing_period_start_date,
    cs.billing_period_end_date,
    cs.org_id,
    cs.org_name,
    cs.meter_name,
    SUM(cs.consumption_ipu) as consumption_ipu
  FROM api_consumosummary cs
  INNER JOIN unique_cycles uc ON cs.billing_period_start_date = uc.billing_period_start_date 
    AND cs.billing_period_end_date = uc.billing_period_end_date
  WHERE cs.configuracao_id = ANY(config_ids)
    AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    AND cs.consumption_ipu > 0
    AND (org_filter IS NULL OR cs.org_id = org_filter)
  GROUP BY cs.billing_period_start_date, cs.billing_period_end_date, cs.org_id, cs.org_name, cs.meter_name
  ORDER BY cs.billing_period_end_date DESC;
END;
$function$;

-- 4. Função para detalhes das organizações
CREATE OR REPLACE FUNCTION public.get_organization_details_data(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date, user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(org_id text, org_name character varying, consumption_ipu numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    cs.org_id,
    cs.org_name,
    SUM(cs.consumption_ipu) as consumption_ipu
  FROM api_consumosummary cs
  WHERE cs.configuracao_id = ANY(config_ids)
    AND cs.consumption_ipu > 0
    AND (start_date IS NULL OR cs.billing_period_start_date >= start_date)
    AND (end_date IS NULL OR cs.billing_period_end_date <= end_date)
  GROUP BY cs.org_id, cs.org_name
  ORDER BY consumption_ipu DESC;
END;
$function$;

-- 5. Função para ciclos disponíveis
CREATE OR REPLACE FUNCTION public.get_available_cycles(user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(billing_period_start_date date, billing_period_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT
    cs.billing_period_start_date,
    cs.billing_period_end_date
  FROM api_consumosummary cs
  WHERE cs.configuracao_id = ANY(config_ids)
    AND cs.meter_name != 'Sandbox Organizations IPU Usage'
  ORDER BY cs.billing_period_end_date DESC;
END;
$function$;

-- 6. Função para distribuição de custo
CREATE OR REPLACE FUNCTION public.get_cost_distribution_data(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date, user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(org_id text, org_name character varying, consumption_ipu numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    cs.org_id,
    cs.org_name,
    SUM(cs.consumption_ipu) as consumption_ipu
  FROM api_consumosummary cs
  WHERE cs.configuracao_id = ANY(config_ids)
    AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    AND cs.consumption_ipu > 0
    AND (start_date IS NULL OR cs.billing_period_start_date >= start_date)
    AND (end_date IS NULL OR cs.billing_period_end_date <= end_date)
  GROUP BY cs.org_id, cs.org_name
  ORDER BY consumption_ipu DESC;
END;
$function$;

-- 7. Função para dados de consumo de projeto
CREATE OR REPLACE FUNCTION public.get_project_consumption_data(p_start_date date, p_end_date date, p_selected_project text DEFAULT NULL::text, user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(project_name text, consumption_date date, consumption_ipu numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_ids integer[];
BEGIN
  -- Get user's configuration IDs
  SELECT array_agg(c.id) INTO config_ids
  FROM api_configuracaoidmc c
  WHERE c.cliente_id = user_client_id;
  
  IF config_ids IS NULL THEN
    RETURN;
  END IF;
  
  -- Return all project consumption data within date range
  RETURN QUERY
  SELECT 
    asset.project_name,
    asset.consumption_date,
    asset.consumption_ipu
  FROM api_consumoasset asset
  WHERE asset.configuracao_id = ANY(config_ids)
    AND asset.project_name IS NOT NULL 
    AND asset.project_name != '' 
    AND asset.consumption_ipu > 0 
    AND asset.consumption_date >= p_start_date
    AND asset.consumption_date <= p_end_date
    AND (p_selected_project IS NULL OR asset.project_name = p_selected_project)
  ORDER BY asset.consumption_date DESC;
END;
$function$;

-- 8. Função para obter ciclos de billing com dados
CREATE OR REPLACE FUNCTION public.get_billing_cycles_with_data(config_ids integer[], user_client_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(ciclo_id integer, billing_period_start_date date, billing_period_end_date date, configuracao_id integer, has_consumption boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.ciclo_id,
    c.billing_period_start_date,
    c.billing_period_end_date,
    c.configuracao_id,
    CASE 
      WHEN s.total_consumption IS NOT NULL AND s.total_consumption > 0 THEN true
      ELSE false
    END as has_consumption
  FROM api_ciclofaturamento c
  LEFT JOIN (
    SELECT 
      billing_period_start_date,
      billing_period_end_date,
      configuracao_id,
      SUM(consumption_ipu) as total_consumption
    FROM api_consumosummary
    WHERE configuracao_id = ANY(config_ids)
    GROUP BY billing_period_start_date, billing_period_end_date, configuracao_id
  ) s ON c.billing_period_start_date = s.billing_period_start_date 
    AND c.billing_period_end_date = s.billing_period_end_date
    AND c.configuracao_id = s.configuracao_id
  WHERE c.configuracao_id = ANY(config_ids)
  ORDER BY c.billing_period_start_date ASC;
END;
$function$;