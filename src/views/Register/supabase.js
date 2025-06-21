import { createClient } from '@supabase/supabase-js';

// Diagnostic function to validate environment variables
const validateConfig = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  console.log('Environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'Defined' : 'Undefined',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Defined' : 'Undefined',
    VITE_SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey ? 'Defined' : 'Undefined',
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
  });

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not defined in .env file');
  }
  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not defined in .env file');
  }
  if (!supabaseServiceRoleKey) {
    console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY is not defined; admin operations may fail');
  }
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }
  console.log('Supabase configuration validated:', { supabaseUrl });
};

// Initialize Supabase clients
let supabase = null;
let supabaseAdmin = null;

try {
  validateConfig();

  // Regular client with anon key
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  console.log('Supabase client initialized successfully');

  // Admin client with service_role key (optional, for admin operations)
  if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('Supabase admin client initialized successfully');
  } else {
    console.warn('Supabase admin client not initialized due to missing service_role key');
  }
} catch (error) {
  console.error('Failed to initialize Supabase clients:', error.message, error.stack);
  supabase = null;
  supabaseAdmin = null;
}

// Export both clients
export { supabase, supabaseAdmin };