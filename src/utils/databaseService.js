import { supabase } from './supabaseClient';
import { getSession } from './authService';

const DRAFT_KEY = 'win_drafts';

// ─── MANEJO DE BORRADORES (OFFLINE-FIRST) ──────────────────────────────
export const saveDraft = (codigoCliente, data) => {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    drafts[codigoCliente] = { ...data, updatedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Error guardando borrador:', e);
  }
};

export const getDraft = (codigoCliente) => {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return drafts[codigoCliente] || null;
  } catch (e) {
    return null;
  }
};

export const clearDraft = (codigoCliente) => {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    delete drafts[codigoCliente];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch (e) {}
};

// ─── VALIDACIÓN DE HARDWARE GLOBAL ─────────────────────────────────────
export const checkHardwareUniqueness = async (equipos = [], winboxes = []) => {
  // Extraer todos los S/N del formulario actual que no estén vacíos
  const sns = [];
  
  equipos.forEach(eq => {
    if (eq.serialNumber && eq.serialNumber.trim() !== '') {
      sns.push(eq.serialNumber.trim());
    }
  });

  winboxes.forEach(wb => {
    if (wb.sn && wb.sn.trim() !== '') {
      sns.push(wb.sn.trim());
    }
  });

  if (sns.length === 0) return { ok: true };

  // Llamar a la función RPC en Supabase
  const { data, error } = await supabase.rpc('check_duplicate_sn', { sn_list: sns });
  
  if (error) {
    console.error('Error verificando S/N:', error);
    return { ok: false, error: 'Hubo un error de conexión al verificar los números de serie.' };
  }

  if (data) {
    return { ok: false, error: `El número de serie / MAC "${data}" ya se encuentra registrado en otra orden de instalación. Por favor, verifica el hardware.` };
  }

  return { ok: true };
};

// ─── OPERACIONES DE ÓRDENES (SUPABASE) ──────────────────────────────────
export const saveOrder = async (codigoCliente, formPayload) => {
  const session = getSession();
  if (!session || !session.id) return { success: false, error: 'No hay sesión activa.' };

  // 1. Verificación global de unicidad de S/N
  const uniquenessCheck = await checkHardwareUniqueness(formPayload.equipos, formPayload.winboxes);
  if (!uniquenessCheck.ok) {
    return { success: false, error: uniquenessCheck.error };
  }

  // 2. Preparar el Payload
  const hardwareData = {
    equipos: formPayload.equipos || [],
    winboxes: formPayload.winboxes || [],
    televisores: formPayload.televisores || []
  };

  const datosCliente = {
    ...formPayload.clienteInfo,
    mediciones: formPayload.mediciones || [] // Lo guardamos en datosCliente por simplicidad estructural
  };

  // 3. Upsert a Supabase (Actualizar si existe, insertar si no)
  // Nota: Buscamos si la orden ya existe por cod_pedido
  const { data: existing } = await supabase
    .from('win_orders')
    .select('id, estado')
    .eq('cod_pedido', codigoCliente)
    .single();

  if (existing && existing.estado !== 'PENDIENTE') {
    return { success: false, error: `Esta orden ya fue evaluada (Estado: ${existing.estado}). No se puede modificar.` };
  }

  let dbError;
  
  if (existing) {
    const res = await supabase.from('win_orders').update({
      hardware_data: hardwareData,
      datos_cliente: datosCliente,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
    dbError = res.error;
  } else {
    const res = await supabase.from('win_orders').insert([{
      cod_pedido: codigoCliente,
      tecnico_id: session.id,
      estado: 'PENDIENTE',
      hardware_data: hardwareData,
      datos_cliente: datosCliente
    }]);
    dbError = res.error;
  }

  if (dbError) {
    console.error('Error guardando orden:', dbError);
    return { success: false, error: dbError.message };
  }

  // 4. Limpiar borrador local si fue exitoso
  clearDraft(codigoCliente);
  
  return { success: true };
};

export const getOrders = async () => {
  // Las políticas RLS ya filtran lo que cada usuario puede ver.
  const { data, error } = await supabase
    .from('win_orders')
    .select(`
      *,
      tecnico:win_users!tecnico_id(email, cuadrilla, nombre)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error obteniendo órdenes:', error);
    return [];
  }
  
  // Mapeamos los datos de Supabase a la estructura que el Frontend de React ya espera
  return data.map(dbOrder => ({
    codigoCliente: dbOrder.cod_pedido,
    fechaGuardado: new Date(dbOrder.created_at).getTime(),
    fechaGestion: new Date(dbOrder.updated_at).getTime(),
    status: dbOrder.estado,
    tecnicoEmail: dbOrder.tecnico?.email || 'Desconocido',
    tecnicoCuadrilla: dbOrder.tecnico?.cuadrilla || 'Sin Cuadrilla',
    mediciones: dbOrder.datos_cliente?.mediciones || [],
    equipos: dbOrder.hardware_data?.equipos || [],
    winboxes: dbOrder.hardware_data?.winboxes || [],
    televisores: dbOrder.hardware_data?.televisores || []
  }));
};

export const updateOrderStatus = async (codigoCliente, nuevoEstado) => {
  const { error } = await supabase
    .from('win_orders')
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('cod_pedido', codigoCliente);

  if (error) return { success: false, error: error.message };
  return { success: true };
};
