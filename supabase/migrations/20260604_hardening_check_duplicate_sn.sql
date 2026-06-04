-- ============================================================================
-- HIGH-05 (CORREGIDO con la definición real de check_duplicate_sn)
-- ============================================================================
-- CORRECCIÓN DEL DIAGNÓSTICO ORIGINAL:
--   El reporte inicial asumió que la función era SECURITY DEFINER y advertía
--   un riesgo de "enumeración" de números de serie. Al revisar la definición
--   real (schema.sql) se confirma que la función NO declara SECURITY DEFINER,
--   por lo que corre como SECURITY INVOKER (default) y RESPETA las políticas
--   RLS de win_orders.
--
--   Consecuencia REAL (más relevante que la enumeración):
--     * Para un TECNICO, la política RLS "Lectura de ordenes" solo expone SUS
--       propias órdenes. Como la función corre con sus permisos, el chequeo de
--       unicidad "global" en realidad NO ve las órdenes de otros técnicos:
--       => el control de S/N duplicados está silenciosamente ROTO entre técnicos.
--       Un técnico podría registrar un equipo (S/N/MAC) ya instalado por otro.
--     * El oráculo de enumeración reportado NO aplica con SECURITY INVOKER.
--
-- FIX:
--   La función debe ver TODA la tabla para cumplir su propósito documentado
--   ("busca en toda la tabla win_orders"). Por eso pasa a SECURITY DEFINER con
--   search_path fijo (previene search_path injection) y EXECUTE restringido a
--   usuarios autenticados. Así la unicidad vuelve a ser realmente global.
--
--   Tradeoff aceptado: un usuario autenticado puede verificar si un S/N que ya
--   tiene en la mano está registrado (uso legítimo del formulario). Los S/N son
--   de alta entropía, por lo que no son enumerables a ciegas de forma práctica.
--
-- Aplicar en: Supabase → SQL Editor (o supabase db push).
-- ----------------------------------------------------------------------------

-- Eliminar ambas firmas existentes (la antigua de 1 parámetro y la de 2).
DROP FUNCTION IF EXISTS public.check_duplicate_sn(text[]);
DROP FUNCTION IF EXISTS public.check_duplicate_sn(text[], text);

CREATE OR REPLACE FUNCTION public.check_duplicate_sn(
    sn_list TEXT[],
    exclude_cod_pedido TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER                       -- ve toda la tabla: unicidad realmente global
SET search_path = public, pg_temp      -- evita search_path injection en SECURITY DEFINER
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

        -- Extraer S/N de winboxes
        SELECT w ->> 'sn' AS sn, cod_pedido
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

-- Restringir ejecución: fuera anónimos; solo usuarios autenticados.
REVOKE ALL ON FUNCTION public.check_duplicate_sn(text[], text) FROM public;
REVOKE ALL ON FUNCTION public.check_duplicate_sn(text[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_duplicate_sn(text[], text) TO authenticated;
