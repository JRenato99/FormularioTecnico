-- ==============================================================================
-- SISTEMA DE FORMULARIO TÉCNICO WIN - ESQUEMA DE BASE DE DATOS
-- ==============================================================================

-- 1. TABLAS PRINCIPALES
-- ------------------------------------------------------------------------------

-- Tabla de Usuarios Extendida (Se enlaza con auth.users)
CREATE TABLE public.win_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMINISTRADOR', 'SUPERVISOR', 'TECNICO')),
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'BLOQUEADO')),
    cuadrilla TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Órdenes (Formularios)
CREATE TABLE public.win_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cod_pedido TEXT UNIQUE NOT NULL,
    tecnico_id UUID NOT NULL REFERENCES public.win_users(id),
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    motivo_rechazo TEXT,
    datos_cliente JSONB NOT NULL DEFAULT '{}'::jsonb,
    hardware_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Logs de Auditoría (Intocable)
CREATE TABLE public.win_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.win_users(id) ON DELETE SET NULL, -- Quien hizo la acción
    accion TEXT NOT NULL,
    entidad_afectada TEXT NOT NULL, -- Ej: 'ORDER', 'USER', 'SYSTEM'
    entidad_id TEXT, -- ID de la orden o usuario que fue alterado
    old_data JSONB,
    new_data JSONB,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BUCKET DE STORAGE (Archivos PDF / Imágenes)
-- ------------------------------------------------------------------------------
-- NOTA: Esto crea el bucket "reportes_tecnicos" como PRIVADO
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reportes_tecnicos', 'reportes_tecnicos', false)
ON CONFLICT (id) DO NOTHING;

-- 3. SEGURIDAD A NIVEL DE FILAS (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.win_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para win_users
-- Lectura: Todos los autenticados pueden ver la lista de usuarios
CREATE POLICY "Lectura de usuarios" ON public.win_users 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin inserta usuarios" ON public.win_users 
FOR INSERT WITH CHECK ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR');

CREATE POLICY "Admin actualiza usuarios" ON public.win_users 
FOR UPDATE USING ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR');

CREATE POLICY "Admin elimina usuarios" ON public.win_users 
FOR DELETE USING ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR');

-- Políticas para win_orders
-- Lectura: SUPERVISOR y ADMIN ven todas. TECNICO solo ve las suyas.
CREATE POLICY "Lectura de ordenes" ON public.win_orders 
FOR SELECT USING (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) IN ('ADMINISTRADOR', 'SUPERVISOR') 
  OR tecnico_id = auth.uid()
);

-- Inserción: Solo TECNICOS pueden crear nuevas órdenes
CREATE POLICY "Tecnico inserta ordenes" ON public.win_orders 
FOR INSERT WITH CHECK (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) = 'TECNICO'
);

-- Actualización: TECNICO puede editar si está PENDIENTE o RECHAZADO. SUPERVISOR o ADMIN pueden cambiar estado.
CREATE POLICY "Actualizacion de ordenes" ON public.win_orders 
FOR UPDATE USING (
  ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'TECNICO' AND estado IN ('PENDIENTE', 'RECHAZADO'))
  OR ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'SUPERVISOR')
  OR ((SELECT role FROM public.win_users WHERE id = auth.uid()) = 'ADMINISTRADOR')
);

-- Políticas para win_audit_logs (La más estricta)
-- Lectura: Solo ADMIN (y tal vez SUPERVISOR) puede ver los logs.
CREATE POLICY "Lectura de logs por admin" ON public.win_audit_logs 
FOR SELECT USING (
  (SELECT role FROM public.win_users WHERE id = auth.uid()) IN ('ADMINISTRADOR', 'SUPERVISOR')
);

-- Inserción: Cualquiera autenticado puede registrar un log (el frontend lo dispara)
CREATE POLICY "Insercion de logs" ON public.win_audit_logs 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Actualización/Borrado: NADIE puede borrar un log. (Intencionalmente SIN políticas de Update o Delete)

-- 4. TRIGGERS AUTOMÁTICOS
-- ------------------------------------------------------------------------------
-- Actualizar 'updated_at' en win_orders automáticamente al guardar
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_win_orders_modtime
BEFORE UPDATE ON public.win_orders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ==============================================================================
-- FUNCIÓN RPC: Verificación Global de Números de Serie
-- ==============================================================================
-- Esta función recibe un array de Números de Serie (S/N) o MACs
-- y busca en toda la tabla win_orders (dentro del JSONB de hardware_data)
-- si alguno de esos S/N ya ha sido instalado en otra orden.
-- Se añade el parámetro exclude_cod_pedido para evitar falso positivo al editar.

CREATE OR REPLACE FUNCTION check_duplicate_sn(sn_list TEXT[], exclude_cod_pedido TEXT DEFAULT NULL)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;
