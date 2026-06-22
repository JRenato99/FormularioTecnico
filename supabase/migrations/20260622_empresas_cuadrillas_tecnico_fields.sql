-- Migración: Empresas contratistas, cuadrillas por empresa,
-- y campos adicionales de técnico (empresa_id, dni, telefono)
-- + corrección de consistencia + índices de performance

-- 1. Tabla de empresas contratistas
CREATE TABLE public.win_empresas (
  id      SERIAL PRIMARY KEY,
  nombre  TEXT   UNIQUE NOT NULL,
  activo  BOOLEAN NOT NULL DEFAULT true
);

-- 2. Tabla de cuadrillas vinculadas a una empresa
CREATE TABLE public.win_cuadrillas (
  id         SERIAL PRIMARY KEY,
  empresa_id INT  NOT NULL REFERENCES public.win_empresas(id) ON DELETE CASCADE,
  codigo     TEXT NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (empresa_id, codigo)
);

-- 3. Nuevas columnas en win_users (nullable → backward compat con usuarios existentes)
ALTER TABLE public.win_users
  ADD COLUMN empresa_id INT  REFERENCES public.win_empresas(id),
  ADD COLUMN dni        TEXT,
  ADD COLUMN telefono   TEXT;

-- 4. Corrección de consistencia: supervisores y admins no deben tener cuadrilla
UPDATE public.win_users
SET cuadrilla = NULL
WHERE role IN ('SUPERVISOR', 'ADMINISTRADOR');

-- 5. RLS: cualquier usuario autenticado puede leer empresas y cuadrillas (para los combos)
ALTER TABLE public.win_empresas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_cuadrillas  ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon y authenticated): necesaria para los combos en el Login
CREATE POLICY "Lectura publica" ON public.win_empresas
  FOR SELECT USING (true);

CREATE POLICY "Lectura publica" ON public.win_cuadrillas
  FOR SELECT USING (true);

-- Escritura solo para ADMINISTRADOR
CREATE POLICY "Admin gestiona empresas" ON public.win_empresas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.win_users WHERE id = auth.uid() AND role = 'ADMINISTRADOR'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.win_users WHERE id = auth.uid() AND role = 'ADMINISTRADOR'));

CREATE POLICY "Admin gestiona cuadrillas" ON public.win_cuadrillas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.win_users WHERE id = auth.uid() AND role = 'ADMINISTRADOR'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.win_users WHERE id = auth.uid() AND role = 'ADMINISTRADOR'));

-- 6. Índices de performance (ayudan cuando crezcan los datos)
CREATE INDEX win_orders_tecnico_id_idx ON public.win_orders (tecnico_id);
CREATE INDEX win_orders_estado_idx     ON public.win_orders (estado, created_at DESC);
CREATE INDEX win_audit_logs_actor_idx  ON public.win_audit_logs (actor_id, created_at DESC);

-- 7. Datos semilla
INSERT INTO public.win_empresas (nombre) VALUES ('DIGETEL');

INSERT INTO public.win_cuadrillas (empresa_id, codigo)
  SELECT id, unnest(ARRAY['D1','D4','D7','D8'])
  FROM public.win_empresas
  WHERE nombre = 'DIGETEL';
