-- =========================================================
-- SCRIPT DE CORRECCIÓN DE POLÍTICAS (RLS)
-- =========================================================

-- 1. ELIMINAR LAS POLÍTICAS ANTIGUAS (Evita conflictos)
DROP POLICY IF EXISTS "Lectura de usuarios" ON public.win_users;
DROP POLICY IF EXISTS "Admin gestiona usuarios" ON public.win_users;
DROP POLICY IF EXISTS "Lectura de ordenes" ON public.win_orders;
DROP POLICY IF EXISTS "Tecnico inserta ordenes" ON public.win_orders;
DROP POLICY IF EXISTS "Actualizacion de ordenes" ON public.win_orders;
DROP POLICY IF EXISTS "Lectura de logs por admin" ON public.win_audit_logs;
DROP POLICY IF EXISTS "Insercion de logs" ON public.win_audit_logs;

-- 2. RECREAR POLÍTICAS PARA WIN_USERS (Sin recursión infinita)
CREATE POLICY "Lectura de usuarios" ON public.win_users 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin inserta usuarios" ON public.win_users 
FOR INSERT WITH CHECK ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR');

CREATE POLICY "Admin actualiza usuarios" ON public.win_users 
FOR UPDATE USING ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR');

CREATE POLICY "Admin elimina usuarios" ON public.win_users 
FOR DELETE USING ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR');

-- 3. RECREAR POLÍTICAS PARA WIN_ORDERS (Usando ADMINISTRADOR)
CREATE POLICY "Lectura de ordenes" ON public.win_orders 
FOR SELECT USING (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) IN ('ADMINISTRADOR', 'SUPERVISOR') 
  OR tecnico_id = auth.uid()
);

CREATE POLICY "Tecnico inserta ordenes" ON public.win_orders 
FOR INSERT WITH CHECK (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) = 'TECNICO'
);

CREATE POLICY "Actualizacion de ordenes" ON public.win_orders 
FOR UPDATE USING (
  ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'TECNICO' AND estado = 'PENDIENTE')
  OR ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'SUPERVISOR')
  OR ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR')
);

-- 4. RECREAR POLÍTICAS PARA WIN_AUDIT_LOGS
CREATE POLICY "Lectura de logs por admin" ON public.win_audit_logs 
FOR SELECT USING (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) IN ('ADMINISTRADOR', 'SUPERVISOR')
);

CREATE POLICY "Insercion de logs" ON public.win_audit_logs 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
