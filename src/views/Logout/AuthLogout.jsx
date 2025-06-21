import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
  IconButton
} from '@mui/material';
import FileCopy from '@mui/icons-material/FileCopy';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from './supabase';

// Centralized Error Logging Utility
const logError = (context, error, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code,
    status: error.status,
    details: error.details,
    hint: error.hint,
    ...additionalInfo
  });
};

// Log Success for Debugging
const logSuccess = (context, message, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${context}:`, {
    message,
    ...additionalInfo
  });
};

// Dependency Validation
const checkDependencies = () => {
  const dependencies = [
    { name: 'React', value: React },
    { name: 'useTheme', value: useTheme },
    { name: 'toast', value: toast },
    { name: 'supabase', value: supabase }
  ];
  dependencies.forEach(dep => {
    if (!dep.value) {
      const error = new Error(`Missing dependency: ${dep.name}`);
      logError('DependencyCheck', error);
      throw error;
    }
  });
  logSuccess('DependencyCheck', 'All dependencies validated successfully');
};

// Environment Validation
const validateEnvironment = () => {
  const requiredEnvVars = [
    { name: 'VITE_SUPABASE_URL', value: import.meta.env.VITE_SUPABASE_URL },
    { name: 'VITE_SUPABASE_ANON_KEY', value: import.meta.env.VITE_SUPABASE_ANON_KEY }
  ];
  const missingVars = requiredEnvVars.filter(env => !env.value);
  if (missingVars.length > 0) {
    const error = new Error(`Missing environment variables: ${missingVars.map(v => v.name).join(', ')}`);
    logError('EnvironmentValidation', error);
    return error;
  }
  return null;
};

// Diagnostic Overlay Component
const DiagnosticOverlay = ({ error, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isNetworkError = error?.message.includes('network') || error?.message.includes('timeout');
  const isSupabaseError = error?.message.includes('Supabase') || error?.message.includes('schema cache');

  const errorDetails = JSON.stringify(
    {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      details: error.details,
      hint: error.hint,
      timestamp: new Date().toISOString()
    },
    null,
    2
  );

  const handleCopyError = () => {
    navigator.clipboard.writeText(errorDetails);
    toast.info('Error details copied to clipboard');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6">
          {isNetworkError ? 'Network Error' : isSupabaseError ? 'Database Error' : 'Critical Error'}
        </Typography>
        <Typography>
          {error.message || 'An unexpected error occurred.'}
        </Typography>
        <Typography variant="caption">
          Check the console for detailed logs or contact support.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Possible fixes: {isNetworkError
            ? 'Check your internet connection and try again.'
            : isSupabaseError
            ? 'Ensure Supabase is configured correctly.'
            : 'Refresh the page or contact support.'}
        </Typography>
        <Button
          onClick={() => setShowDetails(!showDetails)}
          sx={{ mt: 1 }}
          size="small"
          variant="text"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
        <Collapse in={showDetails}>
          <Typography variant="caption" component="pre" sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100', p: 1 }}>
            {errorDetails}
          </Typography>
        </Collapse>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {onRetry && (
            <Button onClick={onRetry}>
              Retry Operation
            </Button>
          )}
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
          <Tooltip title="Copy error details">
            <IconButton onClick={handleCopyError}>
              <FileCopy />
            </IconButton>
          </Tooltip>
          <Button href="https://support.example.com" target="_blank">
            Contact Support
          </Button>
        </Box>
      </Alert>
    </Box>
  );
};

const AuthLogout = ({ ...rest }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timeout Wrapper for Supabase Requests
  const withTimeout = async (promise, ms = 10000) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    );
    return Promise.race([promise, timeout]);
  };

  // Validate Supabase Client
  useEffect(() => {
    if (!supabase) {
      const initError = new Error('Supabase client not initialized');
      logError('SupabaseInit', initError);
      setError(initError);
    }
  }, []);

  // Diagnostic logging and environment validation
  useEffect(() => {
    try {
      console.log('AuthLogout component mounted with props:', rest);
      console.log('Vite environment variables:', {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Defined' : 'Undefined',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Defined' : 'Undefined',
        VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION
      });
      checkDependencies();
      const envError = validateEnvironment();
      if (envError) throw envError;
      logSuccess('Initialization', 'Environment and dependencies validated');
    } catch (depError) {
      logError('Initialization', depError);
      setError(depError);
    }
    return () => {
      console.log('AuthLogout component unmounted');
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    const startTime = performance.now();
    try {
      setIsLoading(true);
      const { error: signOutError } = await withTimeout(supabase.auth.signOut());
      if (signOutError) {
        logError('SignOut', signOutError);
        throw new Error(`Failed to sign out: ${signOutError.message}`);
      }
      logSuccess('SignOut', 'User signed out successfully');
      toast.success('Signed out successfully!');
      navigate('/login');
    } catch (error) {
      logError('SignOut', error);
      toast.error(error.message || 'Failed to sign out');
      setError(error);
    } finally {
      setIsLoading(false);
      logSuccess('SignOut', `Sign-out completed in ${performance.now() - startTime}ms`);
    }
  };

  // Critical error handling
  if (!supabase) {
    const initError = new Error('Failed to initialize database connection. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
    logError('SupabaseInit', initError);
    return <DiagnosticOverlay error={initError} />;
  }

  if (error) {
    logError('ComponentError', error);
    return <DiagnosticOverlay error={error} onRetry={() => setError(null)} />;
  }

  // Loading state
  if (isLoading) {
    console.log('Rendering loading state');
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('Rendering AuthLogout UI');
  try {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Sign Out
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Are you sure you want to sign out?
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="primary"
            fullWidth
            size="large"
            variant="contained"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
          <Button
            fullWidth
            size="large"
            variant="text"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    );
  } catch (renderError) {
    logError('Render', renderError);
    return <DiagnosticOverlay error={renderError} onRetry={() => setError(null)} />;
  }
};

export default AuthLogout;