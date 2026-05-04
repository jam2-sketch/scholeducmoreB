import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// We create a recursive proxy if keys are missing to avoid crashing at the top level
// but we'll throw a clear error when an actual operation/function call is attempted.
const createMissingConfigProxy = (path: string = 'supabase'): any => {
  const proxy = new Proxy(() => {}, {
    get: (target, prop) => {
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      return createMissingConfigProxy(`${path}.${String(prop)}`);
    },
    apply: () => {
      throw new Error(`Supabase configuration is missing. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Settings menu.`);
    }
  });
  return proxy;
};

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMissingConfigProxy();
