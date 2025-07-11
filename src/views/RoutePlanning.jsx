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
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  CssBaseline,
  Autocomplete,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  HelpOutline as HelpOutlineIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Map as MapIcon,
  DirectionsBus as DirectionsBusIcon,
  AccessTime as AccessTimeIcon,
  MonetizationOn as MonetizationOnIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  Wifi as WifiIcon,
  Power as PowerIcon,
  AcUnit as AcUnitIcon,
  Group as GroupIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Wc as WcIcon,
  Fastfood as FastfoodIcon,
  ArrowUpward as ElevateIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from './LanguageContext';

// Breadcrumb Component
const Breadcrumb = ({ title, children }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
      <MapIcon sx={{ mr: 1, color: 'primary.main' }} />
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
            {this.props.t('route_error')}: {this.state.error?.message || this.props.t('route_unknownError', { error: 'Unknown' })}
          </Typography>
          <Typography variant="body2">
            {this.props.t('route_errorDetails', { details: this.state.errorInfo?.componentStack || this.props.t('route_noDetails') })}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {this.props.t('route_refreshOrContact')}
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
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
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

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canViewRoutes: true,
    canCreateRoute: true,
    canUpdateRoute: true,
    canDeleteRoute: true,
    canEditAllRoutes: true, // New permission
    canDeleteAllRoutes: true, // New permission
    canViewAgencies: true,
    canCreateAgency: true,
    canUpdateAgency: true,
    canDeleteAgency: true,
    canRequestElevation: false,
  },
  'Operations Manager': {
    canViewRoutes: true,
    canCreateRoute: true,
    canUpdateRoute: true,
    canDeleteRoute: true,
    canEditAllRoutes: true, // New permission
    canDeleteAllRoutes: true, // New permission
    canViewAgencies: true,
    canCreateAgency: true,
    canUpdateAgency: true,
    canDeleteAgency: false,
    canRequestElevation: false,
  },
  'Agent Supervisor': {
    canViewRoutes: true,
    canCreateRoute: false,
    canUpdateRoute: false,
    canDeleteRoute: false,
    canEditAllRoutes: false,
    canDeleteAllRoutes: false,
    canViewAgencies: true,
    canCreateAgency: false,
    canUpdateAgency: false,
    canDeleteAgency: false,
    canRequestElevation: true,
  },
  'Ticketing Agent': {
    canViewRoutes: true,
    canCreateRoute: false,
    canUpdateRoute: false,
    canDeleteRoute: false,
    canEditAllRoutes: false,
    canDeleteAllRoutes: false,
    canViewAgencies: true,
    canCreateAgency: false,
    canUpdateAgency: false,
    canDeleteAgency: false,
    canRequestElevation: false,
  },
};

const RoutePlanning = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [buses, setBuses] = useState([]);
  const [passengerAssignments, setPassengerAssignments] = useState({});
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newAgency, setNewAgency] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    manager_name: '',
  });
  const [showAddAgencyForm, setShowAddAgencyForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [newRoute, setNewRoute] = useState({
    origin: '',
    destination: '',
    stops: [''],
    trip_date: '',
    departure_time: { hours: '', minutes: '' },
    arrival_time: { hours: '', minutes: '' },
    price: '',
    bus_id: '',
    driver: '',
    departure_agency_id: '',
    arrival_agency_id: '',
    arrest_agency_ids: [],
    drop_off_agency_ids: [],
    wifi: false,
    charger_ports: false,
    air_conditioning: false,
    seats_available: 0,
  });
  const [userRole, setUserRole] = useState(null);
  const [isTemporaryRole, setIsTemporaryRole] = useState(false);
  const [temporaryRoleExpiry, setTemporaryRoleExpiry] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [originOptions, setOriginOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [stopOptions, setStopOptions] = useState([]);
  const hoursOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesOptions = ['00', '15', '30', '45'];
  const today = '2025-05-30';

  // Role-based no company message
  const getNoCompanyMessage = () => {
    switch (userRole) {
      case 'Super Admin':
        return (
          <>
            <Typography variant="h6" color="error">
              {t('route_noCompany')}
            </Typography>
            <Typography variant="body2">
              {t('route_createCompanyPrompt')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/create-transport-company')}
              sx={{ mt: 2 }}
              aria-label={t('route_createCompany')}
            >
              {t('route_createCompany')}
            </Button>
          </>
        );
      case 'Operations Manager':
      case 'Agent Supervisor':
      case 'Ticketing Agent':
        return (
          <>
            <Typography variant="h6" color="error">
              {t('route_noCompanyAssociated')}
            </Typography>
            <Typography variant="body2">
              {t('route_contactAdminPrompt')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.open('https://support.example.com', '_blank')}
              sx={{ mt: 2 }}
              aria-label={t('route_contactAdmin')}
            >
              {t('route_contactAdmin')}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate('/dashboard/default')}
              sx={{ mt: 2, ml: 2 }}
              aria-label={t('route_returnToDashboard')}
            >
              {t('route_returnToDashboard')}
            </Button>
          </>
        );
      default:
        return (
          <>
            <Typography variant="h6" color="error">
              {t('route_unrecognizedRole')}
            </Typography>
            <Typography variant="body2">
              {t('route_contactSupportPrompt')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.open('https://support.example.com', '_blank')}
              sx={{ mt: 2 }}
              aria-label={t('route_contactSupport')}
            >
              {t('route_contactSupport')}
            </Button>
          </>
        );
    }
  };

  // Fetch initial data (user role, company ID, agencies)
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        // Fetch authenticated user session
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(t('route_sessionError', { error: sessionError.message }));
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          toast.error(t('route_loginRequired'));
          navigate('/application/login');
          return;
        }

        // Fetch user data with retry
        let userData = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('user_id, role, temporary_role, temporary_role_expiry, company_id, created_by')
              .eq('user_id', session.user.id)
              .single();
            if (error) throw error;
            userData = data;
            break;
          } catch (err) {
            logError('UserFetch', err, { userId: session.user.id, attempt });
            if (attempt === maxRetries) {
              throw new Error(t('route_userFetchError', { error: err.message }));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!userData) {
          logError('UserFetchFinal', new Error('No user data found'), { userId: session.user.id });
          userData = { role: 'Ticketing Agent' };
          toast.warn(t('route_noUserData'));
        }

        // Determine active role
        const now = new Date();
        const isTemp = userData.temporary_role && userData.temporary_role_expiry && new Date(userData.temporary_role_expiry) > now;
        const activeRole = isTemp ? userData.temporary_role : userData.role || 'Ticketing Agent';
        setUserRole(activeRole);
        setIsTemporaryRole(isTemp);
        setTemporaryRoleExpiry(isTemp ? userData.temporary_role_expiry : null);

        // Check view permission
        if (!roleMatrix[activeRole]?.canViewRoutes) {
          throw new Error(t('route_noPermissionViewRoutes'));
        }

        // Fetch user agencies
        const { data: userAgenciesData, error: userAgenciesError } = await withTimeout(
          supabase
            .from('user_agencies')
            .select('agency_id')
            .eq('user_id', session.user.id)
        );
        if (userAgenciesError) {
          logError('UserAgenciesFetch', userAgenciesError, { userId: session.user.id });
          throw new Error(t('route_userAgenciesFetchError', { error: userAgenciesError.message }));
        }
        setUserAgencies(userAgenciesData || []);

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
              throw new Error(t('route_noCompany'));
            }
            throw new Error(t('route_companyFetchError', { error: companyError.message }));
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        // Fetch agencies with role-based restrictions
        let agencyQuery = supabase
          .from('agencies')
          .select('id, name, address, phone, email, manager_name, company_id, created_at, updated_at')
          .eq('company_id', companyIdToUse)
          .order('name', { ascending: true });
        if (!roleMatrix[activeRole]?.canCreateAgency) {
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
              throw new Error(t('route_agencyFetchError', { error: err.message }));
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
              ? t('route_dbError', { code: error.code || 'N/A' })
              : t('route_fetchError', { error: error.message })
          );
        }
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchInitialData();
  }, [navigate, retryCount, t]);

  // Fetch additional data from Supabase
  useEffect(() => {
    if (!companyId || !userRole) return;

    const fetchData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const session = (await supabase.auth.getSession()).data.session;
        const userId = session?.user?.id;

        // Fetch buses
        let busQuery = supabase.from('buses').select('*').eq('company_id', companyId);
        if (!roleMatrix[userRole]?.canCreateRoute) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          if (agencyIds.length > 0) {
            busQuery = busQuery.in('agency_id', agencyIds);
          } else {
            busQuery = busQuery.limit(0);
          }
        }
        const { data: busesData, error: busesError } = await withTimeout(busQuery);
        if (busesError) throw new Error(t('route_busFetchError', { error: busesError.message }));
        setBuses(busesData || []);

        // Fetch routes
        let routeQuery = supabase.from('routes').select('*').eq('company_id', companyId);
        if (!roleMatrix[userRole]?.canCreateRoute) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          if (agencyIds.length > 0) {
            routeQuery = routeQuery.or(
              `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
            );
          } else {
            routeQuery = routeQuery.limit(0);
          }
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(t('route_routesFetchError', { error: routesError.message }));
        setRoutes(routesData || []);

        // Fetch passenger assignments
        const { data: assignmentsData, error: assignmentsError } = await withTimeout(
          supabase
            .from('passenger_assignments')
            .select('route_id')
            .eq('company_id', companyId)
        );
        if (assignmentsError) throw new Error(t('route_passengerAssignmentsFetchError', { error: assignmentsError.message }));
        const assignments = assignmentsData.reduce((acc, { route_id }) => {
          acc[route_id] = (acc[route_id] || 0) + 1;
          return acc;
        }, {});
        setPassengerAssignments(assignments);

        // Update is_booked status
        setRoutes((prevRoutes) =>
          prevRoutes.map((route) => ({
            ...route,
            is_booked: !!assignments[route.id],
          }))
        );

        logSuccess('DataFetch', 'Data fetched successfully', {
          userId,
          busCount: busesData.length,
          routeCount: routesData.length,
        });
      } catch (error) {
        logError('DataFetch', error, { userId: session?.user?.id });
        setError(
          error.message.includes('infinite recursion')
            ? t('route_dbError', { code: error.code || 'N/A' })
            : t('route_fetchError', { error: error.message })
        );
      } finally {
        setLoading(false);
        logSuccess('DataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchData();

    // Auto-delete invalid routes
    const checkInvalidRoutes = async () => {
      try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { data: invalidRoutes, error } = await withTimeout(
          supabase
            .from('routes')
            .select('id, trip_date, bus_id, driver, is_booked')
            .eq('company_id', companyId)
            .lt('trip_date', oneDayAgo.toISOString().split('T')[0])
            .eq('is_booked', false)
        );
        if (error) throw new Error(t('route_invalidRoutesFetchError', { error: error.message }));

        for (const route of invalidRoutes) {
          const { error: deleteError } = await supabase
            .from('routes')
            .delete()
            .eq('id', route.id);
          if (deleteError) throw new Error(t('route_deleteRouteError', { id: route.id, error: deleteError.message }));
        }

        await fetchData();
      } catch (error) {
        logError('InvalidRoutesCheck', error, { userId: session?.user?.id });
        setError(t('route_invalidRoutesCheckError', { error: error.message }));
      }
    };

    checkInvalidRoutes();
    const interval = setInterval(checkInvalidRoutes, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [companyId, userRole, userAgencies, t]);

  // Request temporary role elevation
  const requestElevation = async () => {
    try {
      if (!roleMatrix[userRole]?.canRequestElevation) {
        toast.error(t('route_noPermissionElevation'));
        return;
      }
      if (isTemporaryRole) {
        toast.warn(t('route_elevationActive'));
        return;
      }

      const elevatedRole = 'Operations Manager';
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

      const { error: elevationError } = await supabase
        .from('users')
        .update({
          temporary_role: elevatedRole,
          temporary_role_expiry: endTime.toISOString(),
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user.id);
      if (elevationError) throw new Error(t('route_elevationError', { error: elevationError.message }));

      setUserRole(elevatedRole);
      setIsTemporaryRole(true);
      setTemporaryRoleExpiry(endTime.toISOString());
      toast.success(t('route_elevationSuccess'));
    } catch (error) {
      logError('ElevationRequest', error, { userId: (await supabase.auth.getUser()).data.user?.id });
      toast.error(t('route_elevationFailed', { error: error.message }));
    }
  };

  // Google Places Autocomplete
  const fetchPlaceSuggestions = useCallback(async (query, setOptions) => {
    if (!query || query.length < 3) {
      setOptions([]);
      return;
    }

    try {
      const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&types=(cities)&language=${t('route_languageCode')}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === 'OK') {
        const suggestions = data.predictions
          .filter((prediction) => prediction.structured_formatting.main_text)
          .map((prediction) => ({
            label: prediction.structured_formatting.main_text,
            value: prediction.structured_formatting.main_text,
            placeId: prediction.place_id,
          }));
        setOptions(suggestions);
      } else {
        setOptions([]);
      }
    } catch (error) {
      logError('PlaceSuggestionsFetch', error);
      setOptions([]);
    }
  }, [t]);

  const handlePlaceInputChange = (field, value, formType) => {
    if (formType === 'add') {
      setNewRoute({ ...newRoute, [field]: value });
      fetchPlaceSuggestions(value, field === 'origin' ? setOriginOptions : setDestinationOptions);
    } else if (formType === 'edit' && editRoute) {
      setEditRoute({ ...editRoute, [field]: value });
      fetchPlaceSuggestions(value, field === 'origin' ? setOriginOptions : setDestinationOptions);
    }
  };

  const handleStopInputChange = (index, value, formType) => {
    if (formType === 'add') {
      const updatedStops = [...newRoute.stops];
      updatedStops[index] = value;
      setNewRoute({ ...newRoute, stops: updatedStops });
      fetchPlaceSuggestions(value, setStopOptions);
    } else if (formType === 'edit' && editRoute) {
      const updatedStops = [...editRoute.stops];
      updatedStops[index] = value;
      setEditRoute({ ...editRoute, stops: updatedStops });
      fetchPlaceSuggestions(value, setStopOptions);
    }
  };

  const formatTime = (time) => {
    if (!time.hours || !time.minutes) return '';
    return `${time.hours}:${time.minutes}:00`;
  };

  const parseTime = (timeString) => {
    if (!timeString) return { hours: '', minutes: '' };
    const [hours, minutes] = timeString.split(':');
    return { hours: hours || '', minutes: minutes || '' };
  };

  const addAgency = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canCreateAgency) {
      toast.error(t('route_noPermissionCreateAgency'));
      return;
    }
    try {
      if (!newAgency.name.trim() || agencies.some((a) => a.name === newAgency.name.trim())) {
        toast.error(t('route_invalidAgencyName'));
        return;
      }
      if (!newAgency.address || !newAgency.phone || !newAgency.email || !newAgency.manager_name) {
        toast.error(t('route_requiredAgencyFields'));
        return;
      }
      const { error } = await supabase
        .from('agencies')
        .insert([{ ...newAgency, company_id: companyId }]);
      if (error) throw new Error(t('route_addAgencyError', { error: error.message }));
      const { data } = await supabase
        .from('agencies')
        .select('id, name, address, phone, email, manager_name, company_id, created_at, updated_at')
        .eq('company_id', companyId);
      setAgencies(data || []);
      setNewAgency({ name: '', address: '', phone: '', email: '', manager_name: '' });
      setShowAddAgencyForm(false);
      toast.success(t('route_addAgencySuccess'));
    } catch (error) {
      logError('AgencyAdd', error);
      toast.error(
        error.message.includes('infinite recursion')
          ? t('route_dbError', { code: error.code || 'N/A' })
          : t('route_addAgencyFailed', { error: error.message })
      );
    }
  };

  const addRoute = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canCreateRoute) {
      toast.error(t('route_noPermissionCreateRoute'));
      return;
    }
    try {
      const bus = buses.find((b) => b.id === newRoute.bus_id);
      if (!bus || bus.status === 'Maintenance') {
        toast.error(t('route_invalidBus'));
        return;
      }
      if (!newRoute.driver) {
        toast.error(t('route_driverRequired'));
        return;
      }
      if (
        !newRoute.origin ||
        !newRoute.destination ||
        !newRoute.trip_date ||
        !newRoute.departure_time.hours ||
        !newRoute.departure_time.minutes ||
        !newRoute.arrival_time.hours ||
        !newRoute.arrival_time.minutes ||
        !newRoute.price ||
        !newRoute.departure_agency_id ||
        !newRoute.arrival_agency_id
      ) {
        toast.error(t('route_requiredFields'));
        return;
      }
      const price = parseFloat(newRoute.price);
      if (price < 0) {
        toast.error(t('route_negativePrice'));
        return;
      }
      const route = {
        company_id: companyId,
        origin: newRoute.origin,
        destination: newRoute.destination,
        stops: newRoute.stops.filter((stop) => stop.trim()),
        trip_date: newRoute.trip_date,
        departure_time: formatTime(newRoute.departure_time),
        arrival_time: formatTime(newRoute.arrival_time),
        price: price,
        bus_id: newRoute.bus_id,
        driver: newRoute.driver,
        departure_agency_id: newRoute.departure_agency_id,
        arrival_agency_id: newRoute.arrival_agency_id,
        arrest_agency_ids: newRoute.arrest_agency_ids.filter((id) => id),
        drop_off_agency_ids: newRoute.drop_off_agency_ids.filter((id) => id),
        wifi: bus.bus_type === 'VIP' || bus.bus_type === 'VVIP' ? true : newRoute.wifi,
        charger_ports: bus.bus_type === 'VIP' || bus.bus_type === 'VVIP' ? true : newRoute.charger_ports,
        air_conditioning: bus.bus_type === 'VIP' || bus.bus_type === 'VVIP' ? true : newRoute.air_conditioning,
        is_booked: false,
        seats_available: bus.capacity || 0,
      };
      const { data, error } = await supabase.from('routes').insert([route]).select();
      if (error) throw new Error(t('route_addRouteError', { error: error.message }));
      const { data: updatedRoutes } = await supabase.from('routes').select('*').eq('company_id', companyId);
      setRoutes(updatedRoutes || []);
      setShowAddForm(false);
      setNewRoute({
        origin: '',
        destination: '',
        stops: [''],
        trip_date: '',
        departure_time: { hours: '', minutes: '' },
        arrival_time: { hours: '', minutes: '' },
        price: '',
        bus_id: '',
        driver: '',
        departure_agency_id: '',
        arrival_agency_id: '',
        arrest_agency_ids: [],
        drop_off_agency_ids: [],
        wifi: false,
        charger_ports: false,
        air_conditioning: false,
        seats_available: 0,
      });
      setOriginOptions([]);
      setDestinationOptions([]);
      setStopOptions([]);
      toast.success(t('route_addRouteSuccess'));
    } catch (error) {
      logError('RouteAdd', error);
      toast.error(
        error.message.includes('infinite recursion')
          ? t('route_dbError', { code: error.code || 'N/A' })
          : t('route_addRouteFailed', { error: error.message })
      );
    }
  };

  const deleteRoute = async (id) => {
    if (!roleMatrix[userRole]?.canDeleteRoute) {
      toast.error(t('route_noPermissionDeleteRoute'));
      return;
    }
    try {
      const route = routes.find((r) => r.id === id);
      if (!route) {
        toast.error(t('route_routeNotFound'));
        return;
      }
      if (route.is_booked) {
        toast.error(t('route_bookedRouteError'));
        return;
      }
      if (window.confirm(t('route_confirmDelete'))) {
        const { error } = await supabase.from('routes').delete().eq('id', id);
        if (error) throw new Error(t('route_deleteRouteError', { id, error: error.message }));
        const { data } = await supabase.from('routes').select('*').eq('company_id', companyId);
        setRoutes(data || []);
        toast.success(t('route_deleteRouteSuccess'));
      }
    } catch (error) {
      logError('RouteDelete', error);
      toast.error(
        error.message.includes('infinite recursion')
          ? t('route_dbError', { code: error.code || 'N/A' })
          : t('route_deleteRouteFailed', { error: error.message })
      );
    }
  };

  const startEdit = (route) => {
    if (!roleMatrix[userRole]?.canUpdateRoute) {
      toast.error(t('route_noPermissionUpdateRoute'));
      return;
    }
    if (route.is_booked) {
      toast.error(t('route_bookedRouteEditError'));
      return;
    }
    setEditRoute({
      ...route,
      stops: route.stops.length ? [...route.stops] : [''],
      arrest_agency_ids: route.arrest_agency_ids || [],
      drop_off_agency_ids: route.drop_off_agency_ids || [],
      departure_time: parseTime(route.departure_time),
      arrival_time: parseTime(route.arrival_time),
      wifi: route.wifi,
      charger_ports: route.charger_ports,
      air_conditioning: route.air_conditioning,
      seats_available: route.seats_available || 0,
    });
    setShowEditForm(true);
    setShowHelp(false);
  };

  const updateRoute = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canUpdateRoute) {
      toast.error(t('route_noPermissionUpdateRoute'));
      return;
    }
    try {
      if (!editRoute) {
        toast.error(t('route_noRouteToEdit'));
        return;
      }
      const bus = buses.find((b) => b.id === editRoute.bus_id);
      if (!bus || bus.status === 'Maintenance') {
        toast.error(t('route_invalidBus'));
        return;
      }
      if (!editRoute.driver) {
        toast.error(t('route_driverRequired'));
        return;
      }
      if (
        !editRoute.origin ||
        !editRoute.destination ||
        !editRoute.trip_date ||
        !editRoute.departure_time.hours ||
        !editRoute.departure_time.minutes ||
        !editRoute.arrival_time.hours ||
        !editRoute.arrival_time.minutes ||
        !editRoute.price ||
        !editRoute.departure_agency_id ||
        !editRoute.arrival_agency_id
      ) {
        toast.error(t('route_requiredFields'));
        return;
      }
      const price = parseFloat(editRoute.price);
      if (price < 0) {
        toast.error(t('route_negativePrice'));
        return;
      }
      const updatedRoute = {
        origin: editRoute.origin,
        destination: editRoute.destination,
        stops: editRoute.stops.filter((stop) => stop.trim()),
        trip_date: editRoute.trip_date,
        departure_time: formatTime(editRoute.departure_time),
        arrival_time: formatTime(editRoute.arrival_time),
        price: price,
        bus_id: editRoute.bus_id,
        driver: editRoute.driver,
        departure_agency_id: editRoute.departure_agency_id,
        arrival_agency_id: editRoute.arrival_agency_id,
        arrest_agency_ids: editRoute.arrest_agency_ids.filter((id) => id),
        drop_off_agency_ids: editRoute.drop_off_agency_ids.filter((id) => id),
        wifi: bus.bus_type === 'VIP' || bus.bus_type === 'VVIP' ? true : editRoute.wifi,
        charger_ports: bus.bus_type === 'VIP' || bus.bus_type === 'VVIP' ? true : editRoute.charger_ports,
        air_conditioning: bus.bus_type === 'VIP' || bus.bus_type === 'VVIP' ? true : editRoute.air_conditioning,
        seats_available: bus.capacity || editRoute.seats_available,
      };
      const { error } = await supabase
        .from('routes')
        .update(updatedRoute)
        .eq('id', editRoute.id);
      if (error) throw new Error(t('route_updateRouteError', { error: error.message }));
      const { data } = await supabase.from('routes').select('*').eq('company_id', companyId);
      setRoutes(data || []);
      setShowEditForm(false);
      setEditRoute(null);
      setOriginOptions([]);
      setDestinationOptions([]);
      setStopOptions([]);
      toast.success(t('route_updateRouteSuccess'));
    } catch (error) {
      logError('RouteUpdate', error);
      toast.error(
        error.message.includes('infinite recursion')
          ? t('route_dbError', { code: error.code || 'N/A' })
          : t('route_updateRouteFailed', { error: error.message })
      );
    }
  };

  const addStop = (formType) => {
    if (formType === 'add') {
      setNewRoute({ ...newRoute, stops: [...newRoute.stops, ''] });
    } else if (formType === 'edit' && editRoute) {
      setEditRoute({ ...editRoute, stops: [...editRoute.stops, ''] });
    }
  };

  const removeStop = (index, formType) => {
    if (formType === 'add') {
      setNewRoute({ ...newRoute, stops: newRoute.stops.filter((_, i) => i !== index) });
    } else if (formType === 'edit' && editRoute) {
      setEditRoute({ ...editRoute, stops: editRoute.stops.filter((_, i) => i !== index) });
    }
  };

  const addArrestAgency = (formType) => {
    if (formType === 'add' && newRoute.arrest_agency_ids.length < 10) {
      setNewRoute({ ...newRoute, arrest_agency_ids: [...newRoute.arrest_agency_ids, ''] });
    } else if (formType === 'edit' && editRoute && editRoute.arrest_agency_ids.length < 10) {
      setEditRoute({ ...editRoute, arrest_agency_ids: [...editRoute.arrest_agency_ids, ''] });
    }
  };

  const updateArrestAgency = (index, value, formType) => {
    if (formType === 'add') {
      const updatedArrestAgencies = [...newRoute.arrest_agency_ids];
      updatedArrestAgencies[index] = value;
      setNewRoute({ ...newRoute, arrest_agency_ids: updatedArrestAgencies });
    } else if (formType === 'edit' && editRoute) {
      const updatedArrestAgencies = [...editRoute.arrest_agency_ids];
      updatedArrestAgencies[index] = value;
      setEditRoute({ ...editRoute, arrest_agency_ids: updatedArrestAgencies });
    }
  };

  const removeArrestAgency = (index, formType) => {
    if (formType === 'add') {
      setNewRoute({ ...newRoute, arrest_agency_ids: newRoute.arrest_agency_ids.filter((_, i) => i !== index) });
    } else if (formType === 'edit' && editRoute) {
      setEditRoute({ ...editRoute, arrest_agency_ids: editRoute.arrest_agency_ids.filter((_, i) => i !== index) });
    }
  };

  const addDropOffAgency = (formType) => {
    if (formType === 'add' && newRoute.drop_off_agency_ids.length < 10) {
      setNewRoute({ ...newRoute, drop_off_agency_ids: [...newRoute.drop_off_agency_ids, ''] });
    } else if (formType === 'edit' && editRoute && editRoute.drop_off_agency_ids.length < 10) {
      setEditRoute({ ...editRoute, drop_off_agency_ids: [...editRoute.drop_off_agency_ids, ''] });
    }
  };

  const updateDropOffAgency = (index, value, formType) => {
    if (formType === 'add') {
      const updatedDropOffAgencies = [...newRoute.drop_off_agency_ids];
      updatedDropOffAgencies[index] = value;
      setNewRoute({ ...newRoute, drop_off_agency_ids: updatedDropOffAgencies });
    } else if (formType === 'edit' && editRoute) {
      const updatedDropOffAgencies = [...editRoute.drop_off_agency_ids];
      updatedDropOffAgencies[index] = value;
      setEditRoute({ ...editRoute, drop_off_agency_ids: updatedDropOffAgencies });
    }
  };

  const removeDropOffAgency = (index, formType) => {
    if (formType === 'add') {
      setNewRoute({ ...newRoute, drop_off_agency_ids: newRoute.drop_off_agency_ids.filter((_, i) => i !== index) });
    } else if (formType === 'edit' && editRoute) {
      setEditRoute({ ...editRoute, drop_off_agency_ids: editRoute.drop_off_agency_ids.filter((_, i) => i !== index) });
    }
  };

  const availableBuses = buses.filter((bus) => bus.status !== 'Maintenance');

  const getAvailableArrestAgencies = (dropOffAgencies, departureAgencyId, arrivalAgencyId) => {
    return agencies.filter(
      (agency) =>
        !dropOffAgencies.includes(agency.id) &&
        agency.id !== departureAgencyId &&
        agency.id !== arrivalAgencyId
    );
  };

  const getAvailableDropOffAgencies = (arrestAgencies, departureAgencyId, arrivalAgencyId) => {
    return agencies.filter(
      (agency) =>
        !arrestAgencies.includes(agency.id) &&
        agency.id !== departureAgencyId &&
        agency.id !== arrivalAgencyId
    );
  };

  const renderAgencyForm = () => (
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
        animation: 'fadeIn 0.3s ease-in-out',
        '@keyframes fadeIn': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      }}
      onClick={() => setShowAddAgencyForm(false)}
    >
      <Card
        sx={{
          width: '80%',
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          transition: 'transform 0.3s ease-in-out',
          transform: 'scale(1)',
          '&:hover': { transform: 'scale(1.02)' },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <AddCircleOutlineIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
              {t('route_addAgencyTitle')}
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <form onSubmit={addAgency}>
            <Grid container spacing={gridSpacing}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('route_agencyName')}
                  value={newAgency.name}
                  onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                  placeholder={t('route_agencyNamePlaceholder')}
                  required
                  variant="outlined"
                  InputProps={{ startAdornment: <StoreIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                  aria-label={t('route_agencyName')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('route_agencyAddress')}
                  value={newAgency.address}
                  onChange={(e) => setNewAgency({ ...newAgency, address: e.target.value })}
                  placeholder={t('route_agencyAddressPlaceholder')}
                  required
                  variant="outlined"
                  aria-label={t('route_agencyAddress')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('route_agencyPhone')}
                  value={newAgency.phone}
                  onChange={(e) => setNewAgency({ ...newAgency, phone: e.target.value })}
                  placeholder={t('route_agencyPhonePlaceholder')}
                  required
                  variant="outlined"
                  aria-label={t('route_agencyPhone')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('route_agencyEmail')}
                  value={newAgency.email}
                  onChange={(e) => setNewAgency({ ...newAgency, email: e.target.value })}
                  placeholder={t('route_agencyEmailPlaceholder')}
                  required
                  type="email"
                  variant="outlined"
                  aria-label={t('route_agencyEmail')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('route_agencyManagerName')}
                  value={newAgency.manager_name}
                  onChange={(e) => setNewAgency({ ...newAgency, manager_name: e.target.value })}
                  placeholder={t('route_agencyManagerNamePlaceholder')}
                  required
                  variant="outlined"
                  aria-label={t('route_agencyManagerName')}
                />
              </Grid>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!roleMatrix[userRole]?.canCreateAgency}
                    sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                    aria-label={t('route_addAgency')}
                  >
                    <CheckIcon sx={{ mr: 1 }} />
                    {t('route_addAgency')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setShowAddAgencyForm(false)}
                    sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                    aria-label={t('route_cancel')}
                  >
                    <CloseIcon sx={{ mr: 1 }} />
                    {t('route_cancel')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );

  const renderRouteForm = (isEdit = false) => {
    const routeData = isEdit ? editRoute : newRoute;
    const setRouteData = isEdit ? setEditRoute : setNewRoute;
    const handleSubmit = isEdit ? updateRoute : addRoute;
    const title = isEdit
      ? t('route_editTitle', { origin: routeData?.origin || '', destination: routeData?.destination || '' })
      : t('route_addTitle');
    const submitText = isEdit ? t('route_update') : t('route_add');

    if (isEdit && !routeData) return null;

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
          animation: 'fadeIn 0.3s ease-in-out',
          '@keyframes fadeIn': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        }}
        onClick={() => (isEdit ? setShowEditForm(false) : setShowAddForm(false))}
      >
        <Card
          sx={{
            width: '80%',
            maxWidth: 800,
            maxHeight: '80vh',
            overflow: 'auto',
            transition: 'transform 0.3s ease-in-out',
            transform: 'scale(1)',
            '&:hover': { transform: 'scale(1.02)' },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader
            title={
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                {isEdit ? (
                  <EditIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
                ) : (
                  <AddCircleOutlineIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
                )}
                {title}
              </Typography>
            }
            action={
              isEdit && (
                <Button
                  variant="outlined"
                  onClick={() => setShowHelp(!showHelp)}
                  sx={{ mr: 1, '&:hover': { borderColor: theme.palette.primary.main, transform: 'scale(1.05)' } }}
                  aria-label={t('route_showHelp')}
                >
                  <HelpOutlineIcon sx={{ mr: 1 }} />
                  {t('route_help')}
                </Button>
              )
            }
          />
          <Divider />
          <CardContent>
            {isEdit && showHelp && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <HelpOutlineIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                {t('route_editHelp', { origin: editRoute?.origin, destination: editRoute?.destination })}
              </Typography>
            )}
            <form onSubmit={handleSubmit}>
              <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MapIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_details')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={originOptions}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                    value={routeData.origin || ''}
                    onChange={(e, newValue) =>
                      setRouteData({
                        ...routeData,
                        origin: newValue ? (typeof newValue === 'string' ? newValue : newValue.value) : '',
                      })
                    }
                    onInputChange={(e, newInputValue) =>
                      handlePlaceInputChange('origin', newInputValue, isEdit ? 'edit' : 'add')
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label={t('route_origin')}
                        placeholder={t('route_originPlaceholder')}
                        required
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <MapIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        aria-label={t('route_origin')}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={destinationOptions}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                    value={routeData.destination || ''}
                    onChange={(e, newValue) =>
                      setRouteData({
                        ...routeData,
                        destination: newValue ? (typeof newValue === 'string' ? newValue : newValue.value) : '',
                      })
                    }
                    onInputChange={(e, newInputValue) =>
                      handlePlaceInputChange('destination', newInputValue, isEdit ? 'edit' : 'add')
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label={t('route_destination')}
                        placeholder={t('route_destinationPlaceholder')}
                        required
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <MapIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        aria-label={t('route_destination')}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <MapIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_intermediateStops')}
                  </Typography>
                  {(routeData.stops || []).map((stop, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Autocomplete
                        freeSolo
                        options={stopOptions}
                        getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                        value={stop || ''}
                        onChange={(e, newValue) =>
                          handleStopInputChange(
                            index,
                            newValue ? (typeof newValue === 'string' ? newValue : newValue.value) : '',
                            isEdit ? 'edit' : 'add'
                          )
                        }
                        onInputChange={(e, newInputValue) =>
                          handleStopInputChange(index, newInputValue, isEdit ? 'edit' : 'add')
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label={t('route_stop', { number: index + 1 })}
                            placeholder={t('route_stopPlaceholder')}
                            variant="outlined"
                            sx={{ mr: 1 }}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: <MapIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                            aria-label={t('route_stop', { number: index + 1 })}
                          />
                        )}
                      />
                      {(routeData.stops || []).length > 1 && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => removeStop(index, isEdit ? 'edit' : 'add')}
                          startIcon={<RemoveCircleIcon />}
                          sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                          aria-label={t('route_removeStop', { number: index + 1 })}
                        >
                          {t('route_remove')}
                        </Button>
                      )}
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={() => addStop(isEdit ? 'edit' : 'add')}
                    startIcon={<AddCircleIcon />}
                    sx={{ mt: 1, '&:hover': { borderColor: theme.palette.primary.main, transform: 'scale(1.05)' } }}
                    aria-label={t('route_addStop')}
                  >
                    {t('route_addStop')}
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_schedule')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('route_tripDate')}
                    type="date"
                    value={routeData.trip_date || ''}
                    onChange={(e) => setRouteData({ ...routeData, trip_date: e.target.value })}
                    required
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    inputProps={{ min: today }}
                    aria-label={t('route_tripDate')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      select
                      label={t('route_departureHour')}
                      value={routeData.departure_time?.hours || ''}
                      onChange={(e) =>
                        setRouteData({
                          ...routeData,
                          departure_time: { ...routeData.departure_time, hours: e.target.value },
                        })
                      }
                      required
                      variant="outlined"
                      sx={{ flex: 1 }}
                      aria-label={t('route_selectDepartureHour')}
                    >
                      <MenuItem value="">{t('route_hour')}</MenuItem>
                      {hoursOptions.map((hour) => (
                        <MenuItem key={hour} value={hour}>
                          {hour}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label={t('route_departureMinutes')}
                      value={routeData.departure_time?.minutes || ''}
                      onChange={(e) =>
                        setRouteData({
                          ...routeData,
                          departure_time: { ...routeData.departure_time, minutes: e.target.value },
                        })
                      }
                      required
                      variant="outlined"
                      sx={{ flex: 1 }}
                      aria-label={t('route_selectDepartureMinutes')}
                    >
                      <MenuItem value="">{t('route_minutes')}</MenuItem>
                      {minutesOptions.map((minute) => (
                        <MenuItem key={minute} value={minute}>
                          {minute}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      select
                      label={t('route_arrivalHour')}
                      value={routeData.arrival_time?.hours || ''}
                      onChange={(e) =>
                        setRouteData({
                          ...routeData,
                          arrival_time: { ...routeData.arrival_time, hours: e.target.value },
                        })
                      }
                      required
                      variant="outlined"
                      sx={{ flex: 1 }}
                      aria-label={t('route_selectArrivalHour')}
                    >
                      <MenuItem value="">{t('route_hour')}</MenuItem>
                      {hoursOptions.map((hour) => (
                        <MenuItem key={hour} value={hour}>
                          {hour}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label={t('route_arrivalMinutes')}
                      value={routeData.arrival_time?.minutes || ''}
                      onChange={(e) =>
                        setRouteData({
                          ...routeData,
                          arrival_time: { ...routeData.arrival_time, minutes: e.target.value },
                        })
                      }
                      required
                      variant="outlined"
                      sx={{ flex: 1 }}
                      aria-label={t('route_selectArrivalMinutes')}
                    >
                      <MenuItem value="">{t('route_minutes')}</MenuItem>
                      {minutesOptions.map((minute) => (
                        <MenuItem key={minute} value={minute}>
                          {minute}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MonetizationOnIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_pricingAndBus')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('route_price', { currency: 'XAF' })}
                    type="number"
                    step="0.01"
                    value={routeData.price || ''}
                    onChange={(e) => setRouteData({ ...routeData, price: e.target.value })}
                    placeholder={t('route_pricePlaceholder')}
                    required
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    InputProps={{ startAdornment: <MonetizationOnIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    aria-label={t('route_price', { currency: 'XAF' })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label={t('route_assignedBus')}
                    value={routeData.bus_id || ''}
                    onChange={(e) => {
                      const bus = availableBuses.find((b) => b.id === e.target.value);
                      setRouteData({
                        ...routeData,
                        bus_id: e.target.value,
                        wifi: bus && (bus.bus_type === 'VIP' || bus.bus_type === 'VVIP') ? true : routeData.wifi,
                        charger_ports: bus && (bus.bus_type === 'VIP' || bus.bus_type === 'VVIP') ? true : routeData.charger_ports,
                        air_conditioning: bus && (bus.bus_type === 'VIP' || bus.bus_type === 'VVIP') ? true : routeData.air_conditioning,
                        seats_available: bus ? bus.capacity || 0 : routeData.seats_available,
                      });
                    }}
                    required
                    variant="outlined"
                    InputProps={{ startAdornment: <DirectionsBusIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    aria-label={t('route_selectBus')}
                  >
                    <MenuItem value="">{t('route_selectBusPlaceholder')}</MenuItem>
                    {availableBuses.map((bus) => (
                      <MenuItem key={bus.id} value={bus.id}>
                        {bus.number} ({bus.bus_type})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={routeData.wifi || false}
                        onChange={(e) => setRouteData({ ...routeData, wifi: e.target.checked })}
                        disabled={
                          routeData.bus_id &&
                          (availableBuses.find((b) => b.id === routeData.bus_id)?.bus_type === 'VIP' ||
                            availableBuses.find((b) => b.id === routeData.bus_id)?.bus_type === 'VVIP')
                        }
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WifiIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {t('route_wifi')}
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={routeData.charger_ports || false}
                        onChange={(e) => setRouteData({ ...routeData, charger_ports: e.target.checked })}
                        disabled={
                          routeData.bus_id &&
                          (availableBuses.find((b) => b.id === routeData.bus_id)?.bus_type === 'VIP' ||
                            availableBuses.find((b) => b.id === routeData.bus_id)?.bus_type === 'VVIP')
                        }
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PowerIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {t('route_chargerPorts')}
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={routeData.air_conditioning || false}
                        onChange={(e) => setRouteData({ ...routeData, air_conditioning: e.target.checked })}
                        disabled={
                          routeData.bus_id &&
                          (availableBuses.find((b) => b.id === routeData.bus_id)?.bus_type === 'VIP' ||
                            availableBuses.find((b) => b.id === routeData.bus_id)?.bus_type === 'VVIP')
                        }
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AcUnitIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {t('route_airConditioning')}
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StoreIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_agencies')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label={t('route_departureAgency')}
                    value={routeData.departure_agency_id || ''}
                    onChange={(e) => setRouteData({ ...routeData, departure_agency_id: e.target.value })}
                    required
                    variant="outlined"
                    InputProps={{ startAdornment: <StoreIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    aria-label={t('route_selectDepartureAgency')}
                  >
                    <MenuItem value="">{t('route_selectAgency')}</MenuItem>
                    {agencies.map((agency) => (
                      <MenuItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label={t('route_arrivalAgency')}
                    value={routeData.arrival_agency_id || ''}
                    onChange={(e) => setRouteData({ ...routeData, arrival_agency_id: e.target.value })}
                    required
                    variant="outlined"
                    InputProps={{ startAdornment: <StoreIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    aria-label={t('route_selectArrivalAgency')}
                  >
                    <MenuItem value="">{t('route_selectAgency')}</MenuItem>
                    {agencies.map((agency) => (
                      <MenuItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <StoreIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_arrestAgencies')}
                  </Typography>
                  {(routeData.arrest_agency_ids || []).map((agencyId, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TextField
                        select
                        fullWidth
                        label={t('route_arrestAgency', { number: index + 1 })}
                        value={agencyId || ''}
                        onChange={(e) => updateArrestAgency(index, e.target.value, isEdit ? 'edit' : 'add')}
                        variant="outlined"
                        sx={{ mr: 1 }}
                        InputProps={{ startAdornment: <StoreIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                        aria-label={t('route_selectArrestAgency', { number: index + 1 })}
                      >
                        <MenuItem value="">{t('route_selectAgency')}</MenuItem>
                        {getAvailableArrestAgencies(
                          routeData.drop_off_agency_ids || [],
                          routeData.departure_agency_id || '',
                          routeData.arrival_agency_id || ''
                        ).map((agency) => (
                          <MenuItem key={agency.id} value={agency.id}>
                            {agency.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => removeArrestAgency(index, isEdit ? 'edit' : 'add')}
                        startIcon={<RemoveCircleIcon />}
                        sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                        aria-label={t('route_removeArrestAgency', { number: index + 1 })}
                      >
                        {t('route_remove')}
                      </Button>
                    </Box>
                  ))}
                  {(routeData.arrest_agency_ids || []).length < 10 && (
                    <Button
                      variant="outlined"
                      onClick={() => addArrestAgency(isEdit ? 'edit' : 'add')}
                      startIcon={<AddCircleIcon />}
                      sx={{ mt: 1, '&:hover': { borderColor: theme.palette.primary.main, transform: 'scale(1.05)' } }}
                      aria-label={t('route_addArrestAgency')}
                    >
                      {t('route_addArrestAgency')}
                    </Button>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <StoreIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_dropOffAgencies')}
                  </Typography>
                  {(routeData.drop_off_agency_ids || []).map((agencyId, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TextField
                        select
                        fullWidth
                        label={t('route_dropOffAgency', { number: index + 1 })}
                        value={agencyId || ''}
                        onChange={(e) => updateDropOffAgency(index, e.target.value, isEdit ? 'edit' : 'add')}
                        variant="outlined"
                        sx={{ mr: 1 }}
                        InputProps={{ startAdornment: <StoreIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                        aria-label={t('route_selectDropOffAgency', { number: index + 1 })}
                      >
                        <MenuItem value="">{t('route_selectAgency')}</MenuItem>
                        {getAvailableDropOffAgencies(
                          routeData.arrest_agency_ids || [],
                          routeData.departure_agency_id || '',
                          routeData.arrival_agency_id || ''
                        ).map((agency) => (
                          <MenuItem key={agency.id} value={agency.id}>
                            {agency.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => removeDropOffAgency(index, isEdit ? 'edit' : 'add')}
                        startIcon={<RemoveCircleIcon />}
                        sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                        aria-label={t('route_removeDropOffAgency', { number: index + 1 })}
                      >
                        {t('route_remove')}
                      </Button>
                    </Box>
                  ))}
                  {(routeData.drop_off_agency_ids || []).length < 10 && (
                    <Button
                      variant="outlined"
                      onClick={() => addDropOffAgency(isEdit ? 'edit' : 'add')}
                      startIcon={<AddCircleIcon />}
                      sx={{ mt: 1, '&:hover': { borderColor: theme.palette.primary.main, transform: 'scale(1.05)' } }}
                      aria-label={t('route_addDropOffAgency')}
                    >
                      {t('route_addDropOffAgency')}
                    </Button>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('route_driverAssignment')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('route_driver')}
                    value={routeData.driver || ''}
                    onChange={(e) => setRouteData({ ...routeData, driver: e.target.value })}
                    placeholder={t('route_driverPlaceholder')}
                    required
                    variant="outlined"
                    InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    aria-label={t('route_driver')}
                  />
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isEdit ? !roleMatrix[userRole]?.canUpdateRoute : !roleMatrix[userRole]?.canCreateRoute}
                      sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                      aria-label={isEdit ? t('route_updateRoute') : t('route_addRoute')}
                    >
                      <CheckIcon sx={{ mr: 1 }} />
                      {submitText}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (isEdit) {
                          setShowEditForm(false);
                          setEditRoute(null);
                        } else {
                          setShowAddForm(false);
                        }
                      }}
                      sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                      aria-label={t('route_cancel')}
                    >
                      <CloseIcon sx={{ mr: 1 }} />
                      {t('route_cancel')}
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress aria-label={t('loading')} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        {getNoCompanyMessage()}
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary t={t}>
        <Box sx={{ p: 3 }}>
          <Breadcrumb title={t('route_pageTitle')}>
            <Typography
              variant="subtitle2"
              color="primary"
              className="link-breadcrumb"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <MapIcon sx={{ mr: 1, fontSize: '1rem' }} />
              {t('route_pageTitle')}
            </Typography>
          </Breadcrumb>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                <CardHeader
                  title={
                    <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                      <MapIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      {t('route_pageTitle')}
                      {isTemporaryRole && temporaryRoleExpiry && (
                        <Chip
                          label={t('route_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  }
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {roleMatrix[userRole]?.canRequestElevation && !isTemporaryRole && (
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={requestElevation}
                          startIcon={<ElevateIcon />}
                          sx={{
                            '&:hover': {
                              backgroundColor: theme.palette.warning.dark,
                              transform: 'scale(1.05)',
                            },
                          }}
                          aria-label={t('route_requestElevation')}
                        >
                          {t('route_requestElevation')}
                        </Button>
                      )}
                      {roleMatrix[userRole]?.canCreateAgency && (
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => setShowAddAgencyForm(true)}
                          startIcon={<AddCircleOutlineIcon />}
                          sx={{ '&:hover': { backgroundColor: theme.palette.secondary.dark, transform: 'scale(1.05)' } }}
                          aria-label={t('route_addAgency')}
                        >
                          {t('route_addAgency')}
                        </Button>
                      )}
                      {roleMatrix[userRole]?.canCreateRoute && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => setShowAddForm(true)}
                          startIcon={<AddCircleOutlineIcon />}
                          sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                          aria-label={t('route_addRoute')}
                        >
                          {t('route_addRoute')}
                        </Button>
                      )}
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  {routes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <HelpOutlineIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                      {t('route_noRoutes', {
                        action: roleMatrix[userRole]?.canCreateRoute
                          ? t('route_addRouteAction')
                          : t('route_contactAdminAction'),
                      })}
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <Table aria-label={t('route_table')}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <MapIcon sx={{ mr: 1 }} />
                                {t('route_origin')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <MapIcon sx={{ mr: 1 }} />
                                {t('route_destination')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <MapIcon sx={{ mr: 1 }} />
                                {t('route_stops')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AccessTimeIcon sx={{ mr: 1 }} />
                                {t('route_date')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AccessTimeIcon sx={{ mr: 1 }} />
                                {t('route_departure')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AccessTimeIcon sx={{ mr: 1 }} />
                                {t('route_arrival')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <MonetizationOnIcon sx={{ mr: 1 }} />
                                {t('route_price', { currency: 'XAF' })}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DirectionsBusIcon sx={{ mr: 1 }} />
                                {t('route_bus')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <WifiIcon sx={{ mr: 1 }} />
                                {t('route_busDetails')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StoreIcon sx={{ mr: 1 }} />
                                {t('route_departureAgency')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StoreIcon sx={{ mr: 1 }} />
                                {t('route_arrivalAgency')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StoreIcon sx={{ mr: 1 }} />
                                {t('route_arrestAgencies')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StoreIcon sx={{ mr: 1 }} />
                                {t('route_dropOffAgencies')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1 }} />
                                {t('route_driver')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <GroupIcon sx={{ mr: 1 }} />
                                {t('route_passengers')}
                              </Box>
                            </TableCell>
                            {(roleMatrix[userRole]?.canUpdateRoute || roleMatrix[userRole]?.canDeleteRoute) && (
                              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  {t('route_actions')}
                                </Box>
                              </TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {routes.map((route) => {
                            const bus = buses.find((b) => b.id === route.bus_id);
                            const departureAgency = agencies.find((a) => a.id === route.departure_agency_id);
                            const arrivalAgency = agencies.find((a) => a.id === route.arrival_agency_id);
                            const arrestAgencies = route.arrest_agency_ids
                              .map((id) => agencies.find((a) => a.id === id)?.name)
                              .filter(Boolean);
                            const dropOffAgencies = route.drop_off_agency_ids
                              .map((id) => agencies.find((a) => a.id === id)?.name)
                              .filter(Boolean);
                            const passengerCount = passengerAssignments[route.id] || 0;
                            const amenities = [
                              route.wifi && t('route_wifi'),
                              route.charger_ports && t('route_chargerPorts'),
                              route.air_conditioning && t('route_airConditioning'),
                              bus?.toilets && t('route_toilets'),
                              bus?.snacks && t('route_snacks'),
                            ].filter(Boolean);

                            return (
                              <TableRow
                                key={route.id}
                                sx={{
                                  backgroundColor: route.is_booked ? 'action.disabledBackground' : 'inherit',
                                  '&:hover': { backgroundColor: 'action.hover' },
                                }}
                                aria-label={t('route_row', { origin: route.origin, destination: route.destination })}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <MapIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                    {route.origin || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <MapIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                    {route.destination || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <MapIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {route.stops?.join(', ') || t('route_noStops')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AccessTimeIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {route.trip_date || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AccessTimeIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                    {route.departure_time || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AccessTimeIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                    {route.arrival_time || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <MonetizationOnIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                    {route.price || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <DirectionsBusIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                    {bus ? `${bus.number} (${bus.bus_type})` : t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {route.wifi && <WifiIcon sx={{ mr: 1, color: theme.palette.success.main }} />}
                                    {route.charger_ports && <PowerIcon sx={{ mr: 1, color: theme.palette.success.main }} />}
                                    {route.air_conditioning && <AcUnitIcon sx={{ mr: 1, color: theme.palette.success.main }} />}
                                    {bus?.toilets && <WcIcon sx={{ mr: 1, color: theme.palette.success.main }} />}
                                    {bus?.snacks && <FastfoodIcon sx={{ mr: 1, color: theme.palette.success.main }} />}
                                    {amenities.length > 0 ? amenities.join(', ') : t('route_noAmenities')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <StoreIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {departureAgency?.name || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <StoreIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {arrivalAgency?.name || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <StoreIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {arrestAgencies.join(', ') || t('route_noAgencies')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <StoreIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                    {dropOffAgencies.join(', ') || t('route_noAgencies')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PersonIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                    {route.driver || t('route_na')}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <GroupIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                    {passengerCount}
                                  </Box>
                                </TableCell>
                                {(roleMatrix[userRole]?.canUpdateRoute || roleMatrix[userRole]?.canDeleteRoute) && (
                                  <TableCell align="right">
                                    {roleMatrix[userRole]?.canUpdateRoute && (
                                      <Tooltip title={t('route_edit')}>
                                        <span>
                                          <IconButton
                                            color="primary"
                                            onClick={() => startEdit(route)}
                                            disabled={route.is_booked}
                                            sx={{ '&:hover': { transform: 'scale(1.1)' } }}
                                            aria-label={t('route_edit')}
                                          >
                                            <EditIcon />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    )}
                                    {roleMatrix[userRole]?.canDeleteRoute && (
                                      <Tooltip title={t('route_delete')}>
                                        <span>
                                          <IconButton
                                            color="error"
                                            onClick={() => deleteRoute(route.id)}
                                            disabled={route.is_booked}
                                            sx={{ '&:hover': { transform: 'scale(1.1)' } }}
                                            aria-label={t('route_delete')}
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                )}
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
          {showAddAgencyForm && renderAgencyForm()}
          {showAddForm && renderRouteForm(false)}
          {showEditForm && editRoute && renderRouteForm(true)}
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default RoutePlanning;