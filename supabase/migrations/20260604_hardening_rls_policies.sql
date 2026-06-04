-- ============================================================================
-- Endurecimiento de políticas RLS (hallazgos de la re-validación con schema real)
-- ============================================================================
-- Aplicar en: Supabase → SQL Editor (o supabase db push).
-- Se puede ejecutar todo de una vez. Cada sección es independiente; si querés
-- ser conservador, corré 1-3, verificá la app, y luego corré la 4.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 1 — NUEVO-HIGH: un TECNICO podía MODIFICAR órdenes de OTROS técnicos
-- ----------------------------------------------------------------------------
-- La política de UPDATE solo exigía role='TECNICO' + estado, pero NO que la
-- orden fuera suya. Agregamos tecnico_id = auth.uid() a la rama de técnico.
-- Supervisor y Admin se mantienen sin cambios (pueden gestionar todas).
DROP POLICY IF EXISTS "Actualizacion de ordenes" ON public.win_orders;

CREATE POLICY "Actualizacion de ordenes" ON public.win_orders
FOR UPDATE USING (
  (
    (SELECT role FROM public.win_users WHERE id = auth.uid()) = 'TECNICO'
    AND tecnico_id = auth.uid()
    AND estado IN ('PENDIENTE', 'RECHAZADO')
  )
  OR ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'SUPERVISOR')
  OR ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR')
);


-- ============================================================================
-- SECCIÓN 2 — NUEVO-MEDIO: un TECNICO podía CREAR órdenes a nombre de otro
-- ----------------------------------------------------------------------------
-- La política de INSERT no validaba que tecnico_id fuera el propio usuario.
DROP POLICY IF EXISTS "Tecnico inserta ordenes" ON public.win_orders;

CREATE POLICY "Tecnico inserta ordenes" ON public.win_orders
FOR INSERT WITH CHECK (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) = 'TECNICO'
  AND tecnico_id = auth.uid()
);


-- ============================================================================
-- SECCIÓN 3 — NUEVO-MEDIO: logs de auditoría FALSIFICABLES
-- ----------------------------------------------------------------------------
-- La política de INSERT solo exigía estar autenticado, permitiendo inyectar
-- logs con cualquier actor_id (atribuir acciones a otros / spam). Forzamos que
-- el actor_id sea siempre el usuario real. El frontend ya envía
-- actor_id = id de la sesión, así que no rompe el registro legítimo.
DROP POLICY IF EXISTS "Insercion de logs" ON public.win_audit_logs;

CREATE POLICY "Insercion de logs" ON public.win_audit_logs
FOR INSERT WITH CHECK (actor_id = auth.uid());


-- ============================================================================
-- SECCIÓN 4 — NUEVO-BAJO: cualquier usuario veía la lista COMPLETA de usuarios
-- ----------------------------------------------------------------------------
-- win_users permitía SELECT a todo autenticado (emails/roles/cuadrillas de
-- todos). Lo limitamos a: tu propia fila, o todos si sos SUPERVISOR/ADMIN.
--
-- IMPORTANTE: una política sobre win_users que consulte win_users provoca
-- "infinite recursion detected in policy". Por eso usamos una función
-- SECURITY DEFINER que lee el rol SIN disparar RLS (rompe la recursión).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT role FROM public.win_users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "Lectura de usuarios" ON public.win_users;

CREATE POLICY "Lectura de usuarios" ON public.win_users
FOR SELECT USING (
  id = auth.uid()
  OR public.current_user_role() IN ('ADMINISTRADOR', 'SUPERVISOR')
);
