-- Create a function to get billing cycles with consumption data
CREATE OR REPLACE FUNCTION get_billing_cycles_with_data(config_ids integer[])
RETURNS TABLE (
  ciclo_id integer,
  billing_period_start_date date,
  billing_period_end_date date,
  configuracao_id integer,
  has_consumption boolean
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;