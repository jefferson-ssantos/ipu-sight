-- Create function to get dashboard KPIs with virtual tag filtering
CREATE OR REPLACE FUNCTION get_dashboard_kpis_with_virtual_tag(
  start_date text DEFAULT NULL,
  end_date text DEFAULT NULL,
  org_filter text DEFAULT NULL,
  virtual_tag_filter text DEFAULT NULL
)
RETURNS TABLE (
  total_cost numeric,
  total_ipu numeric,
  active_orgs bigint,
  avg_daily_cost numeric,
  total_executions bigint,
  avg_execution_time numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  filtered_config_ids integer[];
  filtered_asset_ids text[];
BEGIN
  -- Get user's configuration IDs
  SELECT ARRAY(
    SELECT ac.id 
    FROM api_configuracaoidmc ac
    JOIN profiles p ON p.cliente_id = ac.cliente_id
    WHERE p.id = auth.uid()
  ) INTO filtered_config_ids;

  -- If virtual tag filter is specified, get matching assets
  IF virtual_tag_filter IS NOT NULL THEN
    WITH virtual_tag_rules AS (
      SELECT vtr.id as rule_id, vtra.action_type, vtra.custom_value, vtra.megabill_key
      FROM virtual_tag_rules vtr
      JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
      JOIN virtual_tag_rule_actions vtra ON vtra.rule_id = vtr.id
      WHERE vt.id = virtual_tag_filter::uuid 
        AND vt.active = true 
        AND vtr.active = true
        AND vt.configuracao_id = ANY(filtered_config_ids)
    ),
    virtual_tag_conditions AS (
      SELECT vtrc.rule_id, vtrc.field_name, vtrc.operator, vtrc.values, vtrc.logical_operator
      FROM virtual_tag_rule_conditions vtrc
      JOIN virtual_tag_rules vtr ON vtrc.rule_id = vtr.id
      JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
      WHERE vt.id = virtual_tag_filter::uuid
        AND vt.active = true 
        AND vtr.active = true
        AND vt.configuracao_id = ANY(filtered_config_ids)
    )
    SELECT ARRAY(
      SELECT DISTINCT CONCAT(ca.project_name, '|', ca.asset_name, '|', ca.meter_id)
      FROM api_consumoasset ca
      JOIN virtual_tag_conditions vtc ON true
      WHERE ca.configuracao_id = ANY(filtered_config_ids)
        AND (
          (vtc.field_name = 'project_name' AND ca.project_name = ANY(vtc.values))
          OR (vtc.field_name = 'asset_name' AND ca.asset_name = ANY(vtc.values))
          OR (vtc.field_name = 'meter_id' AND ca.meter_id = ANY(vtc.values))
          OR (vtc.field_name = 'asset_type' AND ca.asset_type = ANY(vtc.values))
        )
    ) INTO filtered_asset_ids;
  END IF;

  RETURN QUERY
  WITH consumption_data AS (
    SELECT 
      cs.consumption_ipu,
      cs.org_id,
      cs.meter_name,
      cs.billing_period_start_date,
      cs.billing_period_end_date
    FROM api_consumosummary cs
    WHERE cs.configuracao_id = ANY(filtered_config_ids)
      AND cs.consumption_ipu > 0
      AND (start_date IS NULL OR cs.billing_period_start_date >= start_date::date)
      AND (end_date IS NULL OR cs.billing_period_end_date <= end_date::date)
      AND (org_filter IS NULL OR cs.org_id = org_filter)
      AND cs.meter_name != 'Sandbox Organizations IPU Usage'
      AND (
        virtual_tag_filter IS NULL 
        OR CONCAT(cs.org_id, '|', cs.meter_name, '|', cs.meter_id) = ANY(filtered_asset_ids)
      )
  ),
  client_pricing AS (
    SELECT c.preco_por_ipu, c.qtd_ipus_contratadas
    FROM api_clientes c
    JOIN profiles p ON p.cliente_id = c.id
    WHERE p.id = auth.uid()
    LIMIT 1
  )
  SELECT 
    COALESCE(SUM(cd.consumption_ipu) * cp.preco_por_ipu, 0) as total_cost,
    COALESCE(SUM(cd.consumption_ipu), 0) as total_ipu,
    COUNT(DISTINCT cd.org_id) as active_orgs,
    CASE 
      WHEN COUNT(DISTINCT cd.billing_period_start_date) > 0 
      THEN COALESCE(SUM(cd.consumption_ipu) * cp.preco_por_ipu, 0) / COUNT(DISTINCT cd.billing_period_start_date)
      ELSE 0 
    END as avg_daily_cost,
    0::bigint as total_executions,
    0::numeric as avg_execution_time
  FROM consumption_data cd
  CROSS JOIN client_pricing cp;
END;
$$;