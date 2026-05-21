import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Estas llaves son públicas (Anon Key) y es totalmente seguro tenerlas aquí.
// La seguridad real ocurre en el servidor de Supabase mediante las políticas RLS.
const supabaseUrl = 'https://zsfimkuvapbyssjdhddh.supabase.co';
const supabaseKey = 'sb_publishable_Kpkr1tKPJ1xPnoXtLM8H_w_xKvng6y_';

export const supabase = createClient(supabaseUrl, supabaseKey);
