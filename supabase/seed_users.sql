-- Ejecuta este script en el SQL Editor de Supabase para enlazar 
-- los usuarios que creaste manualmente en la pestaña Authentication 
-- hacia nuestra tabla segura "win_users" con sus respectivos roles.

INSERT INTO public.win_users (id, email, nombre, role, estado, cuadrilla)
SELECT id, email, 'Administrador', 'ADMINISTRADOR', 'ACTIVO', NULL
FROM auth.users WHERE email = 'admin@win.pe'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.win_users (id, email, nombre, role, estado, cuadrilla)
SELECT id, email, 'Supervisor', 'SUPERVISOR', 'ACTIVO', 'LIMA-NTE-01'
FROM auth.users WHERE email = 'super@win.pe'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.win_users (id, email, nombre, role, estado, cuadrilla)
SELECT id, email, 'Técnico Principal', 'TECNICO', 'ACTIVO', 'LIMA-NTE-01'
FROM auth.users WHERE email = 'tecnico@win.pe'
ON CONFLICT (id) DO NOTHING;
