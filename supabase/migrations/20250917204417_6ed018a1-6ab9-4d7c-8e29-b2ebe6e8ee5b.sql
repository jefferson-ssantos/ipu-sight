-- Fix get_cost_evolution_data_with_virtual_tag function with correct CTE references
CREATE OR REPLACE FUNCTION public.get_cost_evolution_data_with_virtual_tag(
  cycle_limit integer DEFAULT NULL::integer,
  org_filter text DEFAULT NULL::text,
  virtual_tag_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  billing_period_start_date date,
  billing_period_end_date date,
  consumption_ipu numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
      SELECT vtr.id AS rule_id
      FROM virtual_tag_rules vtr
      JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
      WHERE vt.id = virtual_tag_filter::uuid
        AND vt.active = true
        AND vtr.active = true
        AND vt.configuracao_id = ANY(filtered_config_ids)
    ),
    virtual_tag_conditions AS (
      SELECT vtrc.rule_id, vtrc.field_name, vtrc.operator, vtrc.values
      FROM virtual_tag_rule_conditions vtrc
      WHERE vtrc.rule_id IN (SELECT rule_id FROM virtual_tag_rules)
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
  WITH ordered_data AS (
    SELECT
      cs.billing_period_start_date,
      cs.billing_period_end_date,
      SUM(cs.consumption_ipu) AS consumption_ipu
    FROM api_consumosummary cs
    WHERE cs.configuracao_id = ANY(filtered_config_ids)
      AND cs.consumption_ipu > 0
      AND (org_filter IS NULL OR cs.org_id = org_filter)
      AND cs.meter_name != 'Sandbox Organizations IPU Usage'
      AND (
        virtual_tag_filter IS NULL
        OR CONCAT(cs.org_id, '|', cs.meter_name, '|', cs.meter_id) = ANY(filtered_asset_ids)
      )
    GROUP BY cs.billing_period_start_date, cs.billing_period_end_date
    ORDER BY cs.billing_period_end_date DESC
  )
  SELECT
    od.billing_period_start_date,
    od.billing_period_end_date,
    od.consumption_ipu
  FROM ordered_data od
  LIMIT COALESCE(cycle_limit, 1000);
END;
$function$;