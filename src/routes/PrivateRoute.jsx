import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Button, Tooltip, IconButton, Typography } from '@mui/material';
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
    ...additionalInfo
  });
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack, component: 'PrivateRoute' });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6">Application Error</Typography>
            <Typography>
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </Typography>
            <Typography variant="caption">
              Details: {this.state.errorInfo?.componentStack.split('\n')[0]}
            </Typography>
            <Typography>
              Please check the console for detailed logs or contact support.
            </Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
              Retry
            </Button>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

// Dependency Validation
const checkDependencies = () => {
  const dependencies = [
    { name: 'React', value: React },
    { name: 'Navigate', value: Navigate },
    { name: 'Outlet', value: Outlet },
    { name: 'supabase', value: supabase },
    { name: 'toast', value: toast }
  ];
  dependencies.forEach(dep => {
    if (!dep.value) {
      const error = new Error(`Missing dependency: ${dep.name}`);
      logError('DependencyCheck', error);
      throw error;
    }
  });
  console.log('All PrivateRoute dependencies validated successfully');
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
const DiagnosticOverlay = ({ error }) => {
  const errorDetails = JSON.stringify(
    {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
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
        <Typography variant="h6">Critical Error</Typography>
        <Typography>
          {error.message || 'An unexpected error occurred.'}
        </Typography>
        <Typography variant="caption">
          Check the console for detailed logs or contact support.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Possible fixes: Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env, Supabase SMTP is configured, and RLS policies allow access.
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button onClick={() => window.location.reload()}>
            Retry
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

const PrivateRoute = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Timeout Wrapper for Supabase Requests
  const withTimeout = async (promise, ms = 10000) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    );
    return Promise.race([promise, timeout]);
  };

  // Retry Logic with Exponential Backoff
  const retryWithBackoff = async (fn, retries = 5, delay = 500) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await withTimeout(fn());
      } catch (err) {
        if (err.status === 429) {
          logError('Retry', err, { attempt: i + 1, message: 'Rate limit exceeded' });
          toast.error('Too many requests. Please try again later.');
          throw err;
        }
        if (i === retries - 1) {
          logError('RetryFailed', err, { attempt: i + 1, retries });
          throw err;
        }
        const waitTime = delay * Math.pow(2, i);
        logError('Retry', err, { attempt: i + 1, waitTime, retries });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  useEffect(() => {
    console.log('PrivateRoute component mounted');
    console.log('Environment variables:', {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Defined' : 'Undefined',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Defined' : 'Undefined'
    });

    try {
      checkDependencies();
      const envError = validateEnvironment();
      if (envError) throw envError;
    } catch (depError) {
      logError('Initialization', depError);
      setError(depError);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      const startTime = performance.now();
      try {
        // Initial session check with retry
        const { data: { session }, error } = await retryWithBackoff(() => supabase.auth.getSession());
        if (error) {
          if (error.message.includes('not found') || error.message.includes('invalid')) {
            logError('AuthCheck', error, { message: 'Session not found or invalid' });
            toast.error('Authentication session not found. Please sign in.');
          }
          throw error;
        }
        console.log('Initial session check result:', {
          session: !!session,
          userId: session?.user?.id,
          expiresAt: session?.expires_at
        });

        // Validate session
        const isSessionValid = session && session.access_token && session.expires_at && new Date(session.expires_at * 1000) > new Date();
        setIsAuthenticated(isSessionValid);

        if (isSessionValid) {
          // Refresh session if valid but nearing expiry
          if (session.expires_at * 1000 - Date.now() < 5 * 60 * 1000) { // Less than 5 minutes
            const { error: refreshError } = await withTimeout(supabase.auth.refreshSession());
            if (refreshError) {
              logError('SessionRefresh', refreshError);
              setIsAuthenticated(false);
              toast.error('Failed to refresh session. Please sign in again.');
            } else {
              console.log('Session refreshed successfully');
            }
          }
        }
      } catch (err) {
        logError('AuthCheck', err);
        setIsAuthenticated(false);
        toast.error(err.message || 'Failed to verify authentication status');
        if (err.status === 429) {
          toast.error('Too many requests. Please try again later.');
        }
      } finally {
        setIsLoading(false);
        console.log(`Auth check completed in ${performance.now() - startTime}ms`);
      }
    };

    checkAuth();

    // Subscribe to real-time auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', {
        event,
        session: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });
      const isSessionValid = session && session.access_token && session.expires_at && new Date(session.expires_at * 1000) > new Date();
      setIsAuthenticated(isSessionValid);
      setIsLoading(false);
      if (event === 'SIGNED_IN') {
        toast.info('User authenticated successfully');
      } else if (event === 'SIGNED_OUT') {
        toast.info('User signed out');
        setIsAuthenticated(false);
        navigate('/application/login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Session token refreshed');
      }
    });

    return () => {
      console.log('PrivateRoute component unmounted');
      authListener.subscription?.unsubscribe();
    };
  }, [navigate]);

  // Critical error handling
  if (!supabase) {
    const error = new Error('Failed to initialize database connection. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
    logError('SupabaseInit', error);
    return <DiagnosticOverlay error={error} />;
  }

  if (error) {
    logError('ComponentError', error);
    return <DiagnosticOverlay error={error} />;
  }

  // Loading state
  if (isLoading) {
    console.log('Rendering loading state');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('Rendering PrivateRoute:', { isAuthenticated, currentPath: location.pathname });
  try {
    if (!isAuthenticated) {
      console.log('Redirecting to login page: /application/login');
      return (
        <ErrorBoundary>
          <Navigate to="/application/login" replace state={{ from: location }} />
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  } catch (renderError) {
    logError('Render', renderError);
    return <DiagnosticOverlay error={renderError} />;
  }
};

export default PrivateRoute;