-- Fix: check_duplicate_sn usaba 'sn' para winboxes, pero el campo en JSONB es 'serialNumber'.
-- Esto hacía que los S/N de WINBOX nunca se verificaran por duplicado.

CREATE OR REPLACE FUNCTION public.check_duplicate_sn(
    sn_list TEXT[],
    exclude_cod_pedido TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    duplicate_sn TEXT;
BEGIN
    SELECT sn INTO duplicate_sn
    FROM (
        -- Extraer S/N de equipos (ONT, APs)
        SELECT e ->> 'serialNumber' AS sn, cod_pedido
        FROM public.win_orders, jsonb_array_elements(hardware_data -> 'equipos') AS e
        WHERE jsonb_typeof(hardware_data -> 'equipos') = 'array'

        UNION ALL

        -- Extraer S/N de winboxes  ← FIX: era 'sn', ahora es 'serialNumber'
        SELECT w ->> 'serialNumber' AS sn, cod_pedido
        FROM public.win_orders, jsonb_array_elements(hardware_data -> 'winboxes') AS w
        WHERE jsonb_typeof(hardware_data -> 'winboxes') = 'array'
    ) AS all_sn
    WHERE sn = ANY(sn_list)
      AND sn IS NOT NULL
      AND sn != ''
      AND (exclude_cod_pedido IS NULL OR cod_pedido != exclude_cod_pedido)
    LIMIT 1;

    RETURN duplicate_sn;
END;
$$;

-- Mantener los permisos existentes
REVOKE ALL ON FUNCTION public.check_duplicate_sn(TEXT[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_duplicate_sn(TEXT[], TEXT) TO authenticated;
