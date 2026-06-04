-- ============================================================================
-- HIGH-05: Endurecimiento de la RPC check_duplicate_sn
-- ============================================================================
-- Contexto:
--   El frontend llama a check_duplicate_sn(sn_list, exclude_cod_pedido) para
--   validar que un número de serie / MAC no exista ya en OTRA orden. Para que
--   esa comparación sea global la función corre como SECURITY DEFINER y por
--   tanto se salta las políticas RLS. Eso abre dos riesgos:
--     1. search_path injection: una función SECURITY DEFINER sin search_path
--        fijo puede ser engañada para ejecutar objetos de otro esquema.
--     2. Enumeración: cualquier usuario autenticado podría usarla como oráculo
--        para descubrir qué hardware existe en el sistema.
--
-- Este script aplica el endurecimiento que NO depende del cuerpo de la función
-- (no lo reescribe, para no romper la lógica de unicidad existente):
--   A) Fija un search_path seguro.
--   B) Revoca el permiso de ejecución a roles anónimos; solo 'authenticated'.
--
-- IMPORTANTE: ajustá la firma (tipos de argumentos) si difiere de la real.
-- Verificá la firma exacta con:
--   select p.proname, pg_get_function_identity_arguments(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where p.proname = 'check_duplicate_sn';
-- ----------------------------------------------------------------------------

-- A) search_path seguro (previene search_path injection en SECURITY DEFINER).
alter function public.check_duplicate_sn(text[], text)
  set search_path = public, pg_temp;

-- B) Restringir ejecución: fuera anónimos, solo usuarios autenticados.
revoke all on function public.check_duplicate_sn(text[], text) from public;
revoke all on function public.check_duplicate_sn(text[], text) from anon;
grant execute on function public.check_duplicate_sn(text[], text) to authenticated;

-- ----------------------------------------------------------------------------
-- RECOMENDACIÓN (fix de raíz, opcional pero preferible):
-- El oráculo de enumeración existe porque la unicidad se valida desde el
-- cliente. Lo ideal es MOVER la unicidad al servidor con un índice único sobre
-- los números de serie, de modo que el cliente no necesite consultar nada:
-- el INSERT/UPDATE falla solo si hay duplicado.
--
-- Ejemplo (requiere extraer los S/N a una columna o tabla normalizada):
--
--   create table win_order_serials (
--     sn          text primary key,
--     cod_pedido  text not null references win_orders(cod_pedido) on delete cascade
--   );
--
-- y poblarla con un trigger AFTER INSERT/UPDATE sobre win_orders que extraiga
-- los serialNumber de hardware_data->'equipos' y los sn de ->'winboxes'.
-- Con eso la unicidad la garantiza la PK y se puede eliminar la RPC.
-- ----------------------------------------------------------------------------
