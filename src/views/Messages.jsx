import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Translations
const translations = {
  en: {
    messages_error: 'Error',
    messages_unknownError: 'Unknown error: {error}',
    messages_errorDetails: 'Details: {details}',
    messages_noDetails: 'No details available',
    messages_refreshOrContact: 'Please refresh the page or contact support.',
    messages_sessionError: 'Session error: {error}',
    messages_loginRequired: 'Please login to continue.',
    messages_userFetchError: 'Failed to fetch user data: {error}',
    messages_noPermission: 'You do not have permission to access this page.',
    messages_noCompany: 'No associated company found.',
    messages_companyFetchError: 'Failed to fetch company data: {error}',
    messages_agencyFetchError: 'Failed to fetch agencies: {error}',
    messages_dbError: 'Database error (code: {code}). Please try again later.',
    messages_fetchError: 'Failed to fetch data: {error}',
    messages_routeFetchError: 'Failed to fetch routes: {error}',
    messages_reservationFetchError: 'Failed to fetch reservations: {error}',
    messages_noPermissionSend: 'You do not have permission to send messages.',
    messages_noMessageContent: 'Message content is required.',
    messages_messageTooLong: 'Message is too long (max 160 characters).',
    messages_selectAgencyRouteError: 'Please select an agency and route.',
    messages_selectAgencyError: 'Please select an agency.',
    messages_noReservationsFound: 'No reservations found for the selected criteria.',
    messages_noUsersFound: 'No users found for the selected reservations.',
    messages_profilesFetchError: 'Failed to fetch profiles: {error}',
    messages_noValidPhoneNumbers: 'No valid phone numbers found.',
    messages_sendMessageError: 'Failed to send message: {error}',
    messages_noMessagesSent: 'No messages were sent successfully.',
    messages_messageSentSuccess: '{count} messages sent successfully ({sms} SMS, {whatsapp} WhatsApp). {failed} failed.',
    messages_pageTitle: 'Messages',
    messages_sendMessage: 'Send Message',
    messages_recipientType: 'Recipient Type',
    messages_selectRecipientType: 'Select the type of recipients',
    messages_allClients: 'All Company Clients',
    messages_agencyClients: 'Agency Clients',
    messages_routeClients: 'Route Clients',
    messages_selectAgency: 'Select Agency',
    messages_chooseAgency: 'Choose an agency',
    messages_selectRoute: 'Select Route',
    messages_chooseRoute: 'Choose a route',
    messages_message: 'Message',
    messages_messagePlaceholder: 'Enter your message here (max 160 characters)',
    messages_routeRecipient: 'Message will be sent to clients of route: {route}',
    messages_agencyRecipient: 'Message will be sent to clients of agency: {name}',
    messages_companyRecipient: 'Message will be sent to all company clients',
    messages_send: 'Send',
    messages_noAgencies: 'No Agencies',
    messages_noAgenciesMessage: 'No agencies found. Contact your administrator.',
    messages_contactAdmin: 'Contact Support',
    returnToDashboard: 'Return to Dashboard',
    messages_temporaryRole: 'Temporary Role (Expires: {date})',
    messages_requiredRoles: 'Required roles: Super Admin or Operations Manager. Your role: {role}',
    messages_criticalError: 'Critical Error',
    messages_unknown: 'Unknown',
    retry: 'Retry',
    loading: 'Loading...',
  },
  fr: {
    messages_error: 'Erreur',
    messages_unknownError: 'Erreur inconnue : {error}',
    messages_errorDetails: 'Détails : {details}',
    messages_noDetails: 'Aucun détail disponible',
    messages_refreshOrContact: 'Veuillez rafraîchir la page ou contacter le support.',
    messages_sessionError: 'Erreur de session : {error}',
    messages_loginRequired: 'Veuillez vous connecter pour continuer.',
    messages_userFetchError: 'Échec de la récupération des données utilisateur : {error}',
    messages_noPermission: "Vous n'avez pas la permission d'accéder à cette page.",
    messages_noCompany: 'Aucune entreprise associée trouvée.',
    messages_companyFetchError: "Échec de la récupération des données de l'entreprise : {error}",
    messages_agencyFetchError: 'Échec de la récupération des agences : {error}',
    messages_dbError: 'Erreur de base de données (code : {code}). Veuillez réessayer plus tard.',
    messages_fetchError: 'Échec de la récupération des données : {error}',
    messages_routeFetchError: 'Échec de la récupération des itinéraires : {error}',
    messages_reservationFetchError: 'Échec de la récupération des réservations : {error}',
    messages_noPermissionSend: "Vous n'avez pas la permission d'envoyer des messages.",
    messages_noMessageContent: 'Le contenu du message est requis.',
    messages_messageTooLong: 'Le message est trop long (max 160 caractères).',
    messages_selectAgencyRouteError: "Veuillez sélectionner une agence et un itinéraire.",
    messages_selectAgencyError: "Veuillez sélectionner une agence.",
    messages_noReservationsFound: 'Aucune réservation trouvée pour les critères sélectionnés.',
    messages_noUsersFound: 'Aucun utilisateur trouvé pour les réservations sélectionnées.',
    messages_profilesFetchError: 'Échec de la récupération des profils : {error}',
    messages_noValidPhoneNumbers: 'Aucun numéro de téléphone valide trouvé.',
    messages_sendMessageError: "Échec de l'envoi du message : {error}",
    messages_noMessagesSent: "Aucun message n'a été envoyé avec succès.",
    messages_messageSentSuccess: '{count} messages envoyés avec succès ({sms} SMS, {whatsapp} WhatsApp). {failed} échoués.',
    messages_pageTitle: 'Messages',
    messages_sendMessage: 'Envoyer un Message',
    messages_recipientType: 'Type de Destinataire',
    messages_selectRecipientType: 'Sélectionnez le type de destinataires',
    messages_allClients: "Tous les Clients de l'Entreprise",
    messages_agencyClients: "Clients d'Agence",
    messages_routeClients: "Clients d'Itinéraire",
    messages_selectAgency: "Sélectionner l'Agence",
    messages_chooseAgency: 'Choisissez une agence',
    messages_selectRoute: "Sélectionner l'Itinéraire",
    messages_chooseRoute: 'Choisissez un itinéraire',
    messages_message: 'Message',
    messages_messagePlaceholder: 'Entrez votre message ici (max 160 caractères)',
    messages_routeRecipient: "Le message sera envoyé aux clients de l'itinéraire : {route}",
    messages_agencyRecipient: "Le message sera envoyé aux clients de l'agence : {name}",
    messages_companyRecipient: "Le message sera envoyé à tous les clients de l'entreprise",
    messages_send: 'Envoyer',
    messages_noAgencies: 'Aucune Agence',
    messages_noAgenciesMessage: 'Aucune agence trouvée. Contactez votre administrateur.',
    messages_contactAdmin: 'Contacter le Support',
    returnToDashboard: 'Retour au Tableau de Bord',
    messages_temporaryRole: 'Rôle Temporaire (Expire : {date})',
    messages_requiredRoles: 'Rôles requis : Super Admin ou Operations Manager. Votre rôle : {role}',
    messages_criticalError: 'Erreur Critique',
    messages_unknown: 'Inconnu',
    retry: 'Réessayer',
    loading: 'Chargement...',
  },
};

// Breadcrumb Component
const Breadcrumb = ({ title, children, language, setLanguage }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <MessageIcon sx={{ mr: 1, color: 'primary.main' }} />
        {title}
      </Box>
      <Select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        size="small"
        sx={{ minWidth: 60 }}
      >
        <MenuItem value="en">EN</MenuItem>
        <MenuItem value="fr">FR</MenuItem>
      </Select>
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

// Utility function to format phone number for SMS (enhanced for Cameroon formats)
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
  const [language, setLanguage] = useState('fr');
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [reservations, setReservations] = useState([]);
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

  const t = useCallback((key, params = {}) => {
    let text = translations[language][key] || key;
    for (const param in params) {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }
    return text;
  }, [language]);

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

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
          routeCount: routesData.length,
          reservationCount: reservationsData.length,
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

  // Send message to clients with SMS
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
        channel: 'sms', // Prioritize SMS
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

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => route.departure_agency_id === selectedAgencyId || route.arrival_agency_id === selectedAgencyId);
  }, [routes, selectedAgencyId]);

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
            <Breadcrumb title={t('messages_pageTitle')} language={language} setLanguage={setLanguage}>
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
              
                >
                  {t('messages_contactAdmin')}
                </Button>
                <Button
                 
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
            <Breadcrumb title={t('messages_pageTitle')} language={language} setLanguage={setLanguage}>
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
                            {filteredRoutes.map((route) => (
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
        
          >
            {t('returnToDashboard')}
          </Button>
        </Box>
      </ThemeProvider>
    );
  }
};

export default Messages;