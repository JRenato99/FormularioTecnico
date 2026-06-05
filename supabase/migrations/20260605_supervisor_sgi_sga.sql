-- ============================================================================
-- Clasificación de Supervisores: SGI (Instalación Nueva) / SGA (Post-Venta)
-- ============================================================================
-- Aplicar en: Supabase → SQL Editor (o supabase db push).
-- Idempotente: se puede ejecutar más de una vez sin romper nada.
--
-- ORDEN DE DESPLIEGUE:
--   1) Ejecutar ESTA migración.
--   2) Asignar el tipo a los supervisores existentes (SECCIÓN 5, abajo).
--   3) Recién después desplegar el frontend.
-- Si se despliega el frontend antes de asignar tipos, los supervisores
-- existentes quedan con supervisor_tipo = NULL y NO verán ninguna orden.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 1 — Nueva columna supervisor_tipo en win_users
-- ----------------------------------------------------------------------------
-- Nullable: ADMINISTRADOR y TECNICO quedan en NULL. La obligatoriedad para
-- SUPERVISOR se hace cumplir en el frontend + RLS (no con NOT NULL, porque
-- los otros roles legítimamente son NULL).
ALTER TABLE public.win_users
  ADD COLUMN IF NOT EXISTS supervisor_tipo TEXT
  CHECK (supervisor_tipo IN ('SGI', 'SGA'));


-- ============================================================================
-- SECCIÓN 2 — Función SECURITY DEFINER para leer el tipo sin recursión RLS
-- ----------------------------------------------------------------------------
-- Análoga a current_user_role(). Una política sobre win_orders que consulte
-- win_users directamente con subquery funciona, pero usamos la función por
-- consistencia con el patrón existente y para romper cualquier recursión.
CREATE OR REPLACE FUNCTION public.current_user_supervisor_tipo()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT supervisor_tipo FROM public.win_users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_supervisor_tipo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_supervisor_tipo() TO authenticated;


-- ============================================================================
-- SECCIÓN 3 — Política de LECTURA filtrada por tipo de supervisor
-- ----------------------------------------------------------------------------
-- ADMINISTRADOR ve todas. TECNICO ve solo las suyas.
-- SUPERVISOR SGI ve solo 'Instalación Nueva' (incluye órdenes antiguas sin el
-- campo tipoServicio, vía COALESCE al default histórico).
-- SUPERVISOR SGA ve solo 'Post-Venta'.
DROP POLICY IF EXISTS "Lectura de ordenes" ON public.win_orders;

CREATE POLICY "Lectura de ordenes" ON public.win_orders
FOR SELECT USING (
  public.current_user_role() = 'ADMINISTRADOR'
  OR tecnico_id = auth.uid()
  OR (
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'SGI'
    AND COALESCE(datos_cliente ->> 'tipoServicio', 'Instalación Nueva') = 'Instalación Nueva'
  )
  OR (
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'SGA'
    AND datos_cliente ->> 'tipoServicio' = 'Post-Venta'
  )
);


-- ============================================================================
-- SECCIÓN 4 — Política de ACTUALIZACIÓN con la misma separación por tipo
-- ----------------------------------------------------------------------------
-- Evita que un SGA pueda aprobar/rechazar órdenes SGI (o viceversa) vía API.
-- Mantiene la rama de TECNICO endurecida (tecnico_id = auth.uid()) de la
-- migración 20260604_hardening_rls_policies.sql.
DROP POLICY IF EXISTS "Actualizacion de ordenes" ON public.win_orders;

CREATE POLICY "Actualizacion de ordenes" ON public.win_orders
FOR UPDATE USING (
  (
    public.current_user_role() = 'TECNICO'
    AND tecnico_id = auth.uid()
    AND estado IN ('PENDIENTE', 'RECHAZADO')
  )
  OR public.current_user_role() = 'ADMINISTRADOR'
  OR (
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'SGI'
    AND COALESCE(datos_cliente ->> 'tipoServicio', 'Instalación Nueva') = 'Instalación Nueva'
  )
  OR (
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'SGA'
    AND datos_cliente ->> 'tipoServicio' = 'Post-Venta'
  )
);


-- ============================================================================
-- SECCIÓN 5 — Asignar tipo a los supervisores YA existentes (PASO MANUAL)
-- ----------------------------------------------------------------------------
-- Edita los emails reales y descomenta. Cada supervisor DEBE tener un tipo
-- o no verá ninguna orden.
--
-- UPDATE public.win_users SET supervisor_tipo = 'SGI' WHERE email = 'supervisor_sgi@win.pe';
-- UPDATE public.win_users SET supervisor_tipo = 'SGA' WHERE email = 'supervisor_sga@win.pe';
--
-- Para listar los supervisores actuales y su tipo:
--   SELECT email, role, supervisor_tipo FROM public.win_users WHERE role = 'SUPERVISOR';
