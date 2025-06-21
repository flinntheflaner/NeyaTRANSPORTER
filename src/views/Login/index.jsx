import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Grid, Box, Alert, Button, Tooltip, IconButton, CircularProgress } from '@mui/material';
import FileCopy from '@mui/icons-material/FileCopy';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthLogin from './AuthLogin';
import Logo from 'assets/images/logo-dark.svg';
import { supabase } from './supabase';

const logError = (context, error, info = {}) => {
  console.error(`[${new Date().toISOString()}] ${context}:`, {
    message: error.message, code: error.code, ...info
  });
};

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6">Erreur d’application</Typography>
            <Typography>{this.state.error?.message || 'Une erreur inattendue s’est produite.'}</Typography>
            <Typography variant="caption">Détails : {this.state.errorInfo?.componentStack.split('\n')[0]}</Typography>
            <Typography>Vérifiez les journaux ou contactez le support.</Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>Réessayer</Button>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

const checkDependencies = () => {
  const dependencies = [
    { name: 'React', value: React },
    { name: 'useTheme', value: useTheme },
    { name: 'Card', value: Card },
    { name: 'Typography', value: Typography },
    { name: 'Grid', value: Grid },
    { name: 'AuthLogin', value: AuthLogin },
    { name: 'toast', value: toast },
    { name: 'supabase', value: supabase }
  ];
  dependencies.forEach(dep => {
    if (!dep.value) {
      const error = new Error(`Dépendance manquante : ${dep.name}`);
      logError('DependencyCheck', error);
      throw error;
    }
  });
  console.log('Dépendances validées');
};

const validateEnvironment = () => {
  const requiredEnvVars = [
    { name: 'VITE_SUPABASE_URL', value: import.meta.env.VITE_SUPABASE_URL },
    { name: 'VITE_SUPABASE_ANON_KEY', value: import.meta.env.VITE_SUPABASE_ANON_KEY }
  ];
  const missingVars = requiredEnvVars.filter(env => !env.value);
  if (missingVars.length > 0) {
    const error = new Error(`Variables manquantes : ${missingVars.map(v => v.name).join(', ')}`);
    logError('EnvironmentValidation', error);
    return error;
  }
  return null;
};

const DiagnosticOverlay = ({ error }) => {
  const errorDetails = JSON.stringify(
    { message: error.message, code: error.code, timestamp: new Date().toISOString() },
    null,
    2
  );

  const handleCopyError = () => {
    navigator.clipboard.writeText(errorDetails);
    toast.info('Détails copiés');
  };

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6">Erreur critique</Typography>
        <Typography>{error.message || 'Erreur inattendue.'}</Typography>
        <Typography variant="caption">Vérifiez les journaux ou contactez le support.</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Solutions : Vérifiez VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY et les dépendances.
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
          <Tooltip title="Copier erreur"><IconButton onClick={handleCopyError}><FileCopy /></IconButton></Tooltip>
          <Button href="https://support.example.com" target="_blank">Support</Button>
        </Box>
      </Alert>
    </Box>
  );
};

const Login = () => {
  const theme = useTheme();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Login monté');
    console.log('Variables :', {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Défini' : 'Non défini',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Défini' : 'Non défini'
    });
    try {
      checkDependencies();
      const envError = validateEnvironment();
      if (envError) throw envError;
    } catch (depError) {
      logError('Initialisation', depError);
      setError(depError);
    } finally {
      setIsLoading(false);
    }
    return () => console.log('Login démonté');
  }, []);

  const handleImageError = () => {
    const imgError = new Error('Échec chargement logo');
    logError('ImageLoad', imgError, { imageSrc: Logo });
    toast.error('Échec chargement logo.');
  };

  if (!supabase) {
    const error = new Error('Connexion base échouée. Vérifiez les variables d’environnement.');
    logError('SupabaseInit', error);
    return <DiagnosticOverlay error={error} />;
  }

  if (error) {
    logError('ComponentError', error);
    return <DiagnosticOverlay error={error} />;
  }

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <ErrorBoundary>
      <Grid container justifyContent="center" alignItems="center" sx={{ backgroundColor: theme.palette.common.black, height: '100%', minHeight: '100vh' }}>
        <Grid item xs={11} sm={7} md={6} lg={4}>
          <Card sx={{ overflow: 'visible', display: 'flex', position: 'relative', maxWidth: '475px', margin: '24px auto' }}>
            <CardContent sx={{ p: theme.spacing(5, 4, 3, 4), flexGrow: 1 }}>
              <Grid container direction="column" spacing={4}>
                <Grid item xs={12}>
                  <Grid container justifyContent="space-between" alignItems="center">
                    <Grid item>
                      <Typography color="textPrimary" gutterBottom variant="h2">Se connecter</Typography>
                      <Typography variant="body2" color="textSecondary">Entrez vos identifiants ou créez un compte.</Typography>
                    </Grid>
                    <Grid item>
                      <img alt="Transport Studio" src={Logo} onError={handleImageError} style={{ maxWidth: '100px' }} />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <AuthLogin />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ErrorBoundary>
  );
};

export default Login;