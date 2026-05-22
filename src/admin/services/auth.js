import { supabase } from './supabase.js';

export async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await cargarRolUsuario(session.user.id);
    }
    return session;
}

export async function loginAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        throw new Error(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas.' : error.message);
    }
    await cargarRolUsuario(data.user.id);
    return data;
}

async function cargarRolUsuario(userId) {
    try {
        const { data, error } = await supabase.from('perfiles').select('rol').eq('id', userId).single();
        if (error) throw error;
        window.userRole = data.rol;
    } catch(err) {
        console.error("Error al cargar rol:", err);
        window.userRole = 'docente'; // Fallback seguro
    }
}

export async function logoutAdmin() {
    await supabase.auth.signOut();
}

export async function setSessionFromData(sessionData) {
    const { data, error } = await supabase.auth.setSession(sessionData);
    if (error) throw error;
    await cargarRolUsuario(data.user.id);
    return data;
}

