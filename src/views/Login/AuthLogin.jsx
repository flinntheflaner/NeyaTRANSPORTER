import React, { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
  Tooltip, Collapse, InputAdornment, IconButton
} from '@mui/material';
import * as Yup from 'yup';
import { Formik } from 'formik';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FileCopy from '@mui/icons-material/FileCopy';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from './supabase';

const logError = (context, error, info = {}) => {
  console.error(`[${new Date().toISOString()}] ${context}:`, {
    message: error?.message, code: error?.code, ...info
  });
};

const logSuccess = (context, msg, info = {}) => {
  console.log(`[${new Date().toISOString()}] ${context}:`, { msg, ...info });
};

const checkDependencies = () => {
  if (!React || !useTheme || !Yup || !Formik || !toast || !supabase) {
    throw new Error('Dépendance manquante');
  }
  logSuccess('DependencyCheck', 'Dépendances validées');
};

const validateEnvironment = () => {
  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_ANON_KEY
  ) {
    const err = new Error('Variables manquantes');
    logError('EnvironmentValidation', err);
    return err;
  }
  return null;
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const isNetwork =
        this.state.error?.message?.includes('network') ||
        this.state.error?.message?.includes('timeout');
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6">
              {isNetwork ? 'Erreur réseau' : 'Erreur d’application'}
            </Typography>
            <Typography>
              {this.state.error?.message || 'Erreur inattendue.'}
            </Typography>
            <Typography variant="caption">
              Détails :{' '}
              {this.state.errorInfo?.componentStack
                ? this.state.errorInfo.componentStack.split('\n')[0]
                : ''}
            </Typography>
            <Typography>
              {isNetwork
                ? 'Vérifiez votre connexion.'
                : 'Consultez les logs ou contactez le support.'}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button onClick={() => window.location.reload()}>Réessayer</Button>
              <Button onClick={() => window.history.back()} variant="outlined">
                Retour
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

const DiagnosticOverlay = ({ error, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isNetwork =
    error?.message?.includes('network') || error?.message?.includes('timeout');
  const errorDetails = JSON.stringify(
    {
      message: error?.message,
      code: error?.code,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  const handleCopyError = () => {
    navigator.clipboard.writeText(errorDetails);
    toast.info('Détails copiés');
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
        p: 3,
      }}
    >
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6">
          {isNetwork
            ? 'Erreur réseau'
            : 'Erreur critique'}
        </Typography>
        <Typography>{error?.message || 'Erreur inattendue.'}</Typography>
        <Button
          onClick={() => setShowDetails(!showDetails)}
          sx={{ mt: 1 }}
          size="small"
          variant="text"
        >
          {showDetails ? 'Masquer' : 'Détails'}
        </Button>
        <Collapse in={showDetails}>
          <Typography
            variant="caption"
            component="pre"
            sx={{
              maxHeight: 200,
              overflow: 'auto',
              bgcolor: 'grey.100',
              p: 1,
            }}
          >
            {errorDetails}
          </Typography>
        </Collapse>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {onRetry && <Button onClick={onRetry}>Réessayer</Button>}
          <Button onClick={() => window.location.reload()}>Rafraîchir</Button>
          <Tooltip title="Copier erreur">
            <IconButton onClick={handleCopyError}>
              <FileCopy />
            </IconButton>
          </Tooltip>
          <Button href="https://support.example.com" target="_blank">
            Support
          </Button>
        </Box>
      </Alert>
    </Box>
  );
};

const EmailInput = ({ value, onChange, onBlur, error, touched, label }) => {
  const isValidEmail = Yup.string().email().isValidSync(value);
  const showError = touched && error;
  const showValid = touched && value && isValidEmail && !error;

  return (
    <TextField
      fullWidth
      error={showError}
      helperText={showError ? error : ''}
      label={label}
      margin="normal"
      name="email"
      onBlur={onBlur}
      onChange={onChange}
      type="email"
      value={value}
      variant="outlined"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            {showValid && <CheckCircle sx={{ color: 'green' }} />}
            {showError && <ErrorIcon sx={{ color: 'red' }} />}
          </InputAdornment>
        ),
      }}
    />
  );
};

// Use only the 'role' field from users table for roles
const getUserRoles = (userRow) => {
  // Return as an array for compatibility, but only from the 'role' field
  if (!userRow || !userRow.role) return [];
  return [{ role: userRow.role }];
};

const AuthLogin = ({ ...rest }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  const [signUpMode, setSignUpMode] = useState(false);

  const withTimeout = async (promise, ms = 10000) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Délai dépassé')), ms)
    );
    return Promise.race([promise, timeout]);
  };

  useEffect(() => {
    if (!supabase) {
      const initError = new Error('Client Supabase non initialisé');
      logError('SupabaseInit', initError);
      setError(initError);
    }
  }, []);

  // Fetch the user row by user id and extract roles from the 'role' column
  const fetchRoles = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return getUserRoles(data);
    } catch (err) {
      logError('fetchRoles', err, { userId });
      return [];
    }
  };

  useEffect(() => {
    if (signUpMode) return; // skip auth check if in sign up
    const checkAuth = async () => {
      const start = performance.now();
      try {
        setIsLoading(true);
        const {
          data: { session },
          error,
        } = await withTimeout(supabase.auth.getSession());
        if (error) throw error;
        if (
          session &&
          session.access_token &&
          session.expires_at > Date.now() / 1000
        ) {
          // Fetch user row from users table for role
          const { data: userRow, error: userRowError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          if (userRowError) throw userRowError;
          const rolesData = getUserRoles(userRow);
          setUserRoles(rolesData);
          const validRoles = [
            'Super Admin',
            'Operations Manager',
            'Agent Supervisor',
            'Ticketing Agent',
          ];
          if (rolesData.some((r) => validRoles.includes(r.role))) {
            logSuccess('AuthCheck', 'Authentifié', {
              userId: session.user.id,
              roles: rolesData,
            });
            navigate('/dashboard');
          } else {
            throw new Error('Aucun rôle valide. Contactez l’administrateur.');
          }
        } else {
          logError('AuthCheck', new Error('Session invalide'), {
            userId: session?.user?.id,
          });
          toast.error('Session expirée. Reconnectez-vous.');
        }
      } catch (err) {
        logError('AuthCheck', err);
        setError(err);
      } finally {
        setIsLoading(false);
        logSuccess(
          'AuthCheck',
          `Terminé en ${performance.now() - start}ms`
        );
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, signUpMode]);

  useEffect(() => {
    try {
      checkDependencies();
      const envError = validateEnvironment();
      if (envError) throw envError;
      logSuccess('Initialisation', 'Environnement validé');
    } catch (depError) {
      logError('Initialisation', depError);
      setError(depError);
    }
  }, []);

  // SIGN UP HANDLER
  const handleSignUp = async (values, { setSubmitting }) => {
    const start = performance.now();
    try {
      alert('[DEBUG] Tentative de création dans Supabase Auth');
      // 1. Create user in Supabase auth
      const { data: signUpData, error: signUpError } = await withTimeout(
        supabase.auth.signUp({
          email: values.email,
          password: values.password,
        })
      );
      if (signUpError) {
        logError('SignUp', signUpError);
        alert('[DEBUG] Erreur Supabase Auth: ' + signUpError.message);
        let msg = 'Échec de la création du compte.';
        if (signUpError.message.includes('already registered')) {
          msg = 'Cet email est déjà utilisé.';
        }
        throw new Error(msg);
      }
      if (!signUpData.user) {
        alert('[DEBUG] Pas de user créé dans auth.users');
        throw new Error('Échec création utilisateur.');
      }
      alert(`[DEBUG] Créé dans auth.users. id: ${signUpData.user.id}`);

      // 2. Insert into public.users
      alert('[DEBUG] Tentative insertion dans public.users');
      const user_id = signUpData.user.id;
      const { error: userInsertError } = await supabase.from('users').insert([
        {
          user_id,
          name: values.name || 'Nouveau Utilisateur',
          email: values.email,
          phone: values.phone || '+000000000',
          role: 'Super Admin',
          permissions: [],
          status: 'active',
        },
      ]);
      if (userInsertError) {
        logError('UserInsert', userInsertError, { user_id });
        alert('[DEBUG] Erreur insert public.users: ' + JSON.stringify(userInsertError));
        throw new Error("Utilisateur créé mais l'enregistrement du profil a échoué.");
      }

      logSuccess('SignUp', 'Utilisateur créé', { user_id });
      alert('[DEBUG] Utilisateur inséré dans public.users');
      toast.success('Compte créé ! Vous pouvez vous connecter.');
      setSignUpMode(false);
    } catch (error) {
      logError('SignUp', error);
      alert('[DEBUG] Exception attrapée: ' + (error?.message || JSON.stringify(error)));
      toast.error(error.message || 'Erreur lors de la création du compte');
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('SignUp', `Terminé en ${performance.now() - start}ms`);
    }
  };

  // SIGN IN HANDLER
  const handleSignIn = async (values, { setSubmitting }) => {
    const start = performance.now();
    try {
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })
      );
      if (authError) {
        logError('SignIn', authError);
        alert('[DEBUG] SignIn error: ' + authError.message);
        if (authError.message.includes('Invalid login')) {
          throw new Error('Identifiants incorrects.');
        }
        throw new Error(`Connexion échouée : ${authError.message}`);
      }
      if (!authData.user) {
        alert('[DEBUG] Aucun user retourné à la connexion');
        throw new Error('Aucune donnée utilisateur');
      }
      alert('[DEBUG] Connexion réussie avec l\'ID : ' + authData.user.id);

      // Fetch user row for role
      const { data: userRow, error: userRowError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      if (userRowError) {
        alert('[DEBUG] Erreur select public.users: ' + JSON.stringify(userRowError));
        throw userRowError;
      }
      const rolesData = getUserRoles(userRow);
      setUserRoles(rolesData);
      const validRoles = [
        'Super Admin',
        'Operations Manager',
        'Agent Supervisor',
        'Ticketing Agent',
      ];
      if (!rolesData.some((r) => validRoles.includes(r.role))) {
        alert('[DEBUG] Aucune rôle valide');
        throw new Error('Aucun rôle valide. Contactez l’administrateur.');
      }

      logSuccess('SignIn', 'Connexion réussie', {
        userId: authData.user.id,
        roles: rolesData,
      });
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (error) {
      logError('SignIn', error);
      alert('[DEBUG] Exception attrapée (connexion): ' + (error?.message || JSON.stringify(error)));
      toast.error(error.message || 'Échec de la connexion');
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('SignIn', `Terminé en ${performance.now() - start}ms`);
    }
  };

  if (!supabase) {
    const initError = new Error(
      'Connexion base échouée. Vérifiez les variables d’environnement.'
    );
    logError('SupabaseInit', initError);
    return <DiagnosticOverlay error={initError} />;
  }

  if (error) {
    logError('ComponentError', error);
    return (
      <DiagnosticOverlay error={error} onRetry={() => setError(null)} />
    );
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {signUpMode ? "Créer un compte" : "Se connecter"}
        </Typography>
        <Formik
          initialValues={
            signUpMode
              ? { name: '', email: '', phone: '', password: '', submit: null }
              : { email: '', password: '', submit: null }
          }
          validationSchema={
            signUpMode
              ? Yup.object().shape({
                  name: Yup.string()
                    .max(255, 'Trop long')
                    .required('Nom requis'),
                  email: Yup.string()
                    .email('Email invalide')
                    .max(255)
                    .required('Email requis'),
                  phone: Yup.string()
                    .min(8, 'Téléphone court')
                    .max(20, 'Téléphone long')
                    .required('Téléphone requis'),
                  password: Yup.string()
                    .min(8, 'Mot de passe trop court')
                    .required('Mot de passe requis'),
                })
              : Yup.object().shape({
                  email: Yup.string()
                    .email('Email invalide')
                    .max(255)
                    .required('Email requis'),
                  password: Yup.string()
                    .min(8, 'Mot de passe trop court')
                    .required('Mot de passe requis'),
                })
          }
          onSubmit={signUpMode ? handleSignUp : handleSignIn}
        >
          {({
            errors,
            handleBlur,
            handleChange,
            handleSubmit,
            isSubmitting,
            touched,
            values,
          }) => (
            <Box component="form" noValidate onSubmit={handleSubmit} {...rest}>
              {signUpMode && (
                <>
                  <TextField
                    fullWidth
                    error={Boolean(touched.name && errors.name)}
                    helperText={touched.name && errors.name}
                    label="Nom"
                    margin="normal"
                    name="name"
                    type="text"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.name}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    error={Boolean(touched.phone && errors.phone)}
                    helperText={touched.phone && errors.phone}
                    label="Téléphone"
                    margin="normal"
                    name="phone"
                    type="tel"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.phone}
                    variant="outlined"
                  />
                </>
              )}
              <EmailInput
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
                touched={touched.email}
                label="Adresse email"
              />
              <TextField
                fullWidth
                error={Boolean(touched.password && errors.password)}
                helperText={touched.password && errors.password}
                label="Mot de passe"
                margin="normal"
                name="password"
                type="password"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.password}
                variant="outlined"
              />
              <Button
                color="primary"
                disabled={isSubmitting}
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                sx={{ mt: 2 }}
              >
                {signUpMode ? "S'inscrire" : "Se connecter"}
              </Button>
              <Button
                color="secondary"
                fullWidth
                size="small"
                variant="text"
                sx={{ mt: 1 }}
                onClick={() => setSignUpMode((m) => !m)}
              >
                {signUpMode ? "Déjà un compte ? Se connecter" : "Créer un compte"}
              </Button>
            </Box>
          )}
        </Formik>
      </Box>
    </ErrorBoundary>
  );
};

export default AuthLogin;