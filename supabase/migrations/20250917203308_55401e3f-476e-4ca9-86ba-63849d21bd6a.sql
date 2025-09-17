-- Fix result types and search_path in get_organization_details_data_with_virtual_tag
CREATE OR REPLACE FUNCTION public.get_organization_details_data_with_virtual_tag(org_filter text DEFAULT NULL::text, virtual_tag_filter text DEFAULT NULL::text)
RETURNS TABLE(org_id text, org_name text, total_consumption_ipu numeric, meter_count bigint)
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
      SELECT vtr.id as rule_id
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
  SELECT 
    cs.org_id::text,
    COALESCE(cs.org_name::text, cs.org_id::text) as org_name,
    SUM(cs.consumption_ipu) as total_consumption_ipu,
    COUNT(DISTINCT cs.meter_id) as meter_count
  FROM api_consumosummary cs
  WHERE cs.configuracao_id = ANY(filtered_config_ids)
    AND cs.consumption_ipu > 0
    AND (org_filter IS NULL OR cs.org_id = org_filter)
    AND cs.meter_name != 'Sandbox Organizations IPU Usage'
    AND (
      virtual_tag_filter IS NULL 
      OR CONCAT(cs.org_id, '|', cs.meter_name, '|', cs.meter_id) = ANY(filtered_asset_ids)
    )
  GROUP BY cs.org_id, cs.org_name
  HAVING SUM(cs.consumption_ipu) > 0
  ORDER BY total_consumption_ipu DESC;
END;
$function$;