import { createClient } from '@supabase/supabase-js';

// Diagnostic function to validate environment variables
const validateConfig = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('Environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'Defined' : 'Undefined',
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Defined' : 'Undefined',
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION
  });

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not defined in .env file');
  }
  if (!supabaseKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not defined in .env file');
  }
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }
  console.log('Supabase configuration validated:', { supabaseUrl });
};

// Initialize Supabase client
let supabase = null;
try {
  validateConfig();
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error.message, error.stack);
  supabase = null; // Ensure supabase is null if initialization fails
}

// Export the client
export { supabase };