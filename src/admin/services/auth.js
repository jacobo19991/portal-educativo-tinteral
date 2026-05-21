import { supabase } from './supabase.js';

export async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function loginAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        throw new Error(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas.' : error.message);
    }
    return data;
}

export async function logoutAdmin() {
    await supabase.auth.signOut();
}
