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
  Box,
  CssBaseline,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Message as MessageIcon, FilterList as FilterListIcon, Timeline as TimelineIcon, BarChart as BarChartIcon, PieChart as PieChartIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
    canSendMessages: true,
    canViewAgencies: true,
    canViewAnalytics: true,
  },
  'Operations Manager': {
    canViewReservations: true,
    canSendMessages: true,
    canViewAgencies: true,
    canViewAnalytics: true,
  },
  'Agent Supervisor': {
    canViewReservations: true,
    canSendMessages: false,
    canViewAgencies: true,
    canViewAnalytics: false,
  },
  'Ticketing Agent': {
    canViewReservations: true,
    canSendMessages: false,
    canViewAgencies: true,
    canViewAnalytics: false,
  },
};

const ReservationGraph = () => {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageReservationId, setMessageReservationId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [graphType, setGraphType] = useState('line');
  const [graphFilterPeriod, setGraphFilterPeriod] = useState('all');
  const [graphFilterOrigin, setGraphFilterOrigin] = useState('');
  const [graphFilterDestination, setGraphFilterDestination] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(`Failed to get session: ${sessionError.message}`);
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          toast.error('Login required');
          navigate('/application/login');
          return;
        }

        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('user_id, role, company_id')
          .eq('user_id', session.user.id)
          .single();
        if (userRowError) throw new Error(`Failed to fetch user: ${userRowError.message}`);

        setUserRole(userRow.role || 'Ticketing Agent');

        if (!roleMatrix[userRow.role]?.canViewReservations || !roleMatrix[userRow.role]?.canViewAnalytics) {
          throw new Error('You do not have permission to view reservation analytics');
        }

        const { data: userAgenciesData, error: userAgenciesError } = await withTimeout(
          supabase
            .from('user_agencies')
            .select('agency_id')
            .eq('user_id', session.user.id)
        );
        if (userAgenciesError) throw new Error(`Failed to fetch user agencies: ${userAgenciesError.message}`);
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
              throw new Error('No company associated with this user');
            }
            throw new Error(`Failed to fetch company: ${companyError.message}`);
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        let agencyQuery = supabase
          .from('agencies')
          .select('id, name')
          .eq('company_id', companyIdToUse)
          .order('name', { ascending: true });

        if (userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          agencyQuery = agencyQuery.in('id', agencyIds);
        }

        const { data: agenciesData, error: agenciesError } = await withTimeout(agencyQuery);
        if (agenciesError) throw new Error(`Failed to fetch agencies: ${agenciesError.message}`);
        setAgencies(agenciesData || []);

        if (agenciesData.length > 0) {
          setSelectedAgencyId(agenciesData[0].id);
        }

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
        });
      } catch (error) {
        logError('InitialDataFetch', error, { userId: session?.user?.id, retryCount });
        if ((error.message.includes('infinite recursion') || error.message.includes('timeout')) && retryCount < maxRetries) {
          setRetryCount(retryCount + 1);
          setTimeout(() => fetchInitialData(), 1000);
        } else {
          setError(
            error.message.includes('infinite recursion') || error.message.includes('timeout')
              ? `Database error: ${error.code || 'N/A'}`
              : `Failed to fetch data: ${error.message}`
          );
        }
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchInitialData();
  }, [navigate, retryCount]);

  // Fetch reservations
  useEffect(() => {
    if (!companyId || !userRole || !selectedAgencyId) return;

    const fetchReservations = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const session = (await supabase.auth.getSession()).data.session;
        const userId = session?.user?.id;

        const { data: reservationData, error: reservationError } = await withTimeout(
          supabase
            .from('reservations')
            .select(`
              id,
              route_id,
              user_id,
              company_id,
              agency_id,
              passenger_count,
              total_price,
              reservation_status,
              payment_status,
              reservation_date_time,
              is_online,
              created_at,
              updated_at,
              routes!inner(
                id,
                origin,
                destination,
                trip_date,
                departure_time,
                arrival_time,
                bus_id,
                departure_agency_id,
                arrival_agency_id,
                company_id
              ),
              agencies!inner(id, name, address),
              transport_companies!inner(id, name, contact_phone)
            `)
            .eq('company_id', companyId)
            .eq('agency_id', selectedAgencyId)
        );

        if (reservationError) {
          throw new Error(`Failed to fetch reservations: ${reservationError.message}`);
        }

        if (!reservationData || reservationData.length === 0) {
          setReservations([]);
          return;
        }

        const reservationPromises = reservationData.map(async (reservation) => {
          const { data: assignmentData, error: assignmentError } = await supabase
            .from('passenger_assignments')
            .select(`
              id,
              name,
              phone_number,
              seat_number,
              passenger_number,
              payment_status,
              identity_card_verified,
              reservation_date_time,
              is_online,
              created_at,
              passenger_id,
              passengers!left(
                id,
                first_name,
                dob,
                gender,
                government_id,
                is_user_profile
              )
            `)
            .eq('route_id', reservation.route_id)
            .eq('company_id', reservation.company_id)
            .eq('agency_id', reservation.agency_id);

          if (assignmentError) {
            logError('PassengerAssignmentsFetch', assignmentError, { reservationId: reservation.id });
            throw new Error(`Failed to fetch passenger assignments for reservation ${reservation.id}: ${assignmentError.message}`);
          }

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
              id,
              phone_number,
              email,
              name,
              dob,
              country_code,
              updated_at,
              profile_picture,
              whatsapp_sms_opt_in,
              government_id_front,
              government_id_back,
              default_search_date,
              push_token,
              last_profile_update
            `)
            .eq('id', reservation.user_id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            logError('ProfileFetch', profileError, { reservationId: reservation.id });
          }

          const { data: busData, error: busError } = await supabase
            .from('buses')
            .select('license_plate, bus_type')
            .eq('id', reservation.routes.bus_id)
            .single();

          if (busError && busError.code !== 'PGRST116') {
            logError('BusFetch', busError, { reservationId: reservation.id });
          }

          let boardingLocation = 'N/A';
          if (reservation.routes.departure_agency_id) {
            const { data: departureAgency, error: departureError } = await supabase
              .from('agencies')
              .select('address')
              .eq('id', reservation.routes.departure_agency_id)
              .single();
            if (departureError && departureError.code !== 'PGRST116') {
              logError('DepartureAgencyFetch', departureError, { reservationId: reservation.id });
            } else {
              boardingLocation = departureAgency?.address || 'N/A';
            }
          }

          let droppingLocation = 'N/A';
          if (reservation.routes.arrival_agency_id) {
            const { data: arrivalAgency, error: arrivalError } = await supabase
              .from('agencies')
              .select('address')
              .eq('id', reservation.routes.arrival_agency_id)
              .single();
            if (arrivalError && arrivalError.code !== 'PGRST116') {
              logError('ArrivalAgencyFetch', arrivalError, { reservationId: reservation.id });
            } else {
              droppingLocation = arrivalAgency?.address || 'N/A';
            }
          }

          const departureDate = new Date(`${reservation.routes.trip_date}T${reservation.routes.departure_time}Z`);
          const arrivalDate = (() => {
            const [depHours, depMinutes] = reservation.routes.departure_time.split(':').map(Number);
            const [arrHours, arrMinutes] = reservation.routes.arrival_time.split(':').map(Number);
            const baseDate = new Date(reservation.routes.trip_date);
            if (arrHours < depHours || (arrHours === depHours && arrMinutes < depMinutes)) {
              baseDate.setDate(baseDate.getDate() + 1);
            }
            return new Date(`${baseDate.toISOString().split('T')[0]}T${reservation.routes.arrival_time}Z`);
          })();

          const passengers = (assignmentData || []).map((assignment) => ({
            fullName: assignment.name || assignment.passengers?.first_name || profileData?.name || 'Unknown',
            phoneNumber: assignment.phone_number || profileData?.phone_number || 'Unknown',
            seatNumber: Array.isArray(assignment.seat_number) && assignment.seat_number.length > 0 ? assignment.seat_number.join(', ') : 'None',
            passengerNumber: assignment.passenger_number?.toString() || 'Unknown',
            paymentStatus: assignment.payment_status || 'Unknown',
            identityCardVerified: assignment.identity_card_verified ? 'Yes' : 'No',
            reservationDateTime: assignment.reservation_date_time ? new Date(assignment.reservation_date_time).toLocaleString() : 'Unknown',
            dob: assignment.passengers?.dob || profileData?.dob || 'Unknown',
            gender: assignment.passengers?.gender || 'Unknown',
            governmentId: assignment.passengers?.government_id || profileData?.government_id_front || 'Unknown',
            email: profileData?.email || 'Unknown',
            isOnline: assignment.is_online ? 'Yes' : 'No',
            countryCode: profileData?.country_code || 'Unknown',
            profilePicture: profileData?.profile_picture || 'None',
            whatsappSmsOptIn: profileData?.whatsapp_sms_opt_in ? 'Yes' : 'No',
            governmentIdBack: profileData?.government_id_back || 'None',
            defaultSearchDate: profileData?.default_search_date || 'Unknown',
            pushToken: profileData?.push_token || 'None',
            lastProfileUpdate: profileData?.last_profile_update ? new Date(profileData.last_profile_update).toLocaleString() : 'Unknown',
            passengerAssignmentCreatedAt: assignment.created_at ? new Date(assignment.created_at).toLocaleString() : 'Unknown',
          }));

          if (passengers.length === 0) {
            passengers.push({
              fullName: profileData?.name || 'Unknown',
              phoneNumber: profileData?.phone_number || 'Unknown',
              seatNumber: 'None',
              passengerNumber: 'Unknown',
              paymentStatus: reservation.payment_status || 'Unknown',
              identityCardVerified: 'No',
              reservationDateTime: reservation.reservation_date_time ? new Date(reservation.reservation_date_time).toLocaleString() : 'Unknown',
              dob: profileData?.dob || 'Unknown',
              gender: 'Unknown',
              governmentId: profileData?.government_id_front || 'Unknown',
              email: profileData?.email || 'Unknown',
              isOnline: reservation.is_online ? 'Yes' : 'No',
              countryCode: profileData?.country_code || 'Unknown',
              profilePicture: profileData?.profile_picture || 'None',
              whatsappSmsOptIn: profileData?.whatsapp_sms_opt_in ? 'Yes' : 'No',
              governmentIdBack: profileData?.government_id_back || 'None',
              defaultSearchDate: profileData?.default_search_date || 'Unknown',
              pushToken: profileData?.push_token || 'None',
              lastProfileUpdate: profileData?.last_profile_update ? new Date(profileData.last_profile_update).toLocaleString() : 'Unknown',
              passengerAssignmentCreatedAt: reservation.created_at ? new Date(reservation.created_at).toLocaleString() : 'Unknown',
            });
          }

          return {
            id: reservation.id,
            routeId: reservation.route_id,
            userId: reservation.user_id,
            agency: reservation.agencies.name || 'Unknown',
            agencyId: reservation.agencies.id || 'Unknown',
            agencyAddress: reservation.agencies.address || 'Unknown',
            companyId: reservation.company_id,
            companyName: reservation.transport_companies.name || 'Unknown',
            companyContact: reservation.transport_companies.contact_phone || 'Unknown',
            origin: reservation.routes.origin || 'Unknown',
            destination: reservation.routes.destination || 'Unknown',
            departureTime: departureDate.toLocaleString(),
            arrivalTime: arrivalDate.toLocaleString(),
            tripDate: reservation.routes.trip_date || 'Unknown',
            departureAgencyId: reservation.routes.departure_agency_id || 'Unknown',
            arrivalAgencyId: reservation.routes.arrival_agency_id || 'Unknown',
            busId: reservation.routes.bus_id || 'Unknown',
            busPlate: busData?.license_plate || 'Unknown',
            busType: busData?.bus_type || 'Unknown',
            boardingLocation,
            droppingLocation,
            passengerCount: reservation.passenger_count || 0,
            totalPrice: reservation.total_price || 0,
            reservationStatus: reservation.reservation_status || 'Unknown',
            paymentStatus: reservation.payment_status || 'Unknown',
            isOnline: reservation.is_online ? 'Yes' : 'No',
            reservationDateTime: reservation.reservation_date_time ? new Date(reservation.reservation_date_time).toLocaleString() : 'Unknown',
            createdAt: reservation.created_at ? new Date(reservation.created_at).toLocaleString() : 'Unknown',
            updatedAt: reservation.updated_at ? new Date(reservation.updated_at).toLocaleString() : 'Unknown',
            passengers,
          };
        });

        const formattedReservations = (await Promise.all(reservationPromises)).filter(
          (r) => r !== null
        );
        setReservations(formattedReservations);

        logSuccess('ReservationsFetch', 'Reservations fetched successfully', {
          userId,
          reservationCount: formattedReservations.length,
          agencyId: selectedAgencyId,
        });
      } catch (error) {
        logError('ReservationsFetch', error, { userId: session?.user?.id });
        setError(
          error.message.includes('infinite recursion') || error.message.includes('timeout')
            ? `Database error: ${error.code || 'N/A'}`
            : `Failed to fetch reservations: ${error.message}`
        );
      } finally {
        setLoading(false);
        logSuccess('ReservationsFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchReservations();
  }, [companyId, userRole, selectedAgencyId]);

  // Send message to passengers
  const sendMessage = useCallback(async () => {
    if (!roleMatrix[userRole]?.canSendMessages) {
      toast.error('You do not have permission to send messages');
      return;
    }
    if (!messageContent.trim()) {
      toast.error('Message content cannot be empty');
      return;
    }
    if (messageContent.length > 160) {
      toast.error('Message is too long (max 160 characters)');
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
        throw new Error(`Failed to send message: ${result.error || 'Unknown error'}`);
      }

      const { results } = result;
      const sentCount = results.filter((r) => r.status === 'sent').length;
      const failedCount = results.length - sentCount;
      const whatsappCount = results.filter((r) => r.status === 'sent' && r.channel === 'whatsapp').length;
      const smsCount = results.filter((r) => r.status === 'sent' && r.channel === 'sms').length;

      if (results.length > 0) {
        const messageInserts = results.map((r) => ({
          company_id: companyId,
          agency_id: messageReservationId ? null : selectedAgencyId,
          reservation_id: messageReservationId,
          phone_number: r.phone_number,
          message_content: messageContent,
          channel: r.channel,
          status: r.status,
          error_message: r.error || null,
          sent_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase.from('messages').insert(messageInserts);
        if (insertError && insertError.code !== '42P01') {
          logError('MessageInsert', insertError);
          toast.warn('Failed to log messages to database');
        }
      }

      if (sentCount === 0) {
        toast.warn('No messages were sent');
      } else {
        toast.success(
          `Successfully sent ${sentCount} messages (${whatsappCount} WhatsApp, ${smsCount} SMS). ${failedCount} failed.`
        );
      }
      setMessageContent('');
      setMessageReservationId(null);
      setShowMessageForm(false);
    } catch (error) {
      logError('SendMessage', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [messageContent, messageReservationId, selectedAgencyId, companyId, userRole]);

  const openMessageForm = (reservationId = null) => {
    setMessageReservationId(reservationId);
    setMessageContent('');
    setShowMessageForm(true);
  };

  const renderMessageForm = () => (
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
      onClick={() => setShowMessageForm(false)}
    >
      <Card
        sx={{ width: '80%', maxWidth: 500, p: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <MessageIcon sx={{ mr: 1 }} />
              Send Message
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter your message here"
                inputProps={{ maxLength: 160 }}
                variant="outlined"
                helperText={
                  messageReservationId
                    ? `Sending to reservation ${messageReservationId}`
                    : `Sending to agency ${agencies.find((a) => a.id === selectedAgencyId)?.name || 'Unknown'}`
                }
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={sendMessage}
                disabled={loading || !roleMatrix[userRole]?.canSendMessages}
                startIcon={<MessageIcon />}
              >
                Send
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowMessageForm(false)}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const uniqueOrigins = [...new Set(reservations.map((res) => res.origin).filter(Boolean))];
  const uniqueDestinations = [...new Set(reservations.map((res) => res.destination).filter(Boolean))];

  const graphData = useCallback(() => {
    try {
      return reservations
        .filter((reservation) => reservation.agencyId === selectedAgencyId)
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
          const key = graphType === 'pie' ? `${reservation.origin}-${reservation.destination}` : reservation.tripDate;
          const existing = acc.find((item) => item.name === key);
          if (existing) {
            existing.passengerCount += reservation.passengerCount;
            existing.totalPrice += reservation.totalPrice;
          } else {
            acc.push({
              name: key,
              passengerCount: reservation.passengerCount,
              totalPrice: reservation.totalPrice,
            });
          }
          return acc;
        }, []);
    } catch (error) {
      logError('GenerateGraphData', error);
      toast.error('Error generating graph data');
      return [];
    }
  }, [reservations, selectedAgencyId, graphFilterOrigin, graphFilterDestination, graphFilterPeriod, graphType])();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress aria-label="Loading" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            Error: {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  if (agencies.length === 0) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            No agencies found
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please contact support to associate agencies with your account
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            sx={{ mt: 2 }}
          >
            Return to Dashboard
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Reservation Analytics
        </Typography>
        <Card>
          <CardHeader
            title={
              <Typography variant="h6">
                Reservation Analytics - {agencies.find((a) => a.id === selectedAgencyId)?.name || 'Unknown Agency'}
              </Typography>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select
                  value={selectedAgencyId}
                  onChange={(e) => setSelectedAgencyId(e.target.value)}
                  sx={{ minWidth: 150 }}
                >
                  {agencies.map((agency) => (
                    <MenuItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => openMessageForm()}
                  startIcon={<MessageIcon />}
                  disabled={!roleMatrix[userRole]?.canSendMessages}
                >
                  Message Agency
                </Button>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error: {error}
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="Graph Type"
                  value={graphType}
                  onChange={(e) => setGraphType(e.target.value)}
                  variant="outlined"
                  helperText="Select graph type"
                  InputProps={{ startAdornment: <BarChartIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                >
                  <MenuItem value="line">Line</MenuItem>
                  <MenuItem value="bar">Bar</MenuItem>
                  <MenuItem value="pie">Pie</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="Period"
                  value={graphFilterPeriod}
                  onChange={(e) => setGraphFilterPeriod(e.target.value)}
                  variant="outlined"
                  helperText="Select time period"
                  InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="last7days">Last 7 Days</MenuItem>
                  <MenuItem value="lastmonth">Last Month</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Origin"
                  value={graphFilterOrigin}
                  onChange={(e) => setGraphFilterOrigin(e.target.value)}
                  placeholder="Filter by origin"
                  variant="outlined"
                  helperText="Filter by origin"
                  InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Destination"
                  value={graphFilterDestination}
                  onChange={(e) => setGraphFilterDestination(e.target.value)}
                  placeholder="Filter by destination"
                  variant="outlined"
                  helperText="Filter by destination"
                  InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
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
                        formatter={(value, name) => [
                          name === 'passengerCount' ? `${value} Passengers` : `$${value}`,
                          name === 'passengerCount' ? 'Passenger Count' : 'Total Price',
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="passengerCount" stroke="#0088FE" name="Passenger Count" />
                      <Line type="monotone" dataKey="totalPrice" stroke="#00C49F" name="Total Price" />
                    </LineChart>
                  )}
                  {graphType === 'bar' && (
                    <BarChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#213547" />
                      <YAxis stroke="#213547" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', color: '#213547', borderRadius: '4px' }}
                        formatter={(value, name) => [
                          name === 'passengerCount' ? `${value} Passengers` : `$${value}`,
                          name === 'passengerCount' ? 'Passenger Count' : 'Total Price',
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="passengerCount" fill="#0088FE" name="Passenger Count" />
                      <Bar dataKey="totalPrice" fill="#00C49F" name="Total Price" />
                    </BarChart>
                  )}
                  {graphType === 'pie' && (
                    <PieChart>
                      <Pie
                        data={graphData}
                        dataKey="passengerCount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={150}
                        label={({ name, passengerCount }) => `${name}: ${passengerCount}`}
                      >
                        {graphData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', color: '#213547', borderRadius: '4px' }}
                        formatter={(value, name) => [`${value} Passengers`, name]}
                      />
                      <Legend />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                No data available for the selected filters
              </Typography>
            )}
          </CardContent>
        </Card>
        {showMessageForm && renderMessageForm()}
      </Box>
    </ThemeProvider>
  );
};

export default ReservationGraph;