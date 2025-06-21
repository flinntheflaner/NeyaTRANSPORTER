import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Parser } from '@json2csv/plainjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PropTypes from 'prop-types';
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
  Checkbox,
  FormControlLabel,
  CssBaseline,
  Tabs,
  Tab,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Book as BookIcon,
  Download as DownloadIcon,
  PictureAsPdf as PictureAsPdfIcon,
  FilterList as FilterListIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ArrowUpward as ElevateIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from './LanguageContext';

// Enterprise logo (base64 placeholder, replace with your actual logo)
const ENTERPRISE_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

// Breadcrumb Component
const Breadcrumb = ({ title, children }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
      <BookIcon sx={{ mr: 1, color: 'primary.main' }} />
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
            {this.props.t('reservation_error')}: {this.state.error?.message || this.props.t('reservation_unknownError', { error: 'Unknown' })}
          </Typography>
          <Typography variant="body2">
            {this.props.t('reservation_errorDetails', { details: this.state.errorInfo?.componentStack || this.props.t('reservation_noDetails') })}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {this.props.t('reservation_refreshOrContact')}
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

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canViewReservations: true,
    canCreateReservation: true,
    canUpdateReservation: true,
    canDeleteReservation: true,
    canViewAnalytics: true,
    canGenerateReports: true,
    canViewAgencies: true,
    canCreateAgency: true,
    canRequestElevation: false,
    canSendMessages: true,
  },
  'Operations Manager': {
    canViewReservations: true,
    canCreateReservation: true,
    canUpdateReservation: true,
    canDeleteReservation: true,
    canViewAnalytics: true,
    canGenerateReports: true,
    canViewAgencies: true,
    canCreateAgency: true,
    canRequestElevation: false,
    canSendMessages: true,
  },
  'Agent Supervisor': {
    canViewReservations: true,
    canCreateReservation: true,
    canUpdateReservation: true,
    canDeleteReservation: false,
    canViewAnalytics: false,
    canGenerateReports: false,
    canViewAgencies: true,
    canCreateAgency: false,
    canRequestElevation: true,
    canSendMessages: false,
  },
  'Ticketing Agent': {
    canViewReservations: true,
    canCreateReservation: true,
    canUpdateReservation: false,
    canDeleteReservation: false,
    canViewAnalytics: false,
    canGenerateReports: false,
    canViewAgencies: true,
    canCreateAgency: false,
    canRequestElevation: false,
    canSendMessages: false,
  },
};

const ReservationTracking = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [passengerAssignments, setPassengerAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('daily');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);
  const [activeTab, setActiveTab] = useState('table');
  const [graphType, setGraphType] = useState('line');
  const [graphFilterPeriod, setGraphFilterPeriod] = useState('all');
  const [graphFilterOrigin, setGraphFilterOrigin] = useState('');
  const [graphFilterDestination, setGraphFilterDestination] = useState('');
  const [exportOrigin, setExportOrigin] = useState('');
  const [exportDestination, setExportDestination] = useState('');
  const [exportPeriod, setExportPeriod] = useState('');
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageReservationId, setMessageReservationId] = useState(null);
  const [newBooking, setNewBooking] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    fullName: '',
    phoneNumber: '',
    seatNumber: '',
    paymentStatus: 'Paid',
    identityCardVerified: false,
    reservationDate: '',
    reservationTime: '',
    isOnline: false,
  });
  const [userRole, setUserRole] = useState(null);
  const [isTemporaryRole, setIsTemporaryRole] = useState(false);
  const [temporaryRoleExpiry, setTemporaryRoleExpiry] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const MAX_SEATS_PER_TRIP = 30;
  const today = new Date().toISOString().split('T')[0];

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(t('reservation_sessionError', { error: sessionError.message }));
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          toast.error(t('reservation_loginRequired'));
          navigate('/application/login');
          return;
        }

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
              throw new Error(t('reservation_userFetchError', { error: err.message }));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!userData) {
          logError('UserFetchFinal', new Error('No user data found'), { userId: session.user.id });
          userData = { role: 'Ticketing Agent' };
          toast.warn(t('reservation_noUserData'));
        }

        const now = new Date();
        const isTemp = userData.temporary_role && userData.temporary_role_expiry && new Date(userData.temporary_role_expiry) > now;
        const activeRole = isTemp ? userData.temporary_role : userData.role || 'Ticketing Agent';
        setUserRole(activeRole);
        setIsTemporaryRole(isTemp);
        setTemporaryRoleExpiry(isTemp ? userData.temporary_role_expiry : null);

        if (!roleMatrix[activeRole]?.canViewReservations) {
          throw new Error(t('reservation_noPermission'));
        }

        const { data: userAgenciesData, error: userAgenciesError } = await withTimeout(
          supabase
            .from('user_agencies')
            .select('agency_id')
            .eq('user_id', session.user.id)
        );
        if (userAgenciesError) throw new Error(t('reservation_agencyFetchError', { error: userAgenciesError.message }));
        setUserAgencies(userAgenciesData || []);

        let companyIdToUse = userData.company_id;
        if (!companyIdToUse) {
          const { data: companyData, error: companyError } = await supabase
            .from('transport_companies')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
          if (companyError) {
            if (companyError.code === 'PGRST116') {
              throw new Error(t('reservation_noCompany'));
            }
            throw new Error(t('reservation_companyFetchError', { error: companyError.message }));
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        let agencyQuery = supabase
          .from('agencies')
          .select('id, name, address, phone, email, manager_name, company_id, created_at, updated_at')
          .eq('company_id', companyIdToUse)
          .order('name', { ascending: true });

        if (userAgenciesData.length > 0) {
          const allowedAgencyIds = userAgenciesData.map((ua) => ua.agency_id);
          agencyQuery = agencyQuery.in('id', allowedAgencyIds);
        } else if (!roleMatrix[activeRole]?.canCreateAgency) {
          agencyQuery = agencyQuery.limit(0);
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
              throw new Error(t('reservation_agencyFetchError', { error: err.message }));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        setAgencies(agenciesData);

        if (agenciesData.length > 0) {
          setSelectedAgencyId(agenciesData[0].id);
        }

        let busQuery = supabase.from('buses').select('*').eq('company_id', companyIdToUse);
        if (!roleMatrix[activeRole]?.canCreateReservation && userAgenciesData.length > 0) {
          busQuery = busQuery.in('agency_id', userAgenciesData.map((ua) => ua.agency_id));
        }
        const { data: busesData, error: busesError } = await withTimeout(busQuery);
        if (busesError) throw new Error(t('reservation_busFetchError', { error: busesError.message }));
        setBuses(busesData || []);

        let routeQuery = supabase.from('routes').select('*').eq('company_id', companyIdToUse);
        if (!roleMatrix[activeRole]?.canCreateReservation && userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
          );
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(t('reservation_routeFetchError', { error: routesError.message }));
        setRoutes(routesData || []);

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
          busCount: busesData.length,
          routeCount: routesData.length,
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
              ? t('reservation_dbError', { code: error.code || 'N/A' })
              : t('reservation_fetchError', { error: error.message })
          );
        }
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchInitialData();
  }, [navigate, retryCount, t]);

  // Fetch reservations when agency is selected
  useEffect(() => {
    if (!companyId || !userRole || !selectedAgencyId) return;

    const fetchReservations = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const session = (await supabase.auth.getSession()).data.session;
        const userId = session?.user?.id;

        let reservationQuery = supabase
          .from('reservations')
          .select(`
            id, agency_id, route_id, passenger_count, total_price, reservation_status, payment_status,
            reservation_date_time, is_online, full_name, phone_number, seat_number, identity_card_verified,
            routes!inner(id, origin, destination, trip_date, departure_time, bus_id, wifi, charger_ports, air_conditioning)
          `)
          .eq('company_id', companyId)
          .eq('agency_id', selectedAgencyId);

        if (userRole === 'Ticketing Agent') {
          reservationQuery = reservationQuery.eq('user_id', userId);
        }

        const { data: reservationsData, error: reservationsError } = await withTimeout(reservationQuery);
        if (reservationsError) throw new Error(t('reservation_reservationsFetchError', { error: reservationsError.message }));

        const reservationsFormatted = reservationsData.map((res) => ({
          id: res.id,
          agency_id: res.agency_id,
          agency: agencies.find((a) => a.id === res.agency_id)?.name || t('reservation_unknownAgency'),
          origin: res.routes.origin,
          destination: res.routes.destination,
          departureTime: `${res.routes.trip_date} ${res.routes.departure_time}`,
          bookings: res.passenger_count,
          isOnline: res.is_online,
          busDetails: {
            type: buses.find((b) => b.id === res.routes.bus_id)?.bus_type || 'Standard',
            wifi: res.routes.wifi,
            chargerPorts: res.routes.charger_ports,
            airConditioning: res.routes.air_conditioning,
            amenities: buses.find((b) => b.id === res.routes.bus_id)?.amenities || [],
          },
          passengers: [
            {
              fullName: res.full_name || '',
              phoneNumber: res.phone_number || '',
              seatNumber: res.seat_number || '',
              passengerNumber: res.passenger_count.toString(),
              paymentStatus: res.payment_status,
              identityCardVerified: res.identity_card_verified || false,
              reservationDateTime: res.reservation_date_time,
              totalPrice: res.total_price,
              reservationStatus: res.reservation_status,
            },
          ],
        }));

        const now = new Date();
        const filteredReservations = reservationsFormatted.filter((res) => {
          try {
            const departure = new Date(res.departureTime);
            return departure >= now || (now - departure < 24 * 60 * 60 * 1000);
          } catch (error) {
            logError('ReservationFilter', error, { reservationId: res.id });
            return false;
          }
        });

        setReservations(filteredReservations);

        const assignments = filteredReservations.reduce((acc, res) => {
          acc[res.id] = Array.from({ length: res.passenger_count }, (_, i) => i + 1);
          return acc;
        }, {});
        setPassengerAssignments(assignments);

        logSuccess('ReservationsFetch', 'Reservations fetched successfully', {
          userId,
          reservationCount: filteredReservations.length,
          agencyId: selectedAgencyId,
        });
      } catch (error) {
        logError('ReservationsFetch', error, { userId: session?.user?.id });
        setError(
          error.message.includes('infinite recursion')
            ? t('reservation_dbError', { code: error.code || 'N/A' })
            : t('reservation_fetchError', { error: error.message })
        );
      } finally {
        setLoading(false);
        logSuccess('ReservationsFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchReservations();
  }, [companyId, userRole, selectedAgencyId, agencies, buses, t]);

  // Request temporary role elevation
  const requestElevation = async () => {
    try {
      if (!roleMatrix[userRole]?.canRequestElevation) {
        toast.error(t('reservation_noPermissionElevation'));
        return;
      }
      if (isTemporaryRole) {
        toast.warn(t('reservation_elevationActive'));
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
      if (elevationError) throw new Error(t('reservation_elevationError', { error: elevationError.message }));

      setUserRole(elevatedRole);
      setIsTemporaryRole(true);
      setTemporaryRoleExpiry(endTime.toISOString());
      toast.success(t('reservation_elevationSuccess'));
    } catch (error) {
      logError('ElevationRequest', error, { userId: (await supabase.auth.getUser()).data.user?.id });
      toast.error(t('reservation_elevationFailed', { error: error.message }));
    }
  };

  // Send message to passengers
  const sendMessage = async () => {
    if (!roleMatrix[userRole]?.canSendMessages) {
      toast.error(t('reservation_noPermissionSend'));
      return;
    }
    if (!messageContent.trim()) {
      toast.error(t('reservation_noMessageContent'));
      return;
    }
    if (messageContent.length > 160) {
      toast.error(t('reservation_messageTooLong'));
      return;
    }

    try {
      setLoading(true);
      const payload = {
        message: messageContent,
        companyId,
        ...(messageReservationId ? { reservationId: messageReservationId } : { agencyId: selectedAgencyId }),
      };

      const response = await fetch('https://your-supabase-project.supabase.co/functions/v1/send_message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(t('reservation_sendMessageError', { error: result.error || 'Failed to send message' }));
      }

      const { results } = result;
      const sentCount = results.filter((r) => r.status === 'sent').length;
      const failedCount = results.length - sentCount;

      if (sentCount === 0) {
        toast.warn(t('reservation_noMessagesSent'));
      } else {
        toast.success(t('reservation_messageSentSuccess', { count: sentCount, failed: failedCount }));
      }
      setMessageContent('');
      setMessageReservationId(null);
      setShowMessageForm(false);
    } catch (error) {
      logError('SendMessage', error);
      toast.error(t('reservation_sendMessageError', { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const uniqueOrigins = [...new Set(routes.map((route) => route.origin).filter(Boolean))];
  const uniqueDestinations = [...new Set(routes.map((route) => route.destination).filter(Boolean))];
  const uniquePeriods = [
    today,
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  ].sort();

  const getAvailableTimeSlots = useCallback(() => {
    try {
      if (!newBooking.origin || !newBooking.destination || !newBooking.departureDate) {
        return [];
      }
      const matchingRoutes = routes.filter(
        (route) =>
          route.origin === newBooking.origin &&
          route.destination === newBooking.destination &&
          route.trip_date === newBooking.departureDate
      );
      return matchingRoutes.map((route) => route.departure_time).sort();
    } catch (error) {
      logError('GetAvailableTimeSlots', error);
      return [];
    }
  }, [newBooking.origin, newBooking.destination, newBooking.departureDate, routes]);

  const timeSlots = getAvailableTimeSlots();

  const validatePhoneNumber = useCallback((phoneNumber) => {
    try {
      const cameroonPhoneRegex = /^\+2376[0-9]{8}$/;
      return cameroonPhoneRegex.test(phoneNumber);
    } catch (error) {
      logError('ValidatePhoneNumber', error);
      return false;
    }
  }, []);

  const addBooking = useCallback(
    async (e) => {
      e.preventDefault();
      if (!roleMatrix[userRole]?.canCreateReservation) {
        toast.error(t('reservation_noPermissionCreate'));
        return;
      }

      try {
        if (!newBooking.fullName.trim()) {
          throw new Error(t('reservation_noFullName'));
        }
        if (!validatePhoneNumber(newBooking.phoneNumber)) {
          throw new Error(t('reservation_invalidPhone'));
        }
        if (!newBooking.seatNumber.match(/^[A-Z][1-9][0-9]?$/)) {
          throw new Error(t('reservation_invalidSeat'));
        }
        if (!newBooking.departureDate || !newBooking.departureTime) {
          throw new Error(t('reservation_noDeparture'));
        }
        if (!newBooking.reservationDate || !newBooking.reservationTime) {
          throw new Error(t('reservation_noReservationDate'));
        }

        const departureDateTime = new Date(`${newBooking.departureDate}T${newBooking.departureTime}`);
        const reservationDateTime = new Date(`${newBooking.reservationDate}T${newBooking.reservationTime}`);
        const now = new Date();

        if (departureDateTime <= now) {
          throw new Error(t('reservation_pastTrip'));
        }
        if (reservationDateTime >= departureDateTime) {
          throw new Error(t('reservation_beforeDeparture'));
        }
        if (reservationDateTime > now) {
          throw new Error(t('reservation_futureReservation'));
        }

        const tripExists = routes.find(
          (route) =>
            route.origin === newBooking.origin &&
            route.destination === newBooking.destination &&
            route.trip_date === newBooking.departureDate &&
            route.departure_time === newBooking.departureTime
        );
        if (!tripExists) {
          throw new Error(t('reservation_tripNotExist', {
            origin: newBooking.origin,
            destination: newBooking.destination,
            time: newBooking.departureTime,
            date: newBooking.departureDate,
          }));
        }

        const existingReservations = reservations.filter(
          (res) =>
            res.origin === newBooking.origin &&
            res.destination === newBooking.destination &&
            res.departureTime === `${newBooking.departureDate} ${newBooking.departureTime}`
        );
        const totalSeatsBooked = existingReservations.reduce((sum, res) => sum + res.bookings, 0);
        if (totalSeatsBooked >= MAX_SEATS_PER_TRIP) {
          throw new Error(t('reservation_noSeatsAvailable'));
        }

        const pricePerPassenger = tripExists.price || 0;

        const { data: reservationData, error: insertError } = await supabase
          .from('reservations')
          .insert({
            route_id: tripExists.id,
            user_id: (await supabase.auth.getUser()).data.user.id,
            company_id: companyId,
            agency_id: selectedAgencyId,
            passenger_count: 1,
            total_price: pricePerPassenger,
            reservation_status: 'Confirmed',
            payment_status: newBooking.paymentStatus,
            reservation_date_time: reservationDateTime.toISOString(),
            is_online: newBooking.isOnline,
            full_name: newBooking.fullName.trim(),
            phone_number: newBooking.phoneNumber,
            seat_number: newBooking.seatNumber,
            identity_card_verified: newBooking.identityCardVerified,
          })
          .select(`
            id, agency_id, route_id, passenger_count, total_price, reservation_status, payment_status,
            reservation_date_time, is_online, full_name, phone_number, seat_number, identity_card_verified,
            routes!inner(id, origin, destination, trip_date, departure_time, bus_id, wifi, charger_ports, air_conditioning)
          `)
          .single();
        if (insertError) throw new Error(t('reservation_insertError', { error: insertError.message }));

        const newReservation = {
          id: reservationData.id,
          agency_id: selectedAgencyId,
          agency: agencies.find((a) => a.id === selectedAgencyId)?.name || t('reservation_unknownAgency'),
          origin: reservationData.routes.origin,
          destination: reservationData.routes.destination,
          departureTime: `${reservationData.routes.trip_date} ${reservationData.routes.departure_time}`,
          bookings: 1,
          isOnline: reservationData.is_online,
          busDetails: {
            type: buses.find((b) => b.id === reservationData.routes.bus_id)?.bus_type || 'Standard',
            wifi: reservationData.routes.wifi,
            chargerPorts: reservationData.routes.charger_ports,
            airConditioning: reservationData.routes.air_conditioning,
            amenities: buses.find((b) => b.id === reservationData.routes.bus_id)?.amenities || [],
          },
          passengers: [
            {
              fullName: reservationData.full_name.trim(),
              phoneNumber: reservationData.phone_number,
              seatNumber: reservationData.seat_number,
              passengerNumber: '1',
              paymentStatus: reservationData.payment_status,
              identityCardVerified: reservationData.identity_card_verified,
              reservationDateTime: reservationData.reservation_date_time,
              totalPrice: reservationData.total_price,
              reservationStatus: reservationData.reservation_status,
            },
          ],
        };

        setReservations((prev) => [...prev, newReservation]);
        setPassengerAssignments((prev) => ({
          ...prev,
          [newReservation.id]: [1],
        }));

        setNewBooking({
          origin: '',
          destination: '',
          departureDate: '',
          departureTime: '',
          fullName: '',
          phoneNumber: '',
          seatNumber: '',
          paymentStatus: 'Paid',
          identityCardVerified: false,
          reservationDate: '',
          reservationTime: '',
          isOnline: false,
        });
        setShowAddBookingForm(false);
        toast.success(t('reservation_addSuccess'));
      } catch (error) {
        logError('AddBooking', error);
        toast.error(
          error.message.includes('infinite recursion')
            ? t('reservation_dbError', { code: error.code || 'N/A' })
            : error.message
        );
      }
    },
    [newBooking, routes, selectedAgencyId, reservations, validatePhoneNumber, companyId, agencies, buses, userRole, t]
  );

  const filteredReservations = useCallback(() => {
    try {
      return reservations
        .filter((reservation) => reservation.agency_id === selectedAgencyId)
        .filter((reservation) =>
          filterOrigin ? reservation.origin.toLowerCase().includes(filterOrigin.toLowerCase()) : true
        )
        .filter((reservation) =>
          filterDestination ? reservation.destination.toLowerCase().includes(filterDestination.toLowerCase()) : true
        )
        .filter((reservation) => {
          const reservationDate = new Date(reservation.departureTime);
          const now = new Date();
          if (filterPeriod === 'daily') {
            return reservationDate.toDateString() === now.toDateString();
          }
          if (filterPeriod === 'weekly') {
            const weekStart = new Date(now.setDate(now.getDate() - 7));
            return reservationDate >= weekStart && reservationDate <= now;
          }
          if (filterPeriod === 'monthly') {
            return (
              reservationDate.getMonth() === now.getMonth() &&
              reservationDate.getFullYear() === now.getFullYear()
            );
          }
          return true;
        })
        .sort((a, b) => (sortOrder === 'desc' ? b.bookings - a.bookings : a.bookings - b.bookings));
    } catch (error) {
      logError('FilterReservations', error);
      toast.error(t('reservation_filterError'));
      return [];
    }
  }, [reservations, selectedAgencyId, filterOrigin, filterDestination, filterPeriod, sortOrder, t])();

  const graphData = useCallback(() => {
    try {
      return reservations
        .filter((reservation) => reservation.agency_id === selectedAgencyId)
        .filter((reservation) => {
          if (graphFilterOrigin && !reservation.origin.toLowerCase().includes(graphFilterOrigin.toLowerCase())) {
            return false;
          }
          if (graphFilterDestination && !reservation.destination.toLowerCase().includes(graphFilterDestination.toLowerCase())) {
            return false;
          }
          const reservationDate = new Date(reservation.departureTime);
          const now = new Date();
          if (graphFilterPeriod === 'last7days') {
            const startDate = new Date(now.setDate(now.getDate() - 7));
            return reservationDate >= startDate;
          }
          if (graphFilterPeriod === 'lastmonth') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return (
              reservationDate.getMonth() === lastMonth.getMonth() &&
              reservationDate.getFullYear() === lastMonth.getFullYear()
            );
          }
          return true;
        })
        .reduce((acc, reservation) => {
          const key = graphType === 'pie' ? `${reservation.origin}-${reservation.destination}` : reservation.departureTime;
          const existing = acc.find((item) => item.name === key);
          if (existing) {
            existing.bookings += reservation.bookings;
          } else {
            acc.push({ name: key, bookings: reservation.bookings });
          }
          return acc;
        }, []);
    } catch (error) {
      logError('GenerateGraphData', error);
      toast.error(t('reservation_graphDataError'));
      return [];
    }
  }, [reservations, selectedAgencyId, graphFilterOrigin, graphFilterDestination, graphFilterPeriod, graphType, t])();

  const exportToCSV = useCallback(() => {
    if (!roleMatrix[userRole]?.canGenerateReports) {
      toast.error(t('reservation_noPermissionExport'));
      return;
    }
    try {
      if (!exportOrigin || !exportDestination || !exportPeriod) {
        toast.error(t('reservation_exportFieldsRequired'));
        return;
      }

      const fields = [
        'id',
        'agency',
        'origin',
        'destination',
        'departureTime',
        'bookings',
        'isOnline',
        'busDetails',
        'passengerCount',
        'totalPrice',
        'reservationStatus',
        'paymentStatus',
        'reservationDateTime',
      ];

      const selectedReservations = reservations.filter(
        (reservation) =>
          reservation.origin === exportOrigin &&
          reservation.destination === exportDestination &&
          reservation.departureTime.startsWith(exportPeriod)
      );

      const data = selectedReservations.map((reservation) => ({
        id: reservation.id,
        agency: reservation.agency,
        origin: reservation.origin,
        destination: reservation.destination,
        departureTime: reservation.departureTime,
        bookings: reservation.bookings,
        isOnline: reservation.isOnline ? t('reservation_online') : t('reservation_inPerson'),
        busDetails: JSON.stringify(reservation.busDetails),
        passengerCount: reservation.bookings,
        totalPrice: reservation.passengers[0]?.totalPrice || 0,
        reservationStatus: reservation.passengers[0]?.reservationStatus || 'Confirmed',
        paymentStatus: reservation.passengers[0]?.paymentStatus,
        reservationDateTime: reservation.passengers[0]?.reservationDateTime,
      }));

      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reservations_${exportOrigin}_${exportDestination}_${exportPeriod}_${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('reservation_exportCSVSuccess'));
    } catch (error) {
      logError('ExportToCSV', error);
      toast.error(t('reservation_exportCSVError'));
    }
  }, [reservations, exportOrigin, exportDestination, exportPeriod, userRole, t]);

  const exportToPDF = useCallback(() => {
    if (!roleMatrix[userRole]?.canGenerateReports) {
      toast.error(t('reservation_noPermissionExport'));
      return;
    }
    try {
      if (!exportOrigin || !exportDestination || !exportPeriod) {
        toast.error(t('reservation_exportFieldsRequired'));
        return;
      }

      const doc = new jsPDF();
      doc.addImage(ENTERPRISE_LOGO, 'PNG', 14, 10, 30, 10);
      doc.setFontSize(16);
      doc.text(t('reservation_exportPDFTitle', { origin: exportOrigin, destination: exportDestination, period: exportPeriod }), 14, 25);

      const selectedReservations = reservations.filter(
        (reservation) =>
          reservation.origin === exportOrigin &&
          reservation.destination === exportDestination &&
          reservation.departureTime.startsWith(exportPeriod)
      );

      const reservationTableData = selectedReservations.map((reservation) => [
        reservation.id,
        reservation.agency,
        reservation.origin,
        reservation.destination,
        reservation.departureTime,
        reservation.bookings.toString(),
        reservation.isOnline ? t('reservation_online') : t('reservation_inPerson'),
        reservation.bookings.toString(),
      ]);

      doc.autoTable({
        head: [[
          t('reservation_id'),
          t('reservation_agency'),
          t('reservation_origin'),
          t('reservation_destination'),
          t('reservation_departure'),
          t('reservation_bookings'),
          t('reservation_type'),
          t('reservation_passengers'),
        ]],
        body: reservationTableData,
        startY: 35,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 123, 255] },
        margin: { top: 35 },
      });

      doc.save(`reservations_${exportOrigin}_${exportDestination}_${exportPeriod}_${new Date().toISOString()}.pdf`);
      toast.success(t('reservation_exportPDFSuccess'));
    } catch (error) {
      logError('ExportToPDF', error);
      toast.error(t('reservation_exportPDFError'));
    }
  }, [reservations, exportOrigin, exportDestination, exportPeriod, userRole, t]);

  const toggleRow = useCallback(
    (id) => {
      try {
        setExpandedRow((prev) => (prev === id ? null : id));
      } catch (error) {
        logError('ToggleRow', error);
        toast.error(t('reservation_toggleRowError'));
      }
    },
    [t]
  );

  const openMessageForm = (reservationId = null) => {
    setMessageReservationId(reservationId);
    setMessageContent('');
    setShowMessageForm(true);
  };

  const renderMessageForm = () => {
    try {
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
          onClick={() => setShowMessageForm(false)}
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
                  <MessageIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
                  {t('reservation_sendMessage')}
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={t('reservation_message')}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={t('reservation_messagePlaceholder')}
                    inputProps={{ maxLength: 160 }}
                    variant="outlined"
                    helperText={
                      messageReservationId
                        ? t('reservation_recipientReservation', { id: messageReservationId })
                        : t('reservation_recipientAgency', { name: agencies.find((a) => a.id === selectedAgencyId)?.name || t('reservation_agency') })
                    }
                    InputProps={{ startAdornment: <MessageIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    aria-label={t('reservation_message')}
                  />
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={sendMessage}
                      disabled={loading || !roleMatrix[userRole]?.canSendMessages}
                      sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                      aria-label={t('reservation_send')}
                    >
                      <CheckIcon sx={{ mr: 1 }} />
                      {t('reservation_send')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setShowMessageForm(false)}
                      sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                      aria-label={t('reservation_cancel')}
                    >
                      <CloseIcon sx={{ mr: 1 }} />
                      {t('reservation_cancel')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      );
    } catch (error) {
      logError('RenderMessageForm', error);
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {t('reservation_renderMessageFormError')}
          </Typography>
        </Box>
      );
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderBookingForm = () => {
    try {
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
          onClick={() => setShowAddBookingForm(false)}
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
                  <AddIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
                  {t('reservation_newBooking')}
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <form onSubmit={addBooking}>
                <Grid container spacing={gridSpacing}>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label={t('reservation_origin')}
                      value={newBooking.origin}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, origin: e.target.value, departureDate: '', departureTime: '' })
                      }
                      required
                      helperText={t('reservation_selectOrigin')}
                      variant="outlined"
                      InputProps={{ startAdornment: <BookIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      aria-label={t('reservation_origin')}
                    >
                      <MenuItem value="">{t('reservation_selectOrigin')}</MenuItem>
                      {uniqueOrigins.map((origin) => (
                        <MenuItem key={origin} value={origin}>
                          {origin}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label={t('reservation_destination')}
                      value={newBooking.destination}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, destination: e.target.value, departureDate: '', departureTime: '' })
                      }
                      required
                      helperText={t('reservation_selectDestination')}
                      variant="outlined"
                      InputProps={{ startAdornment: <BookIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      aria-label={t('reservation_destination')}
                    >
                      <MenuItem value="">{t('reservation_selectDestination')}</MenuItem>
                      {uniqueDestinations.map((destination) => (
                        <MenuItem key={destination} value={destination}>
                          {destination}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('reservation_departureDate')}
                      type="date"
                      value={newBooking.departureDate}
                      onChange={(e) => setNewBooking({ ...newBooking, departureDate: e.target.value, departureTime: '' })}
                      inputProps={{ min: today }}
                      required
                      helperText={t('reservation_departureDateHelper')}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      aria-label={t('reservation_departureDate')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label={t('reservation_departureTime')}
                      value={newBooking.departureTime}
                      onChange={(e) => setNewBooking({ ...newBooking, departureTime: e.target.value })}
                      required
                      disabled={!newBooking.departureDate || timeSlots.length === 0}
                      helperText={
                        newBooking.departureDate && timeSlots.length === 0
                          ? t('reservation_noTimeSlots')
                          : t('reservation_selectTime')
                      }
                      variant="outlined"
                      error={newBooking.departureDate && timeSlots.length === 0}
                      aria-label={t('reservation_departureTime')}
                    >
                      <MenuItem value="">{t('reservation_selectTime')}</MenuItem>
                      {timeSlots.map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('reservation_fullName')}
                      value={newBooking.fullName}
                      onChange={(e) => setNewBooking({ ...newBooking, fullName: e.target.value })}
                      placeholder={t('reservation_fullNamePlaceholder')}
                      required
                      helperText={t('reservation_fullNameHelper')}
                      variant="outlined"
                      InputProps={{ startAdornment: <BookIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      aria-label={t('reservation_fullName')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('reservation_phoneNumber')}
                      value={newBooking.phoneNumber}
                      onChange={(e) => setNewBooking({ ...newBooking, phoneNumber: e.target.value })}
                      placeholder={t('reservation_phoneNumberPlaceholder')}
                      required
                      helperText={t('reservation_phoneNumberHelper')}
                      variant="outlined"
                      InputProps={{ startAdornment: <BookIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      aria-label={t('reservation_phoneNumber')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('reservation_seatNumber')}
                      value={newBooking.seatNumber}
                      onChange={(e) => setNewBooking({ ...newBooking, seatNumber: e.target.value })}
                      placeholder={t('reservation_seatNumberPlaceholder')}
                      required
                      helperText={t('reservation_seatNumberHelper')}
                      variant="outlined"
                      InputProps={{ startAdornment: <BookIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      aria-label={t('reservation_seatNumber')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label={t('reservation_paymentStatus')}
                      value={newBooking.paymentStatus}
                      onChange={(e) => setNewBooking({ ...newBooking, paymentStatus: e.target.value })}
                      required
                      helperText={t('reservation_paymentStatusHelper')}
                      variant="outlined"
                      aria-label={t('reservation_paymentStatus')}
                    >
                      <MenuItem value="Paid">{t('reservation_paymentPaid')}</MenuItem>
                      <MenuItem value="Pending">{t('reservation_paymentPending')}</MenuItem>
                      <MenuItem value="Failed">{t('reservation_paymentFailed')}</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newBooking.identityCardVerified}
                          onChange={(e) => setNewBooking({ ...newBooking, identityCardVerified: e.target.checked })}
                        />
                      }
                      label={t('reservation_identityCardVerified')}
                      aria-label={t('reservation_identityCardVerified')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newBooking.isOnline}
                          onChange={(e) => setNewBooking({ ...newBooking, isOnline: e.target.checked })}
                        />
                      }
                      label={t('reservation_isOnline')}
                      aria-label={t('reservation_isOnline')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('reservation_reservationDate')}
                      type="date"
                      value={newBooking.reservationDate}
                      onChange={(e) => setNewBooking({ ...newBooking, reservationDate: e.target.value })}
                      inputProps={{ max: today }}
                      required
                      helperText={t('reservation_reservationDateHelper')}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      aria-label={t('reservation_reservationDate')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label={t('reservation_reservationTime')}
                      value={newBooking.reservationTime}
                      onChange={(e) => setNewBooking({ ...newBooking, reservationTime: e.target.value })}
                      required
                      helperText={t('reservation_reservationTimeHelper')}
                      variant="outlined"
                      aria-label={t('reservation_reservationTime')}
                    >
                      <MenuItem value="">{t('reservation_selectTime')}</MenuItem>
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2).toString().padStart(2, '0');
                        const minutes = (i % 2) * 30 === 0 ? '00' : '30';
                        return `${hours}:${minutes}`;
                      }).map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={!roleMatrix[userRole]?.canCreateReservation}
                        sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                        aria-label={t('reservation_add')}
                      >
                        <CheckIcon sx={{ mr: 1 }} />
                        {t('reservation_add')}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setShowAddBookingForm(false)}
                        sx={{ '&:hover': { borderColor: theme.palette.error.main, color: theme.palette.error.main, transform: 'scale(1.05)' } }}
                        aria-label={t('reservation_cancel')}
                      >
                        <CloseIcon sx={{ mr: 1 }} />
                        {t('reservation_cancel')}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Box>
      );
    } catch (error) {
      logError('RenderBookingForm', error);
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {t('reservation_renderBookingFormError')}
          </Typography>
        </Box>
      );
    }
  };

  // Role-based no company message
  const getNoCompanyMessage = () => {
    switch (userRole) {
      case 'Super Admin':
        return (
          <>
            <Typography variant="h6" color="error">
              {t('reservation_noCompany')}
            </Typography>
            <Typography variant="body2">
              {t('reservation_createCompanyPrompt')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/create-transport-company')}
              sx={{ mt: 2 }}
              aria-label={t('reservation_createCompany')}
            >
              {t('reservation_createCompany')}
            </Button>
          </>
        );
      case 'Operations Manager':
      case 'Agent Supervisor':
      case 'Ticketing Agent':
        return (
          <>
            <Typography variant="h6" color="error">
              {t('reservation_noCompanyAssociated')}
            </Typography>
            <Typography variant="body2">
              {t('reservation_contactAdminPrompt')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.open('https://support.example.com', '_blank')}
              sx={{ mt: 2 }}
              aria-label={t('reservation_contactAdmin')}
            >
              {t('reservation_contactAdmin')}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate('/dashboard/default')}
              sx={{ mt: 2, ml: 2 }}
              aria-label={t('reservation_returnToDashboard')}
            >
              {t('reservation_returnToDashboard')}
            </Button>
          </>
        );
      default:
        return (
          <>
            <Typography variant="h6" color="error">
              {t('reservation_unrecognizedRole')}
            </Typography>
            <Typography variant="body2">
              {t('reservation_contactSupportPrompt')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.open('https://support.example.com', '_blank')}
              sx={{ mt: 2 }}
              aria-label={t('reservation_contactSupport')}
            >
              {t('reservation_contactSupport')}
            </Button>
          </>
        );
    }
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
            {getNoCompanyMessage()}
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  if (agencies.length === 0) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Breadcrumb title={t('reservation_pageTitle')}>
              <Typography
                variant="subtitle2"
                color="primary"
                className="link-breadcrumb"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <BookIcon sx={{ mr: 1, fontSize: '1rem' }} />
                {t('reservation_pageTitle')}
              </Typography>
            </Breadcrumb>
            <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
              <CardHeader
                title={
                  <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                    <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('reservation_noAgencies')}
                    {isTemporaryRole && temporaryRoleExpiry && (
                      <Chip
                        label={t('reservation_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                        color="warning"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                }
                action={
                  roleMatrix[userRole]?.canRequestElevation && !isTemporaryRole && (
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={requestElevation}
                      startIcon={<ElevateIcon />}
                      sx={{ '&:hover': { backgroundColor: theme.palette.warning.dark, transform: 'scale(1.05)' } }}
                      aria-label={t('reservation_requestElevation')}
                    >
                      {t('reservation_requestElevation')}
                    </Button>
                  )
                }
              />
              <Divider />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <BookIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                  {t('reservation_noAgenciesMessage')}
                </Typography>
                {roleMatrix[userRole]?.canCreateAgency && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/create-agency')}
                    sx={{ mt: 2 }}
                    aria-label={t('reservation_createAgency')}
                  >
                    {t('reservation_createAgency')}
                  </Button>
                )}
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
            <Breadcrumb title={t('reservation_pageTitle')}>
              <Typography
                variant="subtitle2"
                color="primary"
                className="link-breadcrumb"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <BookIcon sx={{ mr: 1, fontSize: '1rem' }} />
                {t('reservation_pageTitle')}
              </Typography>
            </Breadcrumb>
            <Grid container spacing={gridSpacing}>
              <Grid item xs={12}>
                <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <img src={ENTERPRISE_LOGO} alt={t('reservation_logoAlt')} style={{ height: '30px', marginRight: '16px' }} />
                        <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                          {t('reservation_pageTitle')} - {agencies.find((a) => a.id === selectedAgencyId)?.name || t('reservation_agency')}
                          {isTemporaryRole && temporaryRoleExpiry && (
                            <Chip
                              label={t('reservation_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                              color="warning"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      </Box>
                    }
                    action={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          select
                          label={t('reservation_changeAgency')}
                          value={selectedAgencyId}
                          onChange={(e) => setSelectedAgencyId(e.target.value)}
                          variant="outlined"
                          sx={{ minWidth: 200 }}
                          InputProps={{ startAdornment: <BookIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                          aria-label={t('reservation_changeAgency')}
                        >
                          {agencies.map((agency) => (
                            <MenuItem key={agency.id} value={agency.id}>
                              {agency.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        {roleMatrix[userRole]?.canRequestElevation && !isTemporaryRole && (
                          <Button
                            variant="contained"
                            color="warning"
                            onClick={requestElevation}
                            startIcon={<ElevateIcon />}
                            sx={{ '&:hover': { backgroundColor: theme.palette.warning.dark, transform: 'scale(1.05)' } }}
                            aria-label={t('reservation_requestElevation')}
                          >
                            {t('reservation_requestElevation')}
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => setShowAddBookingForm(true)}
                          startIcon={<AddIcon />}
                          disabled={!roleMatrix[userRole]?.canCreateReservation}
                          sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                          aria-label={t('reservation_addBooking')}
                        >
                          {t('reservation_addBooking')}
                        </Button>
                        <Button
                          variant="contained"
                          color="info"
                          onClick={() => openMessageForm()}
                          startIcon={<MessageIcon />}
                          disabled={!roleMatrix[userRole]?.canSendMessages}
                          sx={{ '&:hover': { backgroundColor: theme.palette.info.dark, transform: 'scale(1.05)' } }}
                          aria-label={t('reservation_messageAgency')}
                        >
                          {t('reservation_messageAgency')}
                        </Button>
                      </Box>
                    }
                  />
                  <Divider />
                  <CardContent>
                    {error && (
                      <Alert severity="error" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <BookIcon sx={{ mr: 1 }} />
                        {t('reservation_error', { error })}
                      </Alert>
                    )}
                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                      <Tab label={t('reservation_tableTab')} value="table" icon={<BookIcon />} iconPosition="start" />
                      <Tab
                        label={t('reservation_graphsTab')}
                        value="graphs"
                        icon={<BarChartIcon />}
                        iconPosition="start"
                        disabled={!roleMatrix[userRole]?.canViewAnalytics}
                      />
                    </Tabs>
                    {activeTab === 'table' && (
                      <>
                        <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label={t('reservation_filterOrigin')}
                              value={filterOrigin}
                              onChange={(e) => setFilterOrigin(e.target.value)}
                              placeholder={t('reservation_filterOriginPlaceholder')}
                              variant="outlined"
                              helperText={t('reservation_filterOriginHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_filterOrigin')}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label={t('reservation_filterDestination')}
                              value={filterDestination}
                              onChange={(e) => setFilterDestination(e.target.value)}
                              placeholder={t('reservation_filterDestinationPlaceholder')}
                              variant="outlined"
                              helperText={t('reservation_filterDestinationHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_filterDestination')}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              select
                              fullWidth
                              label={t('reservation_filterPeriod')}
                              value={filterPeriod}
                              onChange={(e) => setFilterPeriod(e.target.value)}
                              variant="outlined"
                              helperText={t('reservation_filterPeriodHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_filterPeriod')}
                            >
                              <MenuItem value="daily">{t('reservation_periodDaily')}</MenuItem>
                              <MenuItem value="weekly">{t('reservation_periodWeekly')}</MenuItem>
                              <MenuItem value="monthly">{t('reservation_periodMonthly')}</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              select
                              fullWidth
                              label={t('reservation_sortBookings')}
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value)}
                              variant="outlined"
                              helperText={t('reservation_sortBookingsHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_sortBookings')}
                            >
                              <MenuItem value="desc">{t('reservation_sortHighToLow')}</MenuItem>
                              <MenuItem value="asc">{t('reservation_sortLowToHigh')}</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
                              <DownloadIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                              {t('reservation_exportData')}
                            </Typography>
                            <Grid container spacing={gridSpacing}>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  select
                                  fullWidth
                                  label={t('reservation_exportOrigin')}
                                  value={exportOrigin}
                                  onChange={(e) => setExportOrigin(e.target.value)}
                                  variant="outlined"
                                  helperText={t('reservation_exportOriginHelper')}
                                  InputProps={{ startAdornment: <DownloadIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                                  aria-label={t('reservation_exportOrigin')}
                                >
                                  <MenuItem value="">{t('reservation_selectOrigin')}</MenuItem>
                                  {uniqueOrigins.map((origin) => (
                                    <MenuItem key={origin} value={origin}>
                                      {origin}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  select
                                  fullWidth
                                  label={t('reservation_exportDestination')}
                                  value={exportDestination}
                                  onChange={(e) => setExportDestination(e.target.value)}
                                  variant="outlined"
                                  helperText={t('reservation_exportDestinationHelper')}
                                  InputProps={{ startAdornment: <DownloadIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                                  aria-label={t('reservation_exportDestination')}
                                >
                                  <MenuItem value="">{t('reservation_selectDestination')}</MenuItem>
                                  {uniqueDestinations.map((destination) => (
                                    <MenuItem key={destination} value={destination}>
                                      {destination}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  select
                                  fullWidth
                                  label={t('reservation_exportPeriod')}
                                  value={exportPeriod}
                                  onChange={(e) => setExportPeriod(e.target.value)}
                                  variant="outlined"
                                  helperText={t('reservation_exportPeriodHelper')}
                                  InputProps={{ startAdornment: <DownloadIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                                  aria-label={t('reservation_exportPeriod')}
                                >
                                  <MenuItem value="">{t('reservation_selectPeriod')}</MenuItem>
                                  {uniquePeriods.map((period) => (
                                    <MenuItem key={period} value={period}>
                                      {period}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={exportToCSV}
                                    startIcon={<DownloadIcon />}
                                    disabled={!roleMatrix[userRole]?.canGenerateReports}
                                    sx={{ '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                                    aria-label={t('reservation_exportCSV')}
                                  >
                                    {t('reservation_exportCSV')}
                                  </Button>
                                  <Button
                                    variant="contained"
                                    color="error"
                                    onClick={exportToPDF}
                                    startIcon={<PictureAsPdfIcon />}
                                    disabled={!roleMatrix[userRole]?.canGenerateReports}
                                    sx={{ '&:hover': { backgroundColor: theme.palette.error.dark, transform: 'scale(1.05)' } }}
                                    aria-label={t('reservation_exportPDF')}
                                  >
                                    {t('reservation_exportPDF')}
                                  </Button>
                                </Box>
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                        <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                          <Table aria-label={t('reservation_table')}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_agency')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_origin')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_destination')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_departure')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_bookings')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_type')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_bus')}
                                  </Box>
                                </TableCell>
                             
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BookIcon sx={{ mr: 1 }} />
                                    {t('reservation_passengers')}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <MessageIcon sx={{ mr: 1 }} />
                                    {t('reservation_actions')}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredReservations.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={9} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <BookIcon sx={{ mr: 1 }} />
                                      {t('reservation_noReservations')}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredReservations.map((reservation) => (
                                  <React.Fragment key={reservation.id}>
                                    <TableRow
                                      onClick={() => toggleRow(reservation.id)}
                                      sx={{ '&:hover': { backgroundColor: 'action.hover' }, cursor: 'pointer' }}
                                      aria-label={t('reservation_row', { id: reservation.id })}
                                    >
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                          {reservation.agency}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                          {reservation.origin}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                          {reservation.destination}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                          {reservation.departureTime}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                          {reservation.bookings}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                          {reservation.isOnline ? t('reservation_online') : t('reservation_inPerson')}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                          {reservation.busDetails.type}
                                          {reservation.busDetails.amenities.length > 0 && ` (${reservation.busDetails.amenities.join(', ')})`}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          color="primary"
                                          startIcon={expandedRow === reservation.id ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                          sx={{ '&:hover': { color: theme.palette.primary.dark, transform: 'scale(1.05)' } }}
                                          aria-label={expandedRow === reservation.id ? t('reservation_hidePassengerDetails') : t('reservation_viewPassengerDetails', { count: reservation.passengers.length })}
                                        >
                                          {expandedRow === reservation.id ? t('reservation_hide') : t('reservation_view')} ({reservation.passengers.length})
                                        </Button>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          color="info"
                                          onClick={() => openMessageForm(reservation.id)}
                                          startIcon={<MessageIcon />}
                                          disabled={!roleMatrix[userRole]?.canSendMessages}
                                          sx={{ '&:hover': { color: theme.palette.info.dark, transform: 'scale(1.05)' } }}
                                          aria-label={t('reservation_messagePassenger', { id: reservation.id })}
                                        >
                                          {t('reservation_message')}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                    {expandedRow === reservation.id && (
                                      <TableRow>
                                        <TableCell colSpan={9} sx={{ backgroundColor: 'grey.100', transition: 'all 0.3s ease-in-out' }}>
                                          <Box sx={{ p: 2 }}>
                                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                              <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                              {t('reservation_bookingDetails')}
                                            </Typography>
                                            <TableContainer component={Paper}>
                                              <Table size="small" aria-label={t('reservation_passengerDetailsTable')}>
                                                <TableHead>
                                                  <TableRow sx={{ backgroundColor: 'grey.200' }}>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <BookIcon sx={{ mr: 1 }} />
                                                        {t('reservation_reservationStatus')}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <BookIcon sx={{ mr: 1 }} />
                                                        {t('reservation_passengerCount')}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <BookIcon sx={{ mr: 1 }} />
                                                        {t('reservation_totalPrice')}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <BookIcon sx={{ mr: 1 }} />
                                                        {t('reservation_paymentStatus')}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <BookIcon sx={{ mr: 1 }} />
                                                        {t('reservation_reservationDateTime')}
                                                      </Box>
                                                    </TableCell>
                                                  </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                  {reservation.passengers.map((passenger, index) => (
                                                    <TableRow key={index}>
                                                      <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                                          {passenger.reservationStatus}
                                                        </Box>
                                                      </TableCell>
                                                      <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                          <BookIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                                          {reservation.bookings}
                                                        </Box>
                                                      </TableCell>
                                                      <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                          <BookIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                                          {passenger.totalPrice || 0} {t('reservation_currency')}
                                                        </Box>
                                                      </TableCell>
                                                      <TableCell sx={{ color: 'primary.main', fontFamily: 'monospace' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                          <BookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                                          {passenger.paymentStatus}
                                                        </Box>
                                                      </TableCell>
                                                      <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                          <BookIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                                          {passenger.reservationDateTime}
                                                        </Box>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </TableContainer>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                    {activeTab === 'graphs' && roleMatrix[userRole]?.canViewAnalytics && (
                      <Box>
                        <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              select
                              fullWidth
                              label={t('reservation_graphFilterPeriod')}
                              value={graphFilterPeriod}
                              onChange={(e) => setGraphFilterPeriod(e.target.value)}
                              variant="outlined"
                              helperText={t('reservation_graphFilterPeriodHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_graphFilterPeriod')}
                            >
                              <MenuItem value="all">{t('reservation_periodAll')}</MenuItem>
                              <MenuItem value="last7days">{t('reservation_periodLast7Days')}</MenuItem>
                              <MenuItem value="lastmonth">{t('reservation_periodLastMonth')}</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label={t('reservation_graphFilterOrigin')}
                              value={graphFilterOrigin}
                              onChange={(e) => setGraphFilterOrigin(e.target.value)}
                              placeholder={t('reservation_graphFilterOriginPlaceholder')}
                              variant="outlined"
                              helperText={t('reservation_graphFilterOriginHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_graphFilterOrigin')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label={t('reservation_graphFilterDestination')}
                              value={graphFilterDestination}
                              onChange={(e) => setGraphFilterDestination(e.target.value)}
                              placeholder={t('reservation_graphFilterDestinationPlaceholder')}
                              variant="outlined"
                              helperText={t('reservation_graphFilterDestinationHelper')}
                              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_graphFilterDestination')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              select
                              fullWidth
                              label={t('reservation_graphType')}
                              value={graphType}
                              onChange={(e) => setGraphType(e.target.value)}
                              variant="outlined"
                              helperText={t('reservation_graphTypeHelper')}
                              InputProps={{ startAdornment: <BarChartIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                              aria-label={t('reservation_graphType')}
                            >
                              <MenuItem value="line">{t('reservation_graphLine')}</MenuItem>
                              <MenuItem value="bar">{t('reservation_graphBar')}</MenuItem>
                              <MenuItem value="pie">{t('reservation_graphPie')}</MenuItem>
                            </TextField>
                          </Grid>
                        </Grid>
                        {graphData.length > 0 ? (
                          <Box sx={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              {graphType === 'line' && (
                                <LineChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                  <XAxis dataKey="name" stroke="#213547" />
                                  <YAxis stroke="#213547" />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', color: '#213547', borderRadius: '4px' }}
                                    formatter={(value, name, props) => [`${value} ${t('reservation_bookings')}`, props.payload.name]}
                                  />
                                  <Legend />
                                  <Line type="monotone" dataKey="bookings" stroke="#0088FE" />
                                </LineChart>
                              )}
                              {graphType === 'bar' && (
                                <BarChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                  <XAxis dataKey="name" stroke="#213547" />
                                  <YAxis stroke="#213547" />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', color: '#213547', borderRadius: '4px' }}
                                    formatter={(value, name, props) => [`${value} ${t('reservation_bookings')}`, props.payload.name]}
                                  />
                                  <Legend />
                                  <Bar dataKey="bookings" fill="#00C49F" />
                                </BarChart>
                              )}
                              {graphType === 'pie' && (
                                <PieChart>
                                  <Pie
                                    data={graphData}
                                    dataKey="bookings"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={150}
                                    label={({ name, bookings }) => `${name}: ${bookings}`}
                                  >
                                    {graphData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', color: '#213547', borderRadius: '4px' }}
                                    formatter={(value, name) => [`${value} ${t('reservation_bookings')}`, name]}
                                  />
                                  <Legend />
                                </PieChart>
                              )}
                            </ResponsiveContainer>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookIcon sx={{ mr: 1 }} />
                            {t('reservation_noGraphData')}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            {showAddBookingForm && renderBookingForm()}
            {showMessageForm && renderMessageForm()}
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  } catch (error) {
    logError('RenderReservationTracking', error);
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {t('reservation_criticalError')}
          </Typography>
          <Typography variant="body2">
            {t('reservation_unexpectedError')}
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }
};

ReservationTracking.propTypes = {
  // No props needed since agency is selected dynamically
};

export default ReservationTracking;