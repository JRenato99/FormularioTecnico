-- =========================================================
-- FUNCIÓN RPC: Verificación Global de Números de Serie
-- =========================================================
-- Esta función recibe un array de Números de Serie (S/N) o MACs
-- y busca en toda la tabla win_orders (dentro del JSONB de hardware_data)
-- si alguno de esos S/N ya ha sido instalado en otra orden.
-- Retorna el primer S/N duplicado que encuentre, o NULL si todos están libres.

CREATE OR REPLACE FUNCTION check_duplicate_sn(sn_list TEXT[])
RETURNS TEXT AS $$
DECLARE
  duplicate_sn TEXT;
BEGIN
  SELECT sn INTO duplicate_sn
  FROM (
    -- Extraer S/N de equipos (ONT, APs)
    SELECT e->>'serialNumber' AS sn
    FROM public.win_orders, jsonb_array_elements(hardware_data->'equipos') AS e
    WHERE jsonb_typeof(hardware_data->'equipos') = 'array'
    
    UNION ALL
    
    -- Extraer S/N de winboxes
    SELECT w->>'sn' AS sn
    FROM public.win_orders, jsonb_array_elements(hardware_data->'winboxes') AS w
    WHERE jsonb_typeof(hardware_data->'winboxes') = 'array'
  ) AS all_sn
  WHERE sn = ANY(sn_list) AND sn IS NOT NULL AND sn != ''
  LIMIT 1;

  RETURN duplicate_sn;
END;
$$ LANGUAGE plpgsql;
