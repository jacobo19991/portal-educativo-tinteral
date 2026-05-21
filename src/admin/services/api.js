import { supabase } from './supabase.js';

export async function fetchCatalogo() {
    // Usamos el endpoint cacheador del frontend público para lectura rápida
    const res = await fetch('/api/materias');
    if (!res.ok) throw new Error('Error al cargar la base de datos');
    const data = await res.json();
    return data.niveles || [];
}

export async function peticionAdmin(action, payload) {
    let error, data;

    switch (action) {
        case 'ADD_MATERIA':
            ({ data, error } = await supabase.from('materias').insert([payload]));
            break;
        case 'EDIT_MATERIA':
            ({ data, error } = await supabase.from('materias').update(payload).eq('id', payload.id));
            break;
        case 'DELETE_MATERIA':
            ({ data, error } = await supabase.from('materias').delete().eq('id', payload.id));
            break;
        default:
            throw new Error('Acción no reconocida');
    }

    if (error) {
        throw new Error(error.message);
    }
    return data;
}
