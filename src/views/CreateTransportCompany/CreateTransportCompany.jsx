import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress, Tooltip, IconButton, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, FormControl, Dialog,
  DialogTitle, DialogContent, DialogActions, Collapse, FormHelperText, Grid, Card, CardContent,
  Input, Chip, Menu, MenuItem, Select, InputLabel
} from '@mui/material';
import * as Yup from 'yup';
import { Formik } from 'formik';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopy from '@mui/icons-material/FileCopy';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import PublicIcon from '@mui/icons-material/Public';
import ImageIcon from '@mui/icons-material/Image';
import CancelIcon from '@mui/icons-material/Cancel';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
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
  if (!React || !useTheme || !Yup || !Formik || !toast || !supabase || !PhoneInput) {
    throw new Error('Missing dependency');
  }
  logSuccess('DependencyCheck', 'Dependencies validated');
};

const validateEnvironment = () => {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    const err = new Error('Missing environment variables');
    logError('EnvironmentValidation', err);
    return err;
  }
  return null;
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
            <Typography variant="h6">Application Error</Typography>
            <Typography>{this.state.error?.message || 'Unexpected error.'}</Typography>
            <Typography variant="caption">Details: {this.state.errorInfo?.componentStack.split('\n')[0]}</Typography>
            <Typography>Check logs or contact support.</Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>Retry</Button>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

const DiagnosticOverlay = ({ error, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isNetwork = error?.message?.includes('network') || error?.message?.includes('timeout');

  const errorDetails = JSON.stringify(
    { message: error?.message, code: error?.code, timestamp: new Date().toISOString() },
    null,
    2
  );

  const handleCopyError = () => {
    navigator.clipboard.writeText(errorDetails);
    toast.info('Error details copied');
  };

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6">{isNetwork ? 'Network Error' : 'Critical Error'}</Typography>
        <Typography>{error?.message || 'Unexpected error.'}</Typography>
        <Typography variant="caption">Check logs or contact support.</Typography>
        <Button onClick={() => setShowDetails(!showDetails)} sx={{ mt: 1 }} size="small" variant="text">
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
        <Collapse in={showDetails}>
          <Typography variant="caption" component="pre" sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100', p: 1 }}>
            {errorDetails}
          </Typography>
        </Collapse>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {onRetry && <Button onClick={onRetry}>Retry</Button>}
          <Button onClick={() => window.location.reload()}>Refresh</Button>
          <Tooltip title="Copy error"><IconButton onClick={handleCopyError}><FileCopy /></IconButton></Tooltip>
          <Button href="https://support.example.com" target="_blank">Support</Button>
        </Box>
      </Alert>
    </Box>
  );
};

// --- THIS IS THE ONLY ROLES FETCHING FUNCTION YOU NEED ---
// Get the user's role from the users table (not from super_admin_roles/user_roles)
const fetchRoles = async (userId) => {
  try {
    const { data: userRow, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    if (!userRow || !userRow.role) return [];
    return [{ role: userRow.role }];
  } catch (err) {
    logError('RoleFetch', err, { userId });
    return [];
  }
};

const CreateTransportCompany = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [filteredAgencies, setFilteredAgencies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAgency, setEditingAgency] = useState(null);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [userAgencies, setUserAgencies] = useState([]);
  const [temporaryElevation, setTemporaryElevation] = useState(null);
  const [openElevationDialog, setOpenElevationDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const withTimeout = async (promise, ms = 10000) => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
    return Promise.race([promise, timeout]);
  };

  useEffect(() => {
    if (!supabase) {
      const initError = new Error('Supabase client not initialized');
      logError('SupabaseInit', initError);
      setError(initError);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const start = performance.now();
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) {
          logError('AuthCheck', sessionError, { note: 'Session fetch failed' });
          throw sessionError;
        }
        if (!session || !session.user?.id) {
          logError('AuthCheck', new Error('No active session or user ID'), { session: session });
          toast.error('Please sign in to manage your company.');
          navigate('/application/login');
          return;
        }

        const rolesData = await fetchRoles(session.user.id);
        setUserRoles(rolesData);

        try {
          const { data: elevationData, error: elevationError } = await supabase
            .from('temporary_role_elevations')
            .select('elevated_role, start_time, end_time')
            .eq('user_id', session.user.id)
            .gt('end_time', new Date().toISOString())
            .single();
          if (elevationError && elevationError.code !== 'PGRST116') {
            logError('ElevationFetch', elevationError, { userId: session.user.id });
          }
          setTemporaryElevation(elevationData);
        } catch (err) {
          logError('ElevationFetch', err, { userId: session.user.id });
        }

        const { data: userAgenciesData, error: userAgenciesError } = await supabase
          .from('user_agencies')
          .select('agency_id')
          .eq('user_id', session.user.id);
        if (userAgenciesError) {
          logError('UserAgenciesFetch', userAgenciesError, { userId: session.user.id });
          throw userAgenciesError;
        }
        setUserAgencies(userAgenciesData || []);

        const { data: companyData, error: companyError } = await supabase
          .from('transport_companies')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (companyError) {
          if (companyError.code === 'PGRST116') {
            setCompany(null);
            logSuccess('DataFetch', 'No company found', { userId: session.user.id });
          } else {
            logError('CompanyFetch', companyError, { userId: session.user.id });
            throw companyError;
          }
        } else {
          setCompany(companyData);
          const agencyQuery = supabase.from('agencies').select('*').eq('company_id', companyData.id);
          if (!rolesData.some(r => r.role === 'Super Admin') && userAgenciesData.length > 0) {
            agencyQuery.in('id', userAgenciesData.map(ua => ua.agency_id));
          }
          const { data: agenciesData, error: agenciesError } = await agencyQuery;
          if (agenciesError) {
            logError('AgenciesFetch', agenciesError, { userId: session.user.id });
            throw agenciesError;
          }
          setAgencies(agenciesData || []);
          setFilteredAgencies(agenciesData || []);
          logSuccess('DataFetch', 'Company and agencies fetched', { userId: session.user.id, companyId: companyData.id });
        }
      } catch (err) {
        logError('DataFetch', err, { userId: session?.user?.id });
        toast.error(err.message || 'Failed to load company data');
        setError(err);
      } finally {
        setIsLoading(false);
        logSuccess('DataFetch', `Completed in ${performance.now() - start}ms`);
      }
    };

    try {
      checkDependencies();
      const envError = validateEnvironment();
      if (envError) throw envError;
      fetchData();
    } catch (depError) {
      logError('Initialization', depError);
      setError(depError);
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredAgencies(agencies);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredAgencies(
        agencies.filter(
          agency =>
            agency?.name?.toLowerCase().includes(lowerQuery) ||
            agency?.address?.toLowerCase().includes(lowerQuery) ||
            agency?.email?.toLowerCase().includes(lowerQuery)
        )
      );
    }
  }, [searchQuery, agencies]);

  const effectiveRole = () => {
    if (temporaryElevation && new Date(temporaryElevation.end_time) > new Date()) {
      return temporaryElevation.elevated_role;
    }
    if (userRoles.some(r => r.role === 'Super Admin')) return 'Super Admin';
    if (userRoles.some(r => r.role === 'Operations Manager')) return 'Operations Manager';
    if (userRoles.some(r => r.role === 'Agent Supervisor')) return 'Agent Supervisor';
    if (userRoles.some(r => r.role === 'Ticketing Agent')) return 'Ticketing Agent';
    return null;
  };

  const role = effectiveRole();

  const canManageCompany = ['Super Admin'].includes(role);
  const canCreateAgency = ['Super Admin', 'Operations Manager'].includes(role);
  const canUpdateAgency =
    ['Super Admin', 'Operations Manager'].includes(role) ||
    (['Agent Supervisor'].includes(role) && userAgencies.length > 0);
  const canDeleteAgency = ['Super Admin'].includes(role);
  const canRequestElevation = ['Agent Supervisor'].includes(role) && !temporaryElevation;
  const canViewCompanyPage = ['Super Admin', 'Operations Manager', 'Agent Supervisor', 'Ticketing Agent'].includes(role);

  const handleLogoUpload = async (file, userId) => {
    try {
      if (!userId) throw new Error('User ID is missing for logo upload');
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw new Error(`Failed to upload logo: ${error.message}`);
      const { data: publicUrlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      if (!publicUrlData?.publicUrl) throw new Error('Failed to retrieve public URL');
      return publicUrlData.publicUrl;
    } catch (error) {
      logError('LogoUpload', error, { userId });
      throw error;
    }
  };

  // FIXED: Do NOT provide the "id" key when creating a company!
  const handleCreateCompany = async (values, { setSubmitting }) => {
    const start = performance.now();
    try {
      if (!canManageCompany) throw new Error('Insufficient permissions to create a company');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logError('CompanyCreate', sessionError, { note: 'Session fetch failed' });
        throw sessionError;
      }
      if (!session || !session.user?.id) {
        logError('CompanyCreate', new Error('No active session or user ID'), { session: session });
        throw new Error('No active session. Please sign in again.');
      }
      console.log('Creating company for user_id:', session.user.id);

      let logoUrl = await handleLogoUpload(values.logoFile, session.user.id);
      const companyData = {
        user_id: session.user.id,
        name: values.companyName,
        headquarters_location: values.headquartersLocation,
        contact_phone: values.contactPhone,
        contact_email: values.contactEmail,
        operational_scope: values.operationalScope,
        logo_url: logoUrl,
        // DO NOT include id!
      };

      // FIXED: Only insert fields, let DB generate id
      const { data: company, error: companyError } = await supabase
        .from('transport_companies')
        .insert(companyData)
        .select()
        .single();
      if (companyError) {
        logError('CompanyCreate', companyError, { userId: session.user.id });
        if (companyError.code === '23505') throw new Error('A company with this email already exists.');
        throw new Error(`Company creation failed: ${companyError.message}`);
      }

      const { error: roleError } = await supabase.rpc('assign_super_admin_role', { p_user_id: session.user.id });
      if (roleError) {
        logError('CompanyCreate', roleError, { userId: session.user.id, companyId: company.id });
        await supabase.from('transport_companies').delete().eq('id', company.id);
        throw new Error(`Role assignment failed: ${roleError.message}`);
      }

      setCompany(company);
      setUserRoles([{ role: 'Super Admin' }]);
      logSuccess('CompanyCreate', 'Company created', { companyId: company.id, userId: session.user.id });
      toast.success('Company created! You are now a Super Admin.');
      navigate('/dashboard/default');
    } catch (error) {
      logError('CompanyCreate', error);
      let errorMessage = error.message || 'Failed to create company';
      if (error.message.includes('permission denied')) errorMessage = 'Permission error: Contact administrator.';
      toast.error(errorMessage);
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('CompanyCreate', `Completed in ${performance.now() - start}ms`);
    }
  };


  
  const handleSaveAgency = async (values, { setSubmitting, resetForm }) => {
    const start = performance.now();
    try {
      if (!canCreateAgency && !canUpdateAgency) throw new Error('Insufficient permissions to save agency');
      const agencyData = {
        company_id: company.id,
        name: values.agencyName,
        address: values.agencyAddress,
        phone: values.agencyPhone,
        email: values.agencyEmail,
        manager_name: values.managerName,
      };

      let data, error;
      if (editingAgency) {
        if (['Agent Supervisor'].includes(role) && !userAgencies.some(ua => ua.agency_id === editingAgency.id)) {
          throw new Error('You can only update agencies assigned to you');
        }
        ({ data, error } = await supabase.from('agencies').update(agencyData).eq('id', editingAgency.id).select().single());
      } else {
        if (!canCreateAgency) throw new Error('You cannot create new agencies');
        ({ data, error } = await supabase.from('agencies').insert(agencyData).select().single());
      }

      if (error) {
        if (error.code === '23505') throw new Error('An agency with this name already exists.');
        throw new Error(`Failed to save agency: ${error.message}`);
      }
      if (editingAgency) {
        setAgencies(agencies.map(agency => agency.id === data.id ? data : agency));
        setFilteredAgencies(filteredAgencies.map(agency => agency.id === data.id ? data : agency));
        logSuccess('AgencyUpdate', 'Agency updated', { agencyId: data.id });
        toast.success('Agency updated!');
        setEditingAgency(null);
      } else {
        setAgencies([...agencies, data]);
        setFilteredAgencies([...filteredAgencies, data]);
        logSuccess('AgencyCreate', 'Agency created', { agencyId: data.id });
        toast.success('Agency created!');
      }

      setShowAgencyForm(false);
      resetForm();
    } catch (error) {
      logError('AgencySave', error);
      toast.error(error.message || 'Failed to save agency');
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('AgencySave', `Completed in ${performance.now() - start}ms`);
    }
  };

  const handleDeleteAgency = async (agencyId) => {
    const start = performance.now();
    try {
      if (!canDeleteAgency) throw new Error('Insufficient permissions to delete agency');
      const { error } = await supabase.from('agencies').delete().eq('id', agencyId);
      if (error) throw new Error(`Failed to delete agency: ${error.message}`);
      setAgencies(agencies.filter(agency => agency.id !== agencyId));
      setFilteredAgencies(filteredAgencies.filter(agency => agency.id !== agencyId));
      logSuccess('AgencyDelete', 'Agency deleted', { agencyId });
      toast.success('Agency deleted!');
    } catch (error) {
      logError('AgencyDelete', error);
      toast.error(error.message || 'Failed to delete agency');
      setError(error);
    } finally {
      logSuccess('AgencyDelete', `Completed in ${performance.now() - start}ms`);
    }
  };

  const handleRequestElevation = async () => {
    const start = performance.now();
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logError('ElevationRequest', sessionError, { note: 'Session fetch failed' });
        throw sessionError;
      }
      if (!session || !session.user?.id) {
        logError('ElevationRequest', new Error('No active session or user ID'), { session: session });
        throw new Error('No active session. Please sign in again.');
      }
      const elevationData = {
        user_id: session.user.id,
        elevated_role: 'Operations Manager',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      const { data, error } = await supabase.from('temporary_role_elevations').insert(elevationData).select().single();
      if (error) {
        if (error.code === '23505') throw new Error('An active temporary elevation already exists.');
        throw new Error(`Failed to request elevation: ${error.message}`);
      }
      setTemporaryElevation(data);
      logSuccess('ElevationRequest', 'Elevation granted', { userId: session.user.id });
      toast.success('Elevated to Operations Manager for 24 hours!');
      setOpenElevationDialog(false);
    } catch (error) {
      logError('ElevationRequest', error);
      toast.error(error.message || 'Failed to request elevation');
      setError(error);
    } finally {
      logSuccess('ElevationRequest', `Completed in ${performance.now() - start}ms`);
    }
  };

  if (!supabase) {
    const initError = new Error('Database connection failed. Check environment variables.');
    logError('SupabaseInit', initError);
    return <DiagnosticOverlay error={initError} />;
  }

  if (error) {
    logError('ComponentError', error);
    return <DiagnosticOverlay error={error} onRetry={() => setError(null)} />;
  }

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (!canViewCompanyPage) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          <Typography>
            You do not have permission to access the company management page. Role fetch attempts: user_roles={roleFetchAttempts.user_roles}, super_admin_roles={roleFetchAttempts.super_admin_roles}.
            Please ensure your user is assigned a valid role in the users table and check RLS policies. Contact your administrator for assistance.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon /> Manage Transport Company
          {role && <Chip label={role} color={role === 'Super Admin' ? 'primary' : 'secondary'} sx={{ ml: 2 }} />}
        </Typography>

        {!company ? (
          canManageCompany ? (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon /> Create Transport Company
                </Typography>
                <Formik
                  initialValues={{
                    companyName: '',
                    headquartersLocation: '',
                    contactPhone: '',
                    contactEmail: '',
                    operationalScope: 'regional',
                    logoFile: null,
                    submit: null,
                  }}
                  validationSchema={Yup.object().shape({
                    companyName: Yup.string().max(255).required('Company name required'),
                    headquartersLocation: Yup.string().max(255).required('Headquarters location required'),
                    contactPhone: Yup.string().required('Contact phone required'),
                    contactEmail: Yup.string().email('Invalid email').max(255).required('Contact email required'),
                    operationalScope: Yup.string().oneOf(['regional', 'international']).required('Operational scope required'),
                    logoFile: Yup.mixed()
                      .required('Logo file required')
                      .test('fileType', 'Only images allowed', value => value ? ['image/jpeg', 'image/png', 'image/gif'].includes(value.type) : false)
                      .test('fileSize', 'File must be < 5MB', value => value ? value.size <= 5 * 1024 * 1024 : false),
                  })}
                  onSubmit={handleCreateCompany}
                >
                  {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue }) => (
                    <Box component="form" noValidate onSubmit={handleSubmit}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            error={Boolean(touched.companyName && errors.companyName)}
                            helperText={touched.companyName && errors.companyName}
                            label="Company Name"
                            margin="normal"
                            name="companyName"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.companyName}
                            variant="outlined"
                            InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            error={Boolean(touched.headquartersLocation && errors.headquartersLocation)}
                            helperText={touched.headquartersLocation && errors.headquartersLocation}
                            label="Headquarters Location"
                            margin="normal"
                            name="headquartersLocation"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.headquartersLocation}
                            variant="outlined"
                            InputProps={{ startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal" error={Boolean(touched.contactPhone && errors.contactPhone)}>
                            <PhoneInput
                              international
                              defaultCountry="US"
                              value={values.contactPhone}
                              onChange={value => setFieldValue('contactPhone', value)}
                              onBlur={handleBlur}
                              placeholder="Enter phone number"
                              style={{
                                padding: '10px',
                                border: errors.contactPhone && touched.contactPhone ? '1px solid red' : '1px solid #ccc',
                                borderRadius: '4px',
                              }}
                            />
                            {touched.contactPhone && errors.contactPhone && (
                              <FormHelperText error>{errors.contactPhone}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            error={Boolean(touched.contactEmail && errors.contactEmail)}
                            helperText={touched.contactEmail && errors.contactEmail}
                            label="Contact Email"
                            margin="normal"
                            name="contactEmail"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.contactEmail}
                            variant="outlined"
                            InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal">
                            <InputLabel>Operational Scope</InputLabel>
                            <Select
                              name="operationalScope"
                              value={values.operationalScope}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={Boolean(touched.operationalScope && errors.operationalScope)}
                            >
                              <MenuItem value="regional">Regional</MenuItem>
                              <MenuItem value="international">International</MenuItem>
                            </Select>
                            {touched.operationalScope && errors.operationalScope && (
                              <FormHelperText error>{errors.operationalScope}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal" error={Boolean(touched.logoFile && errors.logoFile)}>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={event => setFieldValue('logoFile', event.currentTarget.files[0])}
                              onBlur={handleBlur}
                              name="logoFile"
                              sx={{ pt: 1 }}
                            />
                            {touched.logoFile && errors.logoFile && (
                              <FormHelperText error>{errors.logoFile}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button
                          color="secondary"
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => navigate('/dashboard/default')}
                          sx={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          color="primary"
                          disabled={isSubmitting}
                          type="submit"
                          variant="contained"
                          sx={{ flex: 1 }}
                        >
                          Create Company
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Formik>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="error">
              <Typography>You do not have permission to create a transport company. Please contact your administrator to assign the Super Admin role.</Typography>
            </Alert>
          )
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon /> Company Overview
              </Typography>
              {canManageCompany && (
                <Box>
                  <IconButton onClick={handleMenuClick}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={() => { handleMenuClose(); navigate(`/company/${company.id}/edit`); }}>
                      Edit Company
                    </MenuItem>
                  </Menu>
                </Box>
              )}
            </Box>
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography><BusinessIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>Name:</strong> {company.name}</Typography>
                    <Typography><LocationOnIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>Headquarters:</strong> {company.headquarters_location}</Typography>
                    <Typography><PhoneIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>Contact Phone:</strong> {company.contact_phone}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><EmailIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>Contact Email:</strong> {company.contact_email}</Typography>
                    <Typography><PublicIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>Operational Scope:</strong> {company.operational_scope}</Typography>
                    <Typography><ImageIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>Logo:</strong> <img src={company.logo_url} alt="Company Logo" style={{ maxWidth: '100px', marginTop: '8px' }} /></Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {canRequestElevation && (
              <Box sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<SupervisorAccountIcon />}
                  onClick={() => setOpenElevationDialog(true)}
                >
                  Request Temporary Elevation
                </Button>
                <Dialog open={openElevationDialog} onClose={() => setOpenElevationDialog(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>Request Temporary Elevation</DialogTitle>
                  <DialogContent>
                    <Typography>
                      Request elevation to Operations Manager for 24 hours to gain full access to agency creation/update.
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setOpenElevationDialog(false)}>Cancel</Button>
                    <Button color="primary" onClick={handleRequestElevation}>Request Elevation</Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon /> Agencies
              </Typography>
              {(canCreateAgency || canUpdateAgency) && !showAgencyForm && !editingAgency && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAgencyForm(true)}
                >
                  Add Agency
                </Button>
              )}
            </Box>

            {(canCreateAgency || canUpdateAgency) && (showAgencyForm || editingAgency) && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{editingAgency ? 'Edit Agency' : 'Add Agency'}</Typography>
                  <Formik
                    enableReinitialize
                    initialValues={{
                      agencyName: editingAgency?.name || '',
                      agencyAddress: editingAgency?.address || '',
                      agencyPhone: editingAgency?.phone || '',
                      agencyEmail: editingAgency?.email || '',
                      managerName: editingAgency?.manager_name || '',
                      submit: null,
                    }}
                    validationSchema={Yup.object().shape({
                      agencyName: Yup.string().max(255).required('Agency name required'),
                      agencyAddress: Yup.string().max(255).required('Address required'),
                      agencyPhone: Yup.string().required('Phone required'),
                      agencyEmail: Yup.string().email('Invalid email').max(255).required('Email required'),
                      managerName: Yup.string().max(255).required('Manager name required'),
                    })}
                    onSubmit={handleSaveAgency}
                  >
                    {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue, resetForm }) => (
                      <Box component="form" noValidate onSubmit={handleSubmit}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.agencyName && errors.agencyName)}
                              helperText={touched.agencyName && errors.agencyName}
                              label="Agency Name"
                              margin="normal"
                              name="agencyName"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.agencyName}
                              variant="outlined"
                              InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.agencyAddress && errors.agencyAddress)}
                              helperText={touched.agencyAddress && errors.agencyAddress}
                              label="Address"
                              margin="normal"
                              name="agencyAddress"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.agencyAddress}
                              variant="outlined"
                              InputProps={{ startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal" error={Boolean(touched.agencyPhone && errors.agencyPhone)}>
                              <PhoneInput
                                international
                                defaultCountry="US"
                                value={values.agencyPhone}
                                onChange={value => setFieldValue('agencyPhone', value)}
                                onBlur={handleBlur}
                                placeholder="Enter phone number"
                                style={{
                                  padding: '10px',
                                  border: errors.agencyPhone && touched.agencyPhone ? '1px solid red' : '1px solid #ccc',
                                  borderRadius: '4px',
                                }}
                              />
                              {touched.agencyPhone && errors.agencyPhone && (
                                <FormHelperText error>{errors.agencyPhone}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.agencyEmail && errors.agencyEmail)}
                              helperText={touched.agencyEmail && errors.agencyEmail}
                              label="Email"
                              margin="normal"
                              name="agencyEmail"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.agencyEmail}
                              variant="outlined"
                              InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.managerName && errors.managerName)}
                              helperText={touched.managerName && errors.managerName}
                              label="Manager Name"
                              margin="normal"
                              name="managerName"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.managerName}
                              variant="outlined"
                            />
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                          <Button
                            color="secondary"
                            variant="outlined"
                            onClick={() => { resetForm(); setEditingAgency(null); setShowAgencyForm(false); }}
                            sx={{ flex: 1 }}
                          >
                            {editingAgency ? 'Cancel Edit' : 'Cancel'}
                          </Button>
                          <Button
                            color="primary"
                            disabled={isSubmitting}
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                          >
                            {editingAgency ? 'Update Agency' : 'Add Agency'}
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Formik>
                </CardContent>
              </Card>
            )}

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Search Agencies"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, address, or email"
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                variant="outlined"
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Manager</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAgencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        {searchQuery ? 'No agencies match your search.' : `No agencies found. ${canCreateAgency ? 'Click "Add Agency" to create one.' : 'Contact your administrator.'}`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAgencies.map(agency => (
                      <TableRow key={agency.id}>
                        <TableCell>{agency.name}</TableCell>
                        <TableCell>{agency.address}</TableCell>
                        <TableCell>{agency.phone}</TableCell>
                        <TableCell>{agency.email}</TableCell>
                        <TableCell>{agency.manager_name}</TableCell>
                        <TableCell>
                          {canUpdateAgency && (['Super Admin', 'Operations Manager'].includes(role) || userAgencies.some(ua => ua.agency_id === agency.id)) && (
                            <Tooltip title="Edit Agency">
                              <IconButton onClick={() => { setEditingAgency(agency); setShowAgencyForm(true); }}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDeleteAgency && (
                            <Tooltip title="Delete Agency">
                              <IconButton onClick={() => handleDeleteAgency(agency.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default CreateTransportCompany;