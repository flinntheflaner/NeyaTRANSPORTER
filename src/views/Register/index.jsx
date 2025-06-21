import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import 'react-phone-number-input/style.css';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Grid, Box, Alert, Button, Tooltip, IconButton } from '@mui/material';
import FileCopy from '@mui/icons-material/FileCopy';
import AuthRegister from './AuthRegister'; // Import the restored AuthRegister.jsx
import Logo from 'assets/images/logo-dark.svg';
import { toast } from 'react-toastify';

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
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6">Erreur d’application</Typography>
            <Typography>
              {this.state.error?.message || 'Une erreur inattendue s’est produite lors du rendu.'}
            </Typography>
            <Typography variant="caption">
              Détails : {this.state.errorInfo?.componentStack.split('\n')[0]}
            </Typography>
            <Typography>
              Veuillez vérifier les journaux de la console ou contacter le support.
            </Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
              Réessayer
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
    { name: 'RouterLink', value: RouterLink },
    { name: 'useTheme', value: useTheme },
    { name: 'Card', value: Card },
    { name: 'Typography', value: Typography },
    { name: 'Grid', value: Grid },
    { name: 'AuthRegister', value: AuthRegister },
    { name: 'toast', value: toast }
  ];
  dependencies.forEach(dep => {
    if (!dep.value) {
      const error = new Error(`Dépendance manquante : ${dep.name}`);
      logError('DependencyCheck', error);
      throw error;
    }
  });
  console.log('Toutes les dépendances du composant Register validées avec succès');
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
    toast.info('Détails de l’erreur copiés dans le presse-papiers');
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
        <Typography variant="h6">Erreur critique</Typography>
        <Typography>
          {error.message || 'Une erreur inattendue s’est produite.'}
        </Typography>
        <Typography variant="caption">
          Vérifiez les journaux de la console pour plus de détails ou contactez le support.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Solutions possibles : Assurez-vous que toutes les dépendances sont installées, que les ressources sont accessibles et que Supabase est correctement configuré.
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
          <Tooltip title="Copier les détails de l’erreur">
            <IconButton onClick={handleCopyError}>
              <FileCopy />
            </IconButton>
          </Tooltip>
          <Button href="https://support.example.com" target="_blank">
            Contacter le support
          </Button>
        </Box>
      </Alert>
    </Box>
  );
};

const Register = () => {
  const theme = useTheme();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Diagnostic Logging and Dependency Check
  useEffect(() => {
    console.log('Composant Register monté');
    try {
      checkDependencies();
    } catch (depError) {
      logError('Initialisation', depError);
      setError(depError);
    } finally {
      setIsLoading(false);
    }
    return () => {
      console.log('Composant Register démonté');
    };
  }, []);

  // Handle Image Load Error
  const handleImageError = () => {
    const imgError = new Error('Échec du chargement de l’image du logo');
    logError('ImageLoad', imgError, { imageSrc: Logo });
    toast.error('Échec du chargement de l’image du logo. Vérifiez le chemin des ressources.');
  };

  // Critical Error Handling
  if (!supabase) {
    const error = new Error('Échec de l’initialisation de la connexion à la base de données. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.');
    logError('SupabaseInit', error);
    return <DiagnosticOverlay error={error} />;
  }

  if (error) {
    logError('ComponentError', error);
    return <DiagnosticOverlay error={error} />;
  }

  // Loading state
  if (isLoading) {
    console.log('Rendu de l’état de chargement');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('Rendu de l’interface utilisateur Register');
  try {
    return (
      <ErrorBoundary>
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          sx={{ backgroundColor: theme.palette.common.black, height: '100%', minHeight: '100vh' }}
        >
          <Grid item xs={11} md={6} lg={4}>
            <Card
              sx={{
                overflow: 'visible',
                display: 'flex',
                position: 'relative',
                my: 3,
                mx: 'auto',
                '& .MuiCardContent-root': {
                  flexGrow: 1,
                  flexBasis: '50%',
                  width: '50%'
                },
                maxWidth: 475
              }}
            >
              <CardContent sx={{ p: theme.spacing(5, 4, 3, 4) }}>
                <Grid container direction="column" spacing={4} justifyContent="center">
                  <Grid item xs={12}>
                    <Grid container justifyContent="space-between">
                      <Grid item>
                        <Typography color="textPrimary" gutterBottom variant="h2">
                          S’inscrire
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Créez un compte pour commencer.
                        </Typography>
                      </Grid>
                      <Grid item>
                        <RouterLink to="/">
                          <img alt="Méthode d’authentification" src={Logo} onError={handleImageError} />
                        </RouterLink>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <AuthRegister />
                  </Grid>
                  <Grid container justifyContent="flex-start" sx={{ mt: theme.spacing(2), mb: theme.spacing(1) }}>
                    <Grid item>
                      <Typography
                        variant="subtitle2"
                        color="secondary"
                        component={RouterLink}
                        to="/application/login"
                        sx={{ textDecoration: 'none', pl: 2 }}
                      >
                        Vous avez déjà un compte ?
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </ErrorBoundary>
    );
  } catch (renderError) {
    logError('Render', renderError);
    return <DiagnosticOverlay error={renderError} />;
  }
};

export default Register;