import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from './supabase';
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Grid,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  Tooltip,
  CssBaseline,
  Select,
  MenuItem,
  InputAdornment,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useTranslation } from './LanguageContext';

// Breadcrumb Component
const Breadcrumb = ({ title, children }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
      {title}
    </Typography>
    <Box sx={{ mt: 1 }}>{children}</Box>
  </Box>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {this.props.t('agent_error')}: {this.state.error?.message || this.props.t('agent_unknownError', { error: 'Unknown' })}
          </Typography>
          <Typography variant="body2">
            {this.props.t('agent_errorDetails', { details: this.state.errorInfo?.componentStack || this.props.t('agent_noDetails') })}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {this.props.t('agent_refreshOrContact')}
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

// Theme setup with custom styles for current user
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#e3f2fd',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          transition: 'transform 0.2s ease-in-out, background-color 0.3s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.3s ease-in-out',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          '&.currentUserRow': {
            backgroundColor: '#e3f2fd',
            borderLeft: '4px solid #1976d2',
            '&:hover': {
              backgroundColor: '#bbdefb',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '&.currentUserField': {
            backgroundColor: '#e8f0fe',
            borderRadius: '4px',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#1976d2',
              },
              '&:hover fieldset': {
                borderColor: '#1565c0',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
              },
            },
          },
          '&.disabledField': {
            '& .MuiInputBase-root.Mui-disabled': {
              backgroundColor: '#f5f5f5',
              '&:before': {
                borderBottomStyle: 'solid',
              },
            },
            '& .MuiInputLabel-root.Mui-disabled': {
              color: '#616161',
            },
          },
        },
      },
    },
  },
});

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
    ...additionalInfo,
  });
};

// Log Success for Debugging
const logSuccess = (context, message, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${context}:`, {
    message,
    ...additionalInfo,
  });
};

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canViewAgents: true,
    canCreateAgent: true,
    canUpdateAgent: true,
    canDeleteAgent: true,
    canAssignAnyRole: true,
    canAssignAnyAgency: true,
  },
  'Operations Manager': {
    canViewAgents: true,
    canCreateAgent: true,
    canUpdateAgent: true,
    canDeleteAgent: true,
    canAssignAnyRole: false,
    canAssignAnyAgency: true,
  },
  'Agent Supervisor': {
    canViewAgents: true,
    canCreateAgent: true,
    canUpdateAgent: true,
    canDeleteAgent: false,
    canAssignAnyRole: false,
    canAssignAnyAgency: false,
  },
  'Ticketing Agent': {
    canViewAgents: false,
    canCreateAgent: false,
    canUpdateAgent: false,
    canDeleteAgent: false,
    canAssignAnyRole: false,
    canAssignAnyAgency: false,
  },
};

// Utility function for timeout handling
const withTimeout = async (promise, ms = 10000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
};

const AgentManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [agents, setAgents] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isTemporaryRole, setIsTemporaryRole] = useState(false);
  const [temporaryRoleExpiry, setTemporaryRoleExpiry] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    agency_ids: [],
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const gridSpacing = 2;

  const roleOptions = useCallback(() => {
    return ['Operations Manager', 'Agent Supervisor', 'Ticketing Agent'].filter((role) => {
      if (userRole === 'Super Admin') return true;
      if (userRole === 'Operations Manager') return ['Agent Supervisor', 'Ticketing Agent'].includes(role);
      if (userRole === 'Agent Supervisor') return role === 'Ticketing Agent';
      return false;
    });
  }, [userRole]);

  // Toggle password visibility
  const handleClickShowPassword = () => setShowPassword((prev) => !prev);

  // Handle Snackbar close
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // Password validation
  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  // Fetch initial data (user role, company ID, agencies, current user ID)
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        // Fetch authenticated user session
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(t('agent_sessionError', { error: sessionError.message }));
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          setSnackbar({ open: true, message: t('agent_loginRequired'), severity: 'error' });
          navigate('/login');
          return;
        }

        setCurrentUserId(session.user.id);

        // Fetch user data with retry
        let userData = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('user_id, role, temporary_role, temporary_role_expiry, company_id')
              .eq('user_id', session.user.id)
              .single();
            if (error) throw error;
            userData = data;
            break;
          } catch (err) {
            logError('UserFetch', err, { userId: session.user.id, attempt });
            if (attempt === maxRetries) {
              throw new Error(t('agent_userFetchError', { error: err.message }));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!userData) {
          logError('UserFetchFinal', new Error('No user data found'), { userId: session.user.id });
          userData = { role: 'Ticketing Agent' };
          setSnackbar({
            open: true,
            message: t('agent_noUserData'),
            severity: 'warning',
          });
        }

        // Determine active role
        const now = new Date();
        const isTemp = userData.temporary_role && userData.temporary_role_expiry && new Date(userData.temporary_role_expiry) > now;
        const activeRole = isTemp ? userData.temporary_role : userData.role || 'Ticketing Agent';
        setUserRole(activeRole);
        setIsTemporaryRole(isTemp);
        setTemporaryRoleExpiry(isTemp ? userData.temporary_role_expiry : null);

        if (!roleMatrix[activeRole]?.canViewAgents) {
          throw new Error(t('agent_noPermission'));
        }

        // Fetch company ID
        let companyIdToUse = userData.company_id;
        if (!companyIdToUse) {
          const { data: companyData, error: companyError } = await supabase
            .from('transport_companies')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
          if (companyError) {
            if (companyError.code === 'PGRST116') {
              throw new Error(t('agent_noCompany'));
            }
            throw new Error(t('agent_companyFetchError', { error: companyError.message }));
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        // Fetch agencies with role-based restrictions
        let agencyQuery = supabase.from('agencies').select('id, name, address, phone, email, manager_name').eq('company_id', companyIdToUse);
        let userAgenciesData = [];
        if (!roleMatrix[activeRole]?.canAssignAnyAgency) {
          const { data, error: userAgenciesError } = await withTimeout(
            supabase
              .from('user_agencies')
              .select('agency_id')
              .eq('user_id', session.user.id)
          );
          if (userAgenciesError) throw new Error(t('agent_agencyFetchError', { error: userAgenciesError.message }));
          userAgenciesData = data || [];
          const allowedAgencyIds = userAgenciesData.map((ua) => ua.agency_id);
          if (allowedAgencyIds.length > 0) {
            agencyQuery = agencyQuery.in('id', allowedAgencyIds);
          } else {
            agencyQuery = agencyQuery.limit(0);
          }
        }

        let agenciesData = [];
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { data, error } = await withTimeout(agencyQuery);
            if (error) throw error;
            agenciesData = data || [];
            break;
          } catch (err) {
            logError('AgenciesFetch', err, { userId: session.user.id, attempt });
            if (attempt === maxRetries) {
              throw new Error(t('agent_agencyFetchError', { error: err.message }));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        setAgencies(agenciesData);

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
          role: activeRole,
        });
      } catch (error) {
        logError('InitialDataFetch', error, { userId: session?.user?.id, retryCount });
        if ((error.message.includes('infinite recursion') || error.message.includes('timeout')) && retryCount < maxRetries) {
          setRetryCount(retryCount + 1);
          setTimeout(() => fetchInitialData(), 1000);
        } else {
          setError(
            error.message.includes('infinite recursion') || error.message.includes('timeout')
              ? t('agent_dbError', { code: error.code || 'N/A' })
              : t('agent_fetchError', { error: error.message })
          );
        }
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchInitialData();
  }, [navigate, retryCount, t]);

  // Fetch agents
  useEffect(() => {
    if (!companyId || !userRole || !currentUserId) return;

    const fetchAgentsData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error(t('agent_userFetchError', { error: authError?.message || 'No user' }));

        // Fetch users with role-based restrictions
        let usersQuery = supabase
          .from('users')
          .select('user_id, name, email, phone, status, company_id, role')
          .eq('company_id', companyId)
          .eq('status', 'active');
        if (!roleMatrix[userRole]?.canViewAgents) {
          usersQuery = usersQuery.eq('user_id', user.id);
        } else if (userRole === 'Agent Supervisor') {
          usersQuery = usersQuery.eq('created_by', user.id).eq('role', 'Ticketing Agent');
        }

        const { data: usersData, error: usersError } = await withTimeout(usersQuery);
        if (usersError) throw new Error(t('agent_usersFetchError', { error: usersError.message }));

        // Fetch user agencies
        let userAgenciesData = [];
        if (usersData.length > 0) {
          const { data, error: userAgenciesError } = await withTimeout(
            supabase
              .from('user_agencies')
              .select('user_id, agency_id')
              .in('user_id', usersData.map((user) => user.user_id))
          );
          if (userAgenciesError) throw new Error(t('agent_agencyFetchError', { error: userAgenciesError.message }));
          userAgenciesData = data || [];
        }

        // Combine users and agencies
        let formattedAgents = usersData
          .map((user) => {
            const userAgencyIds = userAgenciesData
              .filter((ua) => ua.user_id === user.user_id)
              .map((ua) => ua.agency_id);
            return {
              user_id: user.user_id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role || '',
              permissions: [],
              agency_ids: userAgencyIds,
              password: '',
            };
          })
          .filter((agent) => agent.role && agent.role !== 'Super Admin');

        // Sort agents to place current user at the top
        formattedAgents = formattedAgents.sort((a, b) => {
          if (a.user_id === currentUserId) return -1;
          if (b.user_id === currentUserId) return 1;
          return a.name.localeCompare(b.name);
        });

        setAgents(formattedAgents);
        logSuccess('AgentsFetch', 'Agents fetched successfully', {
          agentCount: formattedAgents.length,
          userId: user.id,
          role: userRole,
        });
      } catch (error) {
        logError('AgentsFetch', error, { userId: user?.id });
        setError(t('agent_fetchError', { error: error.message }));
      } finally {
        setLoading(false);
        logSuccess('AgentsFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchAgentsData();
  }, [companyId, userRole, currentUserId, t]);

  // Add a new agent
  const addAgent = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canCreateAgent) {
      setSnackbar({ open: true, message: t('agent_noPermissionCreate'), severity: 'error' });
      return;
    }
    try {
      if (
        !newAgent.name.trim() ||
        !newAgent.email.trim() ||
        !newAgent.phone ||
        !newAgent.role ||
        !newAgent.password.trim()
      ) {
        setSnackbar({ open: true, message: t('agent_requiredFields'), severity: 'error' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAgent.email)) {
        setSnackbar({ open: true, message: t('agent_invalidEmail'), severity: 'error' });
        return;
      }
      if (!isValidPhoneNumber(newAgent.phone)) {
        setSnackbar({ open: true, message: t('agent_invalidPhone'), severity: 'error' });
        return;
      }
      if (!validatePassword(newAgent.password)) {
        setSnackbar({
          open: true,
          message: t('agent_invalidPassword'),
          severity: 'error',
        });
        return;
      }
      if (!roleMatrix[userRole]?.canAssignAnyRole && !roleOptions().includes(newAgent.role)) {
        setSnackbar({ open: true, message: t('agent_invalidRole'), severity: 'error' });
        return;
      }

      // Validate agency_ids
      if (newAgent.agency_ids.length > 0) {
        const { data: validAgencies, error: agencyError } = await supabase
          .from('agencies')
          .select('id')
          .eq('company_id', companyId)
          .in('id', newAgent.agency_ids);
        if (agencyError) throw new Error(t('agent_agencyValidationError', { error: agencyError.message }));
        const validAgencyIds = validAgencies.map((a) => a.id);
        if (newAgent.agency_ids.some((id) => !validAgencyIds.includes(id))) {
          setSnackbar({
            open: true,
            message: t('agent_invalidAgencies'),
            severity: 'error',
          });
          return;
        }
        if (!roleMatrix[userRole]?.canAssignAnyAgency) {
          const allowedAgencies = agencies.map((a) => a.id);
          if (newAgent.agency_ids.some((id) => !allowedAgencies.includes(id))) {
            setSnackbar({
              open: true,
              message: t('agent_unauthorizedAgencies'),
              severity: 'error',
            });
            return;
          }
        }
      }

      if (!supabaseAdmin) {
        throw new Error(t('agent_supabaseAdminNotInitialized'));
      }

      // Create user in auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newAgent.email,
        password: newAgent.password,
        email_confirm: true,
        user_metadata: { phone: newAgent.phone },
      });
      if (authError) throw new Error(t('agent_createUserError', { error: authError.message }));

      // Insert into users table using supabaseAdmin to bypass RLS
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          user_id: authUser.user.id,
          name: newAgent.name,
          email: newAgent.email,
          phone: newAgent.phone,
          status: 'active',
          company_id: companyId,
          created_by: currentUserId,
          role: newAgent.role,
          permissions: [],
        });
      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(t('agent_createUserError', { error: userError.message }));
      }

      // Insert into user_agencies if not the current user
      if (newAgent.agency_ids.length > 0 && authUser.user.id !== currentUserId) {
        const userAgencies = newAgent.agency_ids.map((agency_id) => ({
          user_id: authUser.user.id,
          agency_id,
          created_at: new Date().toISOString(),
        }));
        const { error: agencyError } = await supabase.from('user_agencies').insert(userAgencies);
        if (agencyError) {
          await supabaseAdmin.from('users').delete().eq('user_id', authUser.user.id);
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          throw new Error(t('agent_assignAgenciesError', { error: agencyError.message }));
        }
      } else if (authUser.user.id === currentUserId && newAgent.agency_ids.length > 0) {
        await supabaseAdmin.from('users').delete().eq('user_id', authUser.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(t('agent_selfAssignAgenciesError'));
      }

      // Refresh agents
      const updatedAgents = await fetchAgents(currentUserId);
      setAgents(updatedAgents);
      setNewAgent({ name: '', email: '', phone: '', role: '', agency_ids: [], password: '' });
      setShowAddForm(false);
      setSnackbar({ open: true, message: t('agent_addedSuccess'), severity: 'success' });
    } catch (error) {
      logError('AddAgent', error);
      setSnackbar({
        open: true,
        message: error.message.includes('not initialized') || error.message.includes('User not allowed')
          ? t('agent_insufficientPermissions', { error: error.message })
          : t('agent_addError', { error: error.message }),
        severity: 'error',
      });
    }
  };

  // Start editing an agent
  const startEdit = (agent) => {
    if (!roleMatrix[userRole]?.canUpdateAgent) {
      setSnackbar({ open: true, message: t('agent_noPermissionUpdate'), severity: 'error' });
      return;
    }
    if (userRole === 'Agent Supervisor' && agent.role !== 'Ticketing Agent') {
      setSnackbar({ open: true, message: t('agent_supervisorEditRestriction'), severity: 'error' });
      return;
    }
    setEditAgent({ ...agent, password: '' });
    setShowEditForm(true);
  };

  // Update an agent
  const updateAgent = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canUpdateAgent) {
      setSnackbar({ open: true, message: t('agent_noPermissionUpdate'), severity: 'error' });
      return;
    }
    try {
      if (
        !editAgent.name.trim() ||
        !editAgent.email.trim() ||
        !editAgent.phone
      ) {
        setSnackbar({ open: true, message: t('agent_requiredFields'), severity: 'error' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editAgent.email)) {
        setSnackbar({ open: true, message: t('agent_invalidEmail'), severity: 'error' });
        return;
      }
      if (!isValidPhoneNumber(editAgent.phone)) {
        setSnackbar({ open: true, message: t('agent_invalidPhone'), severity: 'error' });
        return;
      }
      if (editAgent.password && !validatePassword(editAgent.password)) {
        setSnackbar({
          open: true,
          message: t('agent_invalidPassword'),
          severity: 'error',
        });
        return;
      }
      if (editAgent.user_id !== currentUserId && !roleMatrix[userRole]?.canAssignAnyRole && !roleOptions().includes(editAgent.role)) {
        setSnackbar({ open: true, message: t('agent_invalidRole'), severity: 'error' });
        return;
      }
      if (editAgent.user_id === currentUserId && editAgent.role !== agents.find((a) => a.user_id === currentUserId)?.role) {
        setSnackbar({ open: true, message: t('agent_selfRoleChangeError'), severity: 'error' });
        return;
      }

      // Validate agency_ids for non-current users
      if (editAgent.user_id !== currentUserId && editAgent.agency_ids.length > 0) {
        const { data: validAgencies, error: agencyError } = await supabase
          .from('agencies')
          .select('id')
          .eq('company_id', companyId)
          .in('id', editAgent.agency_ids);
        if (agencyError) throw new Error(t('agent_agencyValidationError', { error: agencyError.message }));
        const validAgencyIds = validAgencies.map((a) => a.id);
        if (editAgent.agency_ids.some((id) => !validAgencyIds.includes(id))) {
          setSnackbar({
            open: true,
            message: t('agent_invalidAgencies'),
            severity: 'error',
          });
          return;
        }
        if (!roleMatrix[userRole]?.canAssignAnyAgency) {
          const allowedAgencies = agencies.map((a) => a.id);
          if (editAgent.agency_ids.some((id) => !allowedAgencies.includes(id))) {
            setSnackbar({
              open: true,
              message: t('agent_unauthorizedAgencies'),
              severity: 'error',
            });
            return;
          }
        }
      }

      // Ensure no agency assignments for current user
      const originalAgent = agents.find((a) => a.user_id === editAgent.user_id);
      const hasAgencyChanges = JSON.stringify(editAgent.agency_ids) !== JSON.stringify(originalAgent.agency_ids);
      if (editAgent.user_id === currentUserId && hasAgencyChanges) {
        setSnackbar({
          open: true,
          message: t('agent_selfAssignAgenciesError'),
          severity: 'error',
        });
        return;
      }

      // Update users table
      const updateData = {
        name: editAgent.name,
        email: editAgent.email,
        phone: editAgent.phone,
        permissions: [],
      };
      if (editAgent.user_id !== currentUserId) {
        updateData.role = editAgent.role;
      }
      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', editAgent.user_id);
      if (userError) throw new Error(t('agent_updateUserError', { error: userError.message }));

      // Update user_agencies if not the current user
      if (editAgent.user_id !== currentUserId) {
        await supabase.from('user_agencies').delete().eq('user_id', editAgent.user_id);
        if (editAgent.agency_ids.length > 0) {
          const userAgencies = editAgent.agency_ids.map((agency_id) => ({
            user_id: editAgent.user_id,
            agency_id,
            created_at: new Date().toISOString(),
          }));
          const { error: agencyError } = await supabase.from('user_agencies').insert(userAgencies);
          if (agencyError) throw new Error(t('agent_updateAgenciesError', { error: agencyError.message }));
        }
      }

      // Update password if provided
      if (editAgent.password) {
        if (!supabaseAdmin) {
          logError('UpdateAgent', new Error('Supabase admin client not initialized, skipping password update'));
          setSnackbar({
            open: true,
            message: t('agent_passwordUpdateSkipped'),
            severity: 'warning',
          });
        } else {
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(editAgent.user_id, {
            password: editAgent.password,
          });
          if (passwordError) {
            logError('UpdateAgentPassword', passwordError);
            setSnackbar({
              open: true,
              message: t('agent_passwordUpdateError', { error: passwordError.message }),
              severity: 'error',
            });
          }
        }
      }

      // Refresh agents
      const updatedAgents = await fetchAgents(currentUserId);
      setAgents(updatedAgents);
      setShowEditForm(false);
      setEditAgent(null);
      setSnackbar({ open: true, message: t('agent_updatedSuccess'), severity: 'success' });
    } catch (error) {
      logError('UpdateAgent', error);
      setSnackbar({
        open: true,
        message: t('agent_updateError', { error: error.message }),
        severity: 'error',
      });
    }
  };

  // Delete an agent
  const deleteAgent = async (user_id) => {
    if (!roleMatrix[userRole]?.canDeleteAgent) {
      setSnackbar({ open: true, message: t('agent_noPermissionDelete'), severity: 'error' });
      return;
    }
    if (user_id === currentUserId) {
      setSnackbar({ open: true, message: t('agent_selfDeleteError'), severity: 'error' });
      return;
    }
    if (!window.confirm(t('agent_confirmDelete'))) return;

    try {
      if (!supabaseAdmin) {
        throw new Error(t('agent_supabaseAdminNotInitialized'));
      }

      // Step 1: Delete from user_agencies
      const { error: agencyError } = await supabase.from('user_agencies').delete().eq('user_id', user_id);
      if (agencyError) {
        logError('DeleteAgentAgencies', agencyError, { user_id });
        throw new Error(t('agent_deleteAgenciesError', { error: agencyError.message }));
      }

      // Step 2: Delete from users table
      const { error: userError } = await supabase.from('users').delete().eq('user_id', user_id);
      if (userError) {
        logError('DeleteAgentUsers', userError, { user_id });
        // Attempt to restore user_agencies (rollback)
        await supabase.from('user_agencies').insert(
          agents
            .find((agent) => agent.user_id === user_id)
            ?.agency_ids.map((agency_id) => ({
              user_id,
              agency_id,
              created_at: new Date().toISOString(),
            })) || []
        );
        throw new Error(t('agent_deleteUserError', { error: userError.message }));
      }

      // Step 3: Delete from auth.users
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (authError) {
        logError('DeleteAgentAuth', authError, { user_id });
        // Attempt to restore users table (rollback)
        const agent = agents.find((a) => a.user_id === user_id);
        if (agent) {
          await supabase.from('users').insert({
            user_id: agent.user_id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            status: 'active',
            company_id: companyId,
            role: agent.role,
            permissions: agent.permissions,
          });
          // Restore user_agencies
          await supabase.from('user_agencies').insert(
            agent.agency_ids.map((agency_id) => ({
              user_id,
              agency_id,
              created_at: new Date().toISOString(),
            }))
          );
        }
        throw new Error(t('agent_deleteAuthError', { error: authError.message }));
      }

      // Refresh agents
      const updatedAgents = await fetchAgents(currentUserId);
      setAgents(updatedAgents);
      setSnackbar({ open: true, message: t('agent_deletedSuccess'), severity: 'success' });
    } catch (error) {
      logError('DeleteAgent', error, { user_id });
      setSnackbar({
        open: true,
        message: t('agent_deleteError', { error: error.message }),
        severity: 'error',
      });
    }
  };

  // Helper function to fetch agents
  const fetchAgents = async (userId) => {
    let usersQuery = supabase
      .from('users')
      .select('user_id, name, email, phone, status, company_id, role')
      .eq('company_id', companyId)
      .eq('status', 'active');
    if (!roleMatrix[userRole]?.canViewAgents) {
      usersQuery = usersQuery.eq('user_id', userId);
    } else if (userRole === 'Agent Supervisor') {
      usersQuery = usersQuery.eq('created_by', userId).eq('role', 'Ticketing Agent');
    }

    const { data: usersData, error: usersError } = await withTimeout(usersQuery);
    if (usersError) throw new Error(t('agent_usersFetchError', { error: usersError.message }));

    let userAgenciesData = [];
    if (usersData.length > 0) {
      const { data, error: userAgenciesError } = await withTimeout(
        supabase
          .from('user_agencies')
          .select('user_id, agency_id')
          .in('user_id', usersData.map((user) => user.user_id))
      );
      if (userAgenciesError) throw new Error(t('agent_agencyFetchError', { error: userAgenciesError.message }));
      userAgenciesData = data || [];
    }

    let formattedAgents = usersData
      .map((user) => {
        const userAgencyIds = userAgenciesData
          .filter((ua) => ua.user_id === user.user_id)
          .map((ua) => ua.agency_id);
        return {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role || '',
          permissions: [],
          agency_ids: userAgencyIds,
          password: '',
        };
      })
      .filter((agent) => agent.role && agent.role !== 'Super Admin');

    // Sort agents to place current user at the top
    formattedAgents = formattedAgents.sort((a, b) => {
      if (a.user_id === userId) return -1;
      if (b.user_id === userId) return 1;
      return a.name.localeCompare(b.name);
    });

    return formattedAgents;
  };

  // Render form for adding/editing agents
  const renderAgentForm = (isEdit = false) => {
    const agentData = isEdit ? editAgent : newAgent;
    const setAgentData = isEdit ? setEditAgent : setNewAgent;
    const handleSubmit = isEdit ? updateAgent : addAgent;
    const title = isEdit ? t('agent_editTitle', { name: agentData?.name || '' }) : t('agent_addTitle');
    const submitText = isEdit ? t('agent_update') : t('agent_add');
    const isSelfEdit = isEdit && agentData?.user_id === currentUserId;

    if (isEdit && !agentData) return null;

    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card
          sx={{
            width: '80%',
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            transition: 'transform 0.3s ease-in-out',
            ...(isSelfEdit && {
              backgroundColor: 'primary.light',
              border: '1px solid',
              borderColor: 'primary.main',
            }),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader
            title={
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                {isEdit ? (
                  <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
                ) : (
                  <AddCircleOutlineIcon sx={{ mr: 1, color: 'primary.main' }} />
                )}
                {title}
                {isSelfEdit && (
                  <Chip
                    label={t('agent_yourProfile')}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                    icon={<AccountCircleIcon />}
                  />
                )}
              </Typography>
            }
          />
          <Divider />
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('agent_name')}
                    value={agentData.name}
                    onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                    placeholder={t('agent_namePlaceholder')}
                    required
                    variant="outlined"
                    className={isSelfEdit ? 'currentUserField' : ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: isSelfEdit ? 'primary.main' : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    aria-label={t('agent_name')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('agent_email')}
                    value={agentData.email}
                    onChange={(e) => setAgentData({ ...agentData, email: e.target.value })}
                    placeholder={t('agent_emailPlaceholder')}
                    required
                    type="email"
                    variant="outlined"
                    className={isSelfEdit ? 'currentUserField' : ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: isSelfEdit ? 'primary.main' : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    aria-label={t('agent_email')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <PhoneInput
                    international
                    defaultCountry="CM"
                    value={agentData.phone}
                    onChange={(value) => setAgentData({ ...agentData, phone: value || '' })}
                    placeholder={t('agent_phonePlaceholder')}
                    required
                    style={{
                      padding: '16.5px 14px',
                      border: `1px solid ${isSelfEdit ? '#1976d2' : theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      fontSize: '16px',
                      backgroundColor: isSelfEdit ? '#e8f0fe' : theme.palette.background.paper,
                    }}
                    className={isSelfEdit ? 'currentUserField' : ''}
                    aria-label={t('agent_phone')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={isEdit ? t('agent_newPasswordOptional') : t('agent_password')}
                    value={agentData.password}
                    onChange={(e) => setAgentData({ ...agentData, password: e.target.value })}
                    placeholder={t('agent_passwordPlaceholder')}
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    required={!isEdit}
                    className={isSelfEdit ? 'currentUserField' : ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: isSelfEdit ? 'primary.main' : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={t('agent_togglePasswordVisibility')}
                            onClick={handleClickShowPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    aria-label={isEdit ? t('agent_newPasswordOptional') : t('agent_password')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label={t('agent_role')}
                    value={agentData.role || ''}
                    onChange={(e) => setAgentData({ ...agentData, role: e.target.value })}
                    required
                    variant="outlined"
                    disabled={isSelfEdit}
                    className={`${isSelfEdit ? 'currentUserField' : ''} ${isSelfEdit ? 'disabledField' : ''}`}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: isSelfEdit ? 'primary.main' : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: isSelfEdit && (
                        <InputAdornment position="end">
                          <LockIcon sx={{ color: 'grey.500' }} />
                        </InputAdornment>
                      ),
                    }}
                    helperText={isSelfEdit ? t('agent_selfRoleLocked') : ''}
                    aria-label={t('agent_role')}
                    aria-describedby={isSelfEdit ? 'role-locked-helper-text' : undefined}
                  >
                    <MenuItem value="">{t('agent_selectRole')}</MenuItem>
                    {roleOptions().map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label={t('agent_agenciesOptional')}
                    value={agentData.agency_ids || []}
                    onChange={(e) => setAgentData({ ...agentData, agency_ids: e.target.value })}
                    variant="outlined"
                    disabled={agencies.length === 0 || isSelfEdit}
                    className={`${isSelfEdit ? 'currentUserField' : ''} ${isSelfEdit || agencies.length === 0 ? 'disabledField' : ''}`}
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) =>
                        selected.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((id) => {
                              const agency = agencies.find((a) => a.id === id);
                              return agency ? <Chip key={id} label={agency.name} size="small" /> : null;
                            })}
                          </Box>
                        ) : (
                          t('agent_selectAgencies')
                        ),
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StoreIcon sx={{ color: isSelfEdit ? 'primary.main' : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: isSelfEdit && (
                        <InputAdornment position="end">
                          <LockIcon sx={{ color: 'grey.500' }} />
                        </InputAdornment>
                      ),
                    }}
                    helperText={
                      isSelfEdit
                        ? t('agent_selfAgenciesLocked')
                        : agencies.length === 0
                        ? t('agent_noAgenciesAvailable')
                        : t('agent_selectAgenciesHelper')
                    }
                    aria-label={t('agent_agenciesOptional')}
                    aria-describedby={isSelfEdit ? 'agencies-locked-helper-text' : undefined}
                  >
                    {agencies.map((agency) => (
                      <MenuItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={loading}
                      aria-label={submitText}
                    >
                      <CheckIcon sx={{ mr: 1 }} />
                      {submitText}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (isEdit) {
                          setShowEditForm(false);
                          setEditAgent(null);
                        } else {
                          setShowAddForm(false);
                          setNewAgent({ name: '', email: '', phone: '', role: '', agency_ids: [], password: '' });
                        }
                      }}
                      disabled={loading}
                      aria-label={t('agent_cancel')}
                    >
                      <CloseIcon sx={{ mr: 1 }} />
                      {t('agent_cancel')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress aria-label={t('loading')} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t('loading')}
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" color="error">
              {t('agent_error', { error })}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
              aria-label={t('retry')}
            >
              {t('retry')}
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }}>
              {t('agent_contactSupport')}
            </Typography>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary t={t}>
        <Box sx={{ p: 3 }}>
          <Breadcrumb title={t('agent_pageTitle')}>
            <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
              {t('agent_pageTitle')}
            </Typography>
          </Breadcrumb>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                <CardHeader
                  title={
                    <Typography component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      {t('agent_listTitle')}
                      {isTemporaryRole && temporaryRoleExpiry && (
                        <Chip
                          label={t('agent_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  }
                  action={
                    roleMatrix[userRole]?.canCreateAgent && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setShowAddForm(true)}
                        startIcon={<AddCircleOutlineIcon />}
                        disabled={loading}
                        aria-label={t('agent_addAgent')}
                      >
                        {t('agent_addAgent')}
                      </Button>
                    )
                  }
                />
                <Divider />
                <CardContent>
                  {agents.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, color: 'info.main' }} />
                      {t('agent_noAgents', { action: roleMatrix[userRole]?.canCreateAgent ? t('agent_addAction') : t('agent_contactAdminAction') })}
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <Table aria-label={t('agent_table')}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1 }} />
                                {t('agent_name')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1 }} />
                                {t('agent_role')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StoreIcon sx={{ mr: 1 }} />
                                {t('agent_agencies')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PhoneIcon sx={{ mr: 1 }} />
                                {t('agent_phone')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <EmailIcon sx={{ mr: 1 }} />
                                {t('agent_email')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                {t('agent_actions')}
                              </Box>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {agents.map((agent) => {
                            const agentAgencies = agencies
                              .filter((a) => agent.agency_ids.includes(a.id))
                              .map((a) => a.name)
                              .join(', ') || t('agent_noAgencies');
                            const isCurrentUser = agent.user_id === currentUserId;
                            return (
                              <TableRow
                                key={agent.user_id}
                                className={isCurrentUser ? 'currentUserRow' : ''}
                                aria-label={isCurrentUser ? t('agent_yourProfile') : t('agent_profile', { name: agent.name || 'N/A' })}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {isCurrentUser ? (
                                      <Badge
                                        badgeContent={t('agent_you')}
                                        color="primary"
                                        sx={{ mr: 1 }}
                                        aria-label={t('agent_currentUser')}
                                      >
                                        <AccountCircleIcon sx={{ color: 'primary.main' }} />
                                      </Badge>
                                    ) : (
                                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    )}
                                    {agent.name || 'N/A'}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PersonIcon sx={{ mr: 1, color: 'info.main' }} />
                                    {agent.role || 'N/A'}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <StoreIcon sx={{ mr: 1, color: 'info.main' }} />
                                    {agentAgencies}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PhoneIcon sx={{ mr: 1, color: 'success.main' }} />
                                    {agent.phone || 'N/A'}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <EmailIcon sx={{ mr: 1, color: 'success.main' }} />
                                    {agent.email || 'N/A'}
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  {roleMatrix[userRole]?.canUpdateAgent && (
                                    <Tooltip title={t('agent_edit')}>
                                      <IconButton
                                        color="primary"
                                        onClick={() => startEdit(agent)}
                                        disabled={loading}
                                        aria-label={t('agent_edit', { name: agent.name || t('agent') })}
                                      >
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {roleMatrix[userRole]?.canDeleteAgent && agent.user_id !== currentUserId && (
                                    <Tooltip title={t('agent_delete')}>
                                      <IconButton
                                        color="error"
                                        onClick={() => deleteAgent(agent.user_id)}
                                        disabled={loading}
                                        aria-label={t('agent_delete', { name: agent.name || t('agent') })}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {showAddForm && renderAgentForm(false)}
          {showEditForm && renderAgentForm(true)}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} aria-live="assertive">
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default AgentManagement;