import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Grid,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CssBaseline,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from './LanguageContext';

// Breadcrumb Component
const Breadcrumb = ({ title, children }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
      <MessageIcon sx={{ mr: 1, color: 'primary.main' }} />
      {title}
    </Typography>
    <Box sx={{ mt: 1 }}>{children}</Box>
  </Box>
);

const gridSpacing = 2;

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
            {this.props.t('messages_error')}: {this.state.error?.message || this.props.t('messages_unknownError', { error: 'Unknown' })}
          </Typography>
          <Typography variant="body2">
            {this.props.t('messages_errorDetails', { details: this.state.errorInfo?.componentStack || this.props.t('messages_noDetails') })}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {this.props.t('messages_refreshOrContact')}
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

// Theme setup
const theme = createTheme({
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

// Utility function for timeout handling
const withTimeout = async (promise, ms = 10000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
};

// Predefined country codes for CEMAC zones, Canada, US
const predefinedCountryCodes = {
  'CM': '+237', // Cameroon
  'CA': '+236', // Central African Republic
  'TD': '+235', // Chad
  'CG': '+242', // Republic of the Congo
  'GQ': '+240', // Equatorial Guinea
  'GA': '+241', // Gabon
  'US': '+1', // United States
  'CAN': '+1', // Canada
};

// Utility function to format phone number for WhatsApp (enhanced for Cameroon formats)
const formatPhoneNumber = (phoneNumber, countryCode = null) => {
  if (!phoneNumber) return null;
  // Remove non-digit characters except +
  let cleaned = phoneNumber.replace(/[^+\d]/g, '');
  let code = countryCode ? predefinedCountryCodes[countryCode.toUpperCase()] || countryCode.replace(/\D/g, '') : '237'; // default to Cameroon
  if (!code.startsWith('+')) code = `+${code}`;
  // Remove leading zeros from local number
  cleaned = cleaned.replace(/^0+/, '');
  // If cleaned starts with the code without +, remove it to avoid duplication
  if (cleaned.startsWith(code.substring(1))) {
    cleaned = cleaned.substring(code.substring(1).length);
  }
  const full = `${code}${cleaned}`;
  // Validate length based on country
  const expectedLength = code === '+1' ? 12 : 13; // +1 for US/CAN (10 digits), 12 chars; +237 for CM (9 digits), 13 chars
  if (full.length === expectedLength) {
    return full;
  }
  return null;
};

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canViewMessages: true,
    canSendMessages: true,
    canViewAllAgencies: true,
  },
  'Operations Manager': {
    canViewMessages: true,
    canSendMessages: true,
    canViewAllAgencies: true,
  },
  'Agent Supervisor': {
    canViewMessages: false,
    canSendMessages: false,
    canViewAllAgencies: false,
  },
  'Ticketing Agent': {
    canViewMessages: false,
    canSendMessages: false,
    canViewAllAgencies: false,
  },
};

const Messages = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [reservations, setReservations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const [recipientType, setRecipientType] = useState('company');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isTemporaryRole, setIsTemporaryRole] = useState(false);
  const [temporaryRoleExpiry, setTemporaryRoleExpiry] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(t('messages_sessionError', { error: sessionError.message }));
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          toast.error(t('messages_loginRequired'));
          navigate('/application/login');
          return;
        }

        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('user_id, role, temporary_role, temporary_role_expiry, company_id')
          .eq('user_id', session.user.id)
          .single();
        if (userRowError) throw new Error(t('messages_userFetchError', { error: userRowError.message }));

        const now = new Date();
        const isTemp = userRow.temporary_role && userRow.temporary_role_expiry && new Date(userRow.temporary_role_expiry) > now;
        const activeRole = isTemp ? userRow.temporary_role : userRow.role || 'Ticketing Agent';
        setUserRole(activeRole);
        setIsTemporaryRole(isTemp);
        setTemporaryRoleExpiry(isTemp ? userRow.temporary_role_expiry : null);

        if (!roleMatrix[activeRole]?.canViewMessages) {
          throw new Error(t('messages_noPermission'));
        }

        const { data: userAgenciesData, error: userAgenciesError } = await withTimeout(
          supabase
            .from('user_agencies')
            .select('agency_id')
            .eq('user_id', session.user.id)
        );
        if (userAgenciesError) throw new Error(t('messages_agencyFetchError', { error: userAgenciesError.message }));
        setUserAgencies(userAgenciesData || []);

        let companyIdToUse = userRow.company_id;
        if (!companyIdToUse) {
          const { data: companyData, error: companyError } = await supabase
            .from('transport_companies')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
          if (companyError) {
            if (companyError.code === 'PGRST116') {
              throw new Error(t('messages_noCompany'));
            }
            throw new Error(t('messages_companyFetchError', { error: companyError.message }));
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        let agencyQuery = supabase
          .from('agencies')
          .select('id, name')
          .eq('company_id', companyIdToUse)
          .order('name', { ascending: true });

        if (!roleMatrix[activeRole]?.canViewAllAgencies && userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          agencyQuery = agencyQuery.in('id', agencyIds);
        } else if (!roleMatrix[activeRole]?.canViewAllAgencies) {
          agencyQuery = agencyQuery.limit(0);
        }

        const { data: agenciesData, error: agenciesError } = await withTimeout(agencyQuery);
        if (agenciesError) throw new Error(t('messages_agencyFetchError', { error: agenciesError.message }));
        setAgencies(agenciesData || []);

        if (agenciesData.length > 0) {
          setSelectedAgencyId(agenciesData[0].id);
        }

        let routeQuery = supabase
          .from('routes')
          .select(`
            id,
            origin,
            destination,
            trip_date,
            departure_time,
            bus_id,
            departure_agency_id,
            arrival_agency_id,
            buses!inner(bus_type)
          `)
          .eq('company_id', companyIdToUse)
          .order('trip_date', { ascending: false })
          .order('departure_time', { ascending: true });
        if (!roleMatrix[activeRole]?.canViewAllAgencies && userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')})`
          );
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(t('messages_routeFetchError', { error: routesError.message }));
        setRoutes(routesData || []);

        let reservationQuery = supabase
          .from('reservations')
          .select(`
            id,
            agency_id,
            route_id,
            user_id
          `)
          .eq('company_id', companyIdToUse);
        if (!roleMatrix[activeRole]?.canViewAllAgencies && userAgenciesData.length > 0) {
          reservationQuery = reservationQuery.in('agency_id', userAgenciesData.map((ua) => ua.agency_id));
        }
        const { data: reservationsData, error: reservationsError } = await withTimeout(reservationQuery);
        if (reservationsError) throw new Error(t('messages_reservationFetchError', { error: reservationsError.message }));
        setReservations(reservationsData || []);

        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id, agency_id, reservation_id, route_id, phone_number, message_content, channel, status, error_message, sent_at')
          .eq('company_id', companyIdToUse)
          .order('sent_at', { ascending: false });
        if (messagesError && messagesError.code !== '42P01') {
          throw new Error(t('messages_messageFetchError', { error: messagesError.message }));
        }
        setMessages(messagesData || []);

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
          routeCount: routesData.length,
          reservationCount: reservationsData.length,
          messageCount: messagesData?.length || 0,
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
              ? t('messages_dbError', { code: error.code || 'N/A' })
              : t('messages_fetchError', { error: error.message })
          );
        }
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchInitialData();
  }, [navigate, retryCount, t]);

  // Fetch routes for selected agency
  useEffect(() => {
    if (!selectedAgencyId || !companyId) return;

    const fetchRoutes = async () => {
      try {
        let routeQuery = supabase
          .from('routes')
          .select(`
            id,
            origin,
            destination,
            trip_date,
            departure_time,
            bus_id,
            departure_agency_id,
            arrival_agency_id,
            buses!inner(bus_type)
          `)
          .eq('company_id', companyId)
          .or(`departure_agency_id.eq.${selectedAgencyId},arrival_agency_id.eq.${selectedAgencyId}`)
          .order('trip_date', { ascending: false })
          .order('departure_time', { ascending: true });
        if (userAgencies.length > 0 && !roleMatrix[userRole]?.canViewAllAgencies) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')})`
          );
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(t('messages_routeFetchError', { error: routesError.message }));
        setRoutes(routesData || []);
        setSelectedRouteId('');
      } catch (error) {
        logError('RoutesFetch', error);
        setError(t('messages_routeFetchError', { error: error.message }));
      }
    };

    fetchRoutes();
  }, [selectedAgencyId, companyId, userAgencies, userRole, t]);

  // Send message to clients with WhatsApp and SMS fallback
  const sendMessage = useCallback(async () => {
    if (!roleMatrix[userRole]?.canSendMessages) {
      toast.error(t('messages_noPermissionSend'));
      return;
    }
    if (!messageContent.trim()) {
      toast.error(t('messages_noMessageContent'));
      return;
    }
    if (messageContent.length > 160) {
      toast.error(t('messages_messageTooLong'));
      return;
    }
    if (recipientType === 'route' && (!selectedAgencyId || !selectedRouteId)) {
      toast.error(t('messages_selectAgencyRouteError'));
      return;
    }
    if (recipientType === 'agency' && !selectedAgencyId) {
      toast.error(t('messages_selectAgencyError'));
      return;
    }

    try {
      setLoading(true);

      // Fetch relevant reservations
      let selectedReservations = [];
      if (recipientType === 'route') {
        selectedReservations = reservations.filter((res) => res.route_id === selectedRouteId && res.agency_id === selectedAgencyId);
      } else if (recipientType === 'agency') {
        selectedReservations = reservations.filter((res) => res.agency_id === selectedAgencyId);
      } else {
        selectedReservations = reservations;
      }

      if (selectedReservations.length === 0) {
        throw new Error(t('messages_noReservationsFound'));
      }

      // Collect unique user_ids from selected reservations
      const userIds = [...new Set(selectedReservations.map((res) => res.user_id).filter((id) => id))];

      if (userIds.length === 0) {
        throw new Error(t('messages_noUsersFound'));
      }

      // Fetch profiles for those user_ids
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, phone_number, country_code')
        .in('id', userIds);

      if (profilesError) throw new Error(t('messages_profilesFetchError', { error: profilesError.message }));

      const profilesMap = new Map(profilesData.map((profile) => [profile.id, profile]));

      // Collect and format phone numbers
      let allPhoneNumbers = [];
      selectedReservations.forEach((res) => {
        const profile = profilesMap.get(res.user_id);
        if (profile && profile.phone_number) {
          allPhoneNumbers.push({ phone: profile.phone_number, code: profile.country_code });
        }
      });

      const formattedPhones = allPhoneNumbers.map(({ phone, code }) => formatPhoneNumber(phone, code));
      const validPhoneNumbers = formattedPhones.filter((phone) => phone);
      const invalidPhoneDetails = allPhoneNumbers.filter((_, index) => !formattedPhones[index]);

      if (invalidPhoneDetails.length > 0) {
        console.warn(`Ignored ${invalidPhoneDetails.length} invalid phone numbers:`, invalidPhoneDetails.map(({ phone, code }) => ({ phone, code })));
      }

      if (validPhoneNumbers.length === 0) {
        toast.warn(t('messages_noValidPhoneNumbers'));
        return;
      }

      const uniqueValidPhoneNumbers = [...new Set(validPhoneNumbers)];

      const payload = {
        message: messageContent,
        phone_numbers: uniqueValidPhoneNumbers,
        companyId,
        channel: 'whatsapp', // Prioritize WhatsApp
      };

      const response = await fetch('https://tiemlljkttqmragiaydg.supabase.co/functions/v1/send_message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t('messages_sendMessageError', { error: 'Failed to send message' }));
      }

      const { results } = result;
      const sentCount = results.filter((r) => r.status === 'sent').length;
      const failedCount = results.length - sentCount;
      const whatsappCount = results.filter((r) => r.status === 'sent' && r.channel === 'whatsapp').length;
      const smsCount = results.filter((r) => r.status === 'sent' && r.channel === 'sms').length;

      if (results.length > 0) {
        const messageInserts = results.map((r) => ({
          company_id: companyId,
          agency_id: recipientType === 'agency' || recipientType === 'route' ? selectedAgencyId : null,
          reservation_id: null,
          route_id: recipientType === 'route' ? selectedRouteId : null,
          phone_number: r.phone_number,
          message_content: messageContent,
          channel: r.channel,
          status: r.status,
          error_message: r.error || null,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase.from('messages').insert(messageInserts);
        if (insertError) {
          logError('MessageInsert', insertError);
          toast.warn(t('messages_messageInsertError'));
        } else {
          setMessages((prev) => [...messageInserts, ...prev]);
        }
      }

      if (sentCount === 0) {
        toast.warn(t('messages_noMessagesSent'));
      } else {
        toast.success(
          t('messages_messageSentSuccess', {
            count: sentCount,
            failed: failedCount,
            whatsapp: whatsappCount,
            sms: smsCount,
          })
        );
      }
      setMessageContent('');
      setSelectedRouteId('');
      setRecipientType('company');
    } catch (error) {
      logError('SendMessage', error);
      toast.error(t('messages_sendMessageError', { error: error.message }));
    } finally {
      setLoading(false);
    }
  }, [messageContent, recipientType, selectedRouteId, selectedAgencyId, companyId, userRole, reservations, t]);

  // Permission check for page access
  if (!roleMatrix[userRole]?.canViewMessages) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" color="error">
              {t('messages_noPermission')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('messages_requiredRoles', { role: userRole || t('messages_noRole') })}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 2 }}
            >
              {t('returnToDashboard')}
            </Button>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress aria-label={t('loading')} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {t('loading')}
            </Typography>
          </Box>
        </ErrorBoundary>
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
              {t('messages_error', { error })}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              {t('retry')}
            </Button>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  if (agencies.length === 0 && !roleMatrix[userRole]?.canViewAllAgencies) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Breadcrumb title={t('messages_pageTitle')}>
              <Typography
                variant="subtitle2"
                color="primary"
                className="link-breadcrumb"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <MessageIcon sx={{ mr: 1, fontSize: '1rem' }} />
                {t('messages_pageTitle')}
              </Typography>
            </Breadcrumb>
            <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
              <CardHeader
                title={
                  <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                    <MessageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('messages_noAgencies')}
                    {isTemporaryRole && temporaryRoleExpiry && (
                      <Chip
                        label={t('messages_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                        color="warning"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                }
              />
              <Divider />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <MessageIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                  {t('messages_noAgenciesMessage')}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.open('https://support.example.com', '_blank')}
                  sx={{ mt: 2 }}
                >
                  {t('messages_contactAdmin')}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate('/dashboard/default')}
                  sx={{ mt: 2, ml: 2 }}
                >
                  {t('returnToDashboard')}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  try {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Breadcrumb title={t('messages_pageTitle')}>
              <Typography
                variant="subtitle2"
                color="primary"
                className="link-breadcrumb"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <MessageIcon sx={{ mr: 1, fontSize: '1rem' }} />
                {t('messages_pageTitle')}
              </Typography>
            </Breadcrumb>
            <Grid container spacing={gridSpacing}>
              <Grid item xs={12}>
                <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                  <CardHeader
                    title={
                      <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                        <MessageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {t('messages_sendMessage')}
                        {isTemporaryRole && temporaryRoleExpiry && (
                          <Chip
                            label={t('messages_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                            color="warning"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    }
                  />
                  <Divider />
                  <CardContent>
                    {error && (
                      <Alert severity="error" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <MessageIcon sx={{ mr: 1 }} />
                        {t('messages_error', { error })}
                      </Alert>
                    )}
                    <Grid container spacing={gridSpacing}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          fullWidth
                          label={t('messages_recipientType')}
                          value={recipientType}
                          onChange={(e) => {
                            setRecipientType(e.target.value);
                            setSelectedRouteId('');
                            setSelectedAgencyId(agencies[0]?.id || '');
                          }}
                          variant="outlined"
                          helperText={t('messages_selectRecipientType')}
                          InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                          aria-label={t('messages_recipientType')}
                        >
                          <MenuItem value="company">{t('messages_allClients')}</MenuItem>
                          <MenuItem value="agency">{t('messages_agencyClients')}</MenuItem>
                          <MenuItem value="route">{t('messages_routeClients')}</MenuItem>
                        </TextField>
                      </Grid>
                      {(recipientType === 'agency' || recipientType === 'route') && (
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            fullWidth
                            label={t('messages_selectAgency')}
                            value={selectedAgencyId}
                            onChange={(e) => {
                              setSelectedAgencyId(e.target.value);
                              setSelectedRouteId('');
                            }}
                            variant="outlined"
                            helperText={t('messages_chooseAgency')}
                            InputProps={{ startAdornment: <MessageIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                            aria-label={t('messages_selectAgency')}
                          >
                            {agencies.map((agency) => (
                              <MenuItem key={agency.id} value={agency.id}>
                                {agency.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      )}
                      {recipientType === 'route' && (
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            fullWidth
                            label={t('messages_selectRoute')}
                            value={selectedRouteId}
                            onChange={(e) => setSelectedRouteId(e.target.value)}
                            variant="outlined"
                            helperText={t('messages_chooseRoute')}
                            InputProps={{ startAdornment: <MessageIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                            aria-label={t('messages_selectRoute')}
                          >
                            <MenuItem value="">{t('messages_chooseRoute')}</MenuItem>
                            {routes
                              .filter((route) => route.departure_agency_id === selectedAgencyId || route.arrival_agency_id === selectedAgencyId)
                              .map((route) => (
                                <MenuItem key={route.id} value={route.id}>
                                  {`${route.origin} to ${route.destination} - ${new Date(route.trip_date).toLocaleDateString()} ${route.departure_time} - ${route.buses?.bus_type || 'Unknown'}`}
                                </MenuItem>
                              ))}
                          </TextField>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label={t('messages_message')}
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder={t('messages_messagePlaceholder')}
                          inputProps={{ maxLength: 160 }}
                          variant="outlined"
                          helperText={
                            recipientType === 'route'
                              ? t('messages_routeRecipient', {
                                  route: routes.find((r) => r.id === selectedRouteId)
                                    ? `${routes.find((r) => r.id === selectedRouteId).origin} to ${routes.find((r) => r.id === selectedRouteId).destination} - ${new Date(routes.find((r) => r.id === selectedRouteId).trip_date).toLocaleDateString()} ${routes.find((r) => r.id === selectedRouteId).departure_time}`
                                    : 'N/A',
                                })
                              : recipientType === 'agency'
                              ? t('messages_agencyRecipient', { name: agencies.find((a) => a.id === selectedAgencyId)?.name || t('messages_agency') })
                              : t('messages_companyRecipient')
                          }
                          InputProps={{ startAdornment: <MessageIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                          aria-label={t('messages_message')}
                        />
                      </Grid>
                      <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={sendMessage}
                          disabled={loading || !roleMatrix[userRole]?.canSendMessages}
                          startIcon={<SendIcon />}
                          sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                          aria-label={t('messages_send')}
                        >
                          {t('messages_send')}
                        </Button>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <MessageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {t('messages_messageHistory')}
                      </Typography>
                      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <MessageIcon sx={{ mr: 1 }} />
                                  {t('messages_messageId')}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <MessageIcon sx={{ mr: 1 }} />
                                  {t('messages_recipient')}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <MessageIcon sx={{ mr: 1 }} />
                                  {t('messages_content')}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <MessageIcon sx={{ mr: 1 }} />
                                  {t('messages_channel')}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <MessageIcon sx={{ mr: 1 }} />
                                  {t('messages_status')}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <MessageIcon sx={{ mr: 1 }} />
                                  {t('messages_sentDate')}
                                </Box>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {messages.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} align="center">
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {t('messages_noMessages')}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              messages.map((message) => (
                                <TableRow key={message.id}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <MessageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {message.id}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <MessageIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                      {message.route_id
                                        ? t('messages_routeLabel', {
                                            route: routes.find((r) => r.id === message.route_id)
                                              ? `${routes.find((r) => r.id === message.route_id).origin} to ${routes.find((r) => r.id === message.route_id).destination} - ${new Date(routes.find((r) => r.id === message.route_id).trip_date).toLocaleDateString()} ${routes.find((r) => r.id === message.route_id).departure_time}`
                                              : 'N/A',
                                          })
                                        : message.agency_id
                                        ? t('messages_agencyLabel', { name: agencies.find((a) => a.id === message.agency_id)?.name || 'N/A' })
                                        : t('messages_allClientsLabel')}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <MessageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {message.message_content}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <MessageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {message.channel}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <MessageIcon sx={{ mr: 1, color: message.status === 'sent' ? theme.palette.success.main : theme.palette.error.main }} />
                                      {message.status}{message.error_message && ` (${message.error_message})`}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <MessageIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                      {new Date(message.sent_at).toLocaleString()}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  } catch (error) {
    logError('RenderMessages', error);
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {t('messages_criticalError')}
          </Typography>
          <Typography variant="body2">
            {t('messages_unknownError', { error: error.message || t('messages_unknown') })}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            sx={{ mt: 2 }}
          >
            {t('returnToDashboard')}
          </Button>
        </Box>
      </ThemeProvider>
    );
  }
};

export default Messages;