// Elige el backend: Supabase si config.js tiene los datos; si no (o con ?demo), modo demo.
import { CONFIG } from '../../config.js';
import { createDemoApi } from './demo.js';

export async function getApi() {
  const forceDemo = new URLSearchParams(location.search).has('demo');
  if (!forceDemo && CONFIG.supabaseUrl && CONFIG.supabaseKey) {
    const { createSupabaseApi } = await import('./supabase.js');
    return createSupabaseApi(CONFIG);
  }
  return createDemoApi();
}
