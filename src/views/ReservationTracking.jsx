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
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Check as CheckIcon, Close as CloseIcon, PictureAsPdf as PictureAsPdfIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Enterprise logo (base64 placeholder)
const ENTERPRISE_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

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
  },
};

const ReservationTracking = () => {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
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
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const [exportOrigin, setExportOrigin] = useState('');
  const [exportDestination, setExportDestination] = useState('');
  const [exportPeriod, setExportPeriod] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
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

        if (!roleMatrix[userRow.role]?.canViewReservations) {
          throw new Error('You do not have permission to view reservations');
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
            .select('id, name')
            .eq('user_id', session.user.id)
            .single();
          if (companyError) {
            if (companyError.code === 'PGRST116') {
              throw new Error('No company associated with this user');
            }
            throw new Error(`Failed to fetch company: ${companyError.message}`);
          }
          companyIdToUse = companyData.id;
          setCompanyId(companyIdToUse);
        } else {
          setCompanyId(companyIdToUse);
        }

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

        let busQuery = supabase.from('buses').select('id, bus_type, license_plate').eq('company_id', companyIdToUse);
        if (!roleMatrix[userRow.role]?.canCreateReservation && userAgenciesData.length > 0) {
          busQuery = busQuery.in('agency_id', userAgenciesData.map((ua) => ua.agency_id));
        }
        const { data: busesData, error: busesError } = await withTimeout(busQuery);
        if (busesError) throw new Error(`Failed to fetch buses: ${busesError.message}`);
        setBuses(busesData || []);

        let routeQuery = supabase.from('routes').select('id, company_id, origin, destination, trip_date, departure_time, arrival_time, price, bus_id, departure_agency_id, arrival_agency_id').eq('company_id', companyIdToUse);
        if (!roleMatrix[userRow.role]?.canCreateReservation && userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
          );
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(`Failed to fetch routes: ${routesError.message}`);
        setRoutes(routesData || []);

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
          busCount: busesData.length,
          routeCount: routesData.length,
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

        let reservationQuery = supabase
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
              company_id,
              buses!inner(id, bus_type, license_plate),
              departure_agency:agencies!routes_departure_agency_id_fkey(id, name, address),
              arrival_agency:agencies!routes_arrival_agency_id_fkey(id, name, address)
            ),
            agencies!inner(id, name, address),
            transport_companies!inner(id, name, contact_phone)
          `)
          .eq('company_id', companyId)
          .eq('agency_id', selectedAgencyId);

        if (selectedRouteId) {
          reservationQuery = reservationQuery.eq('route_id', selectedRouteId);
        }

        const { data: reservationData, error: reservationError } = await withTimeout(reservationQuery);
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
              reservation_date_time,
              is_online,
              created_at,
              passenger_id
            `)
            .eq('route_id', reservation.route_id)
            .eq('company_id', reservation.company_id)
            .eq('agency_id', reservation.agency_id)
            .order('created_at', { ascending: true });

          if (assignmentError) {
            logError('PassengerAssignmentsFetch', assignmentError, { reservationId: reservation.id });
            throw new Error(`Failed to fetch passenger assignments for reservation ${reservation.id}: ${assignmentError.message}`);
          }

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('government_id_front, government_id_back')
            .eq('id', reservation.user_id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            logError('ProfileFetch', profileError, { reservationId: reservation.id });
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

          const passengers = (assignmentData || []).map((assignment, index) => ({
            passengerIndex: (index + 1).toString(),
            fullName: assignment.name || 'Unknown',
            phoneNumber: assignment.phone_number || 'Unknown',
            seatNumber: Array.isArray(assignment.seat_number) && assignment.seat_number.length > 0 ? assignment.seat_number.join(', ') : 'None',
            passengerNumber: assignment.passenger_number?.toString() || 'Unknown',
            paymentStatus: assignment.payment_status || 'Unknown',
            identityCardVerified: profileData?.government_id_front || profileData?.government_id_back ? 'Confirmed' : 'No',
            reservationDateTime: assignment.reservation_date_time ? new Date(assignment.reservation_date_time).toLocaleString() : 'Unknown',
            isOnline: assignment.is_online ? 'Yes' : 'No',
            passengerAssignmentCreatedAt: assignment.created_at ? new Date(assignment.created_at).toLocaleString() : 'Unknown',
          }));

          if (passengers.length === 0) {
            passengers.push({
              passengerIndex: '1',
              fullName: 'Unknown',
              phoneNumber: 'Unknown',
              seatNumber: 'None',
              passengerNumber: 'Unknown',
              paymentStatus: reservation.payment_status || 'Unknown',
              identityCardVerified: profileData?.government_id_front || profileData?.government_id_back ? 'Confirmed' : 'No',
              reservationDateTime: reservation.reservation_date_time ? new Date(reservation.reservation_date_time).toLocaleString() : 'Unknown',
              isOnline: reservation.is_online ? 'Yes' : 'No',
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
            arrivalAgency: reservation.routes.arrival_agency?.name || 'Unknown',
            arrivalAgencyId: reservation.routes.arrival_agency_id || 'Unknown',
            companyId: reservation.company_id,
            companyName: reservation.transport_companies.name || 'Unknown',
            companyContact: reservation.transport_companies.contact_phone || 'Unknown',
            origin: reservation.routes.origin || 'Unknown',
            destination: reservation.routes.destination || 'Unknown',
            departureTime: departureDate.toLocaleString(),
            arrivalTime: arrivalDate.toLocaleString(),
            tripDate: reservation.routes.trip_date || 'Unknown',
            departureAgencyId: reservation.routes.departure_agency_id || 'Unknown',
            busId: reservation.routes.bus_id || 'Unknown',
            busPlate: reservation.routes.buses?.license_plate || 'Unknown',
            busType: reservation.routes.buses?.bus_type || 'Unknown',
            boardingLocation: reservation.routes.departure_agency?.address || 'N/A',
            droppingLocation: reservation.routes.arrival_agency?.address || 'N/A',
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
          routeId: selectedRouteId || 'All',
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
  }, [companyId, userRole, selectedAgencyId, selectedRouteId]);

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
        toast.error('You do not have permission to create reservations');
        return;
      }

      try {
        if (!newBooking.fullName.trim()) {
          throw new Error('Full name is required');
        }
        if (!validatePhoneNumber(newBooking.phoneNumber)) {
          throw new Error('Invalid phone number format (+2376xxxxxxxx)');
        }
        if (!newBooking.seatNumber.match(/^[1-9][0-9]?$/)) {
          throw new Error('Seat number must be between 1 and 99');
        }
        if (!newBooking.departureDate || !newBooking.departureTime) {
          throw new Error('Departure date and time are required');
        }
        if (!newBooking.reservationDate || !newBooking.reservationTime) {
          throw new Error('Reservation date and time are required');
        }

        const departureDateTime = new Date(`${newBooking.departureDate}T${newBooking.departureTime}`);
        const reservationDateTime = new Date(`${newBooking.reservationDate}T${newBooking.reservationTime}`);
        const now = new Date();

        if (departureDateTime <= now) {
          throw new Error('Cannot book a trip in the past');
        }
        if (reservationDateTime >= departureDateTime) {
          throw new Error('Reservation must be before departure');
        }
        if (reservationDateTime > now) {
          throw new Error('Reservation cannot be in the future');
        }

        const tripExists = routes.find(
          (route) =>
            route.origin === newBooking.origin &&
            route.destination === newBooking.destination &&
            route.trip_date === newBooking.departureDate &&
            route.departure_time === newBooking.departureTime
        );
        if (!tripExists) {
          throw new Error(`No trip exists for ${newBooking.origin} to ${newBooking.destination} on ${newBooking.departureDate} at ${newBooking.departureTime}`);
        }

        const existingAssignments = reservations
          .filter(
            (res) =>
              res.origin === newBooking.origin &&
              res.destination === newBooking.destination &&
              res.departureTime === `${newBooking.departureDate} ${newBooking.departureTime}`
          )
          .flatMap((res) => res.passengers.map((p) => p.seatNumber))
          .flat();
        if (existingAssignments.includes(parseInt(newBooking.seatNumber))) {
          throw new Error('Seat already taken');
        }

        const totalSeatsBooked = reservations
          .filter(
            (res) =>
              res.origin === newBooking.origin &&
              res.destination === newBooking.destination &&
              res.departureTime === `${newBooking.departureDate} ${newBooking.departureTime}`
          )
          .reduce((sum, res) => sum + res.passengerCount, 0);
        if (totalSeatsBooked >= MAX_SEATS_PER_TRIP) {
          throw new Error('No seats available for this trip');
        }

        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .insert({
            route_id: tripExists.id,
            user_id: (await supabase.auth.getUser()).data.user.id,
            company_id: companyId,
            agency_id: selectedAgencyId,
            passenger_count: 1,
            total_price: tripExists.price || 0,
            reservation_status: 'Confirmed',
            payment_status: newBooking.paymentStatus,
            reservation_date_time: reservationDateTime.toISOString(),
            is_online: newBooking.isOnline,
          })
          .select('id')
          .single();
        if (reservationError) throw new Error(`Failed to insert reservation: ${reservationError.message}`);

        const { data: passengerData, error: passengerError } = await supabase
          .from('passenger_assignments')
          .insert({
            route_id: tripExists.id,
            passenger_id: (await supabase.auth.getUser()).data.user.id,
            company_id: companyId,
            agency_id: selectedAgencyId,
            name: newBooking.fullName.trim(),
            phone_number: newBooking.phoneNumber,
            seat_number: [parseInt(newBooking.seatNumber)],
            passenger_number: 1,
            payment_status: newBooking.paymentStatus,
            reservation_date_time: reservationDateTime.toISOString(),
            is_online: newBooking.isOnline,
          })
          .select()
          .single();
        if (passengerError) throw new Error(`Failed to insert passenger assignment: ${passengerError.message}`);

        const { data: newReservationData, error: fetchError } = await supabase
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
              company_id,
              buses!inner(id, bus_type, license_plate),
              departure_agency:agencies!routes_departure_agency_id_fkey(id, name, address),
              arrival_agency:agencies!routes_arrival_agency_id_fkey(id, name, address)
            ),
            agencies!inner(id, name, address),
            transport_companies!inner(id, name, contact_phone)
          `)
          .eq('id', reservationData.id)
          .single();
        if (fetchError) throw new Error(`Failed to fetch new reservation: ${fetchError.message}`);

        const newReservation = {
          id: newReservationData.id,
          routeId: newReservationData.route_id,
          userId: newReservationData.user_id,
          agency: newReservationData.agencies.name || 'Unknown',
          agencyId: newReservationData.agencies.id || 'Unknown',
          agencyAddress: newReservationData.agencies.address || 'Unknown',
          arrivalAgency: newReservationData.routes.arrival_agency?.name || 'Unknown',
          arrivalAgencyId: newReservationData.routes.arrival_agency_id || 'Unknown',
          companyId: newReservationData.company_id,
          companyName: newReservationData.transport_companies.name || 'Unknown',
          companyContact: newReservationData.transport_companies.contact_phone || 'Unknown',
          origin: newReservationData.routes.origin || 'Unknown',
          destination: newReservationData.routes.destination || 'Unknown',
          departureTime: new Date(`${newReservationData.routes.trip_date}T${newReservationData.routes.departure_time}Z`).toLocaleString(),
          arrivalTime: (() => {
            const [depHours, depMinutes] = newReservationData.routes.departure_time.split(':').map(Number);
            const [arrHours, arrMinutes] = newReservationData.routes.arrival_time.split(':').map(Number);
            const baseDate = new Date(newReservationData.routes.trip_date);
            if (arrHours < depHours || (arrHours === depHours && arrMinutes < depMinutes)) {
              baseDate.setDate(baseDate.getDate() + 1);
            }
            return new Date(`${baseDate.toISOString().split('T')[0]}T${newReservationData.routes.arrival_time}Z`).toLocaleString();
          })(),
          tripDate: newReservationData.routes.trip_date || 'Unknown',
          departureAgencyId: newReservationData.routes.departure_agency_id || 'Unknown',
          busId: newReservationData.routes.bus_id || 'Unknown',
          busPlate: newReservationData.routes.buses?.license_plate || 'Unknown',
          busType: newReservationData.routes.buses?.bus_type || 'Unknown',
          boardingLocation: newReservationData.routes.departure_agency?.address || 'N/A',
          droppingLocation: newReservationData.routes.arrival_agency?.address || 'N/A',
          passengerCount: newReservationData.passenger_count || 0,
          totalPrice: newReservationData.total_price || 0,
          reservationStatus: newReservationData.reservation_status || 'Unknown',
          paymentStatus: newReservationData.payment_status || 'Unknown',
          isOnline: newReservationData.is_online ? 'Yes' : 'No',
          reservationDateTime: newReservationData.reservation_date_time ? new Date(newReservationData.reservation_date_time).toLocaleString() : 'Unknown',
          createdAt: newReservationData.created_at ? new Date(newReservationData.created_at).toLocaleString() : 'Unknown',
          updatedAt: newReservationData.updated_at ? new Date(newReservationData.updated_at).toLocaleString() : 'Unknown',
          passengers: [{
            passengerIndex: '1',
            fullName: newBooking.fullName.trim(),
            phoneNumber: newBooking.phoneNumber,
            seatNumber: newBooking.seatNumber,
            passengerNumber: '1',
            paymentStatus: newBooking.paymentStatus,
            identityCardVerified: newBooking.identityCardVerified ? 'Confirmed' : 'No',
            reservationDateTime: reservationDateTime.toLocaleString(),
            isOnline: newBooking.isOnline ? 'Yes' : 'No',
            passengerAssignmentCreatedAt: new Date().toLocaleString(),
          }],
        };

        setReservations((prev) => [...prev, newReservation]);
        toast.success('Booking added successfully');
      } catch (error) {
        logError('AddBooking', error);
        toast.error(
          error.message.includes('infinite recursion') || error.message.includes('timeout')
            ? `Database error: ${error.code || 'N/A'}`
            : error.message
        );
      } finally {
        setShowAddBookingForm(false);
      }
    },
    [newBooking, routes, selectedAgencyId, reservations, validatePhoneNumber, companyId, buses, userRole]
  );

  const exportToPDF = useCallback(() => {
    if (!roleMatrix[userRole]?.canGenerateReports) {
      toast.error('You do not have permission to export reports');
      return;
    }
    try {
      if (!exportOrigin || !exportDestination || !exportPeriod) {
        toast.error('Origin, destination, and period are required for export');
        return;
      }

      const doc = new jsPDF();
      const companyName = reservations[0]?.companyName || 'Unknown Company';
      const currentDate = new Date().toLocaleString();

      // Header
      doc.addImage(ENTERPRISE_LOGO, 'PNG', 14, 10, 30, 10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Passenger Verification Report', 14, 25);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Route: ${exportOrigin} to ${exportDestination}`, 14, 32);
      doc.text(`Trip Date: ${exportPeriod}`, 14, 38);
      doc.text(`Generated: ${currentDate}`, 14, 44);
      doc.text(`Company: ${companyName}`, 14, 50);

      // Summary
      const selectedReservations = reservations.filter(
        (reservation) =>
          reservation.origin === exportOrigin &&
          reservation.destination === exportDestination &&
          reservation.tripDate.startsWith(exportPeriod)
      );
      const totalReservations = selectedReservations.length;
      const totalPassengers = selectedReservations.reduce((sum, res) => sum + res.passengerCount, 0);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text('Summary', 14, 60);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Total Reservations: ${totalReservations}`, 14, 66);
      doc.text(`Total Passengers: ${totalPassengers}`, 14, 72);

      // Passenger Table
      const reservationTableData = selectedReservations.flatMap((reservation) =>
        reservation.passengers.map((passenger) => [
          passenger.passengerIndex,
          passenger.fullName,
          reservation.agency,
          reservation.arrivalAgency,
          reservation.origin,
          reservation.destination,
          reservation.departureTime,
          reservation.busType,
          reservation.totalPrice,
          passenger.phoneNumber,
          passenger.seatNumber,
          passenger.paymentStatus,
          passenger.identityCardVerified,
          passenger.reservationDateTime,
          passenger.isOnline,
        ])
      );

      doc.autoTable({
        head: [['#', 'Passenger Name', 'Departure Agency', 'Arrival Agency', 'Origin', 'Destination', 'Departure', 'Bus Type', 'Price', 'Phone Number', 'Seat Number', 'Payment Status', 'Government ID', 'Reservation Date', 'Booking Type']],
        body: reservationTableData,
        startY: 80,
        styles: {
          font: 'Helvetica',
          fontSize: 8,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          cellPadding: 2,
        },
        headStyles: {
          fontStyle: 'bold',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          fillColor: null,
        },
        bodyStyles: {
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          fillColor: null,
        },
        columnStyles: {
          0: { cellWidth: 8 }, // #
          1: { cellWidth: 25 }, // Passenger Name
          2: { cellWidth: 20 }, // Departure Agency
          3: { cellWidth: 20 }, // Arrival Agency
          4: { cellWidth: 20 }, // Origin
          5: { cellWidth: 20 }, // Destination
          6: { cellWidth: 20 }, // Departure
          7: { cellWidth: 15 }, // Bus Type
          8: { cellWidth: 15 }, // Price
          9: { cellWidth: 20 }, // Phone Number
          10: { cellWidth: 15 }, // Seat Number
          11: { cellWidth: 15 }, // Payment Status
          12: { cellWidth: 15 }, // Government ID
          13: { cellWidth: 20 }, // Reservation Date
          14: { cellWidth: 15 }, // Booking Type
        },
        margin: { top: 80, left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('Helvetica', 'normal');
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
          doc.text(companyName, doc.internal.pageSize.width - data.settings.margin.right - doc.getTextWidth(companyName), doc.internal.pageSize.height - 10);
        },
      });

      doc.save(`passenger_verification_${exportOrigin}_${exportDestination}_${exportPeriod}_${new Date().toISOString()}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      logError('ExportToPDF', error);
      toast.error('Failed to export PDF');
    }
  }, [reservations, exportOrigin, exportDestination, exportPeriod, userRole]);

  const renderBookingForm = () => (
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
      onClick={() => setShowAddBookingForm(false)}
    >
      <Card
        sx={{ width: '80%', maxWidth: 600, p: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <AddIcon sx={{ mr: 1 }} />
              Add New Booking
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <form onSubmit={addBooking}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Origin"
                  value={newBooking.origin}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, origin: e.target.value, departureDate: '', departureTime: '' })
                  }
                  required
                  helperText="Select origin"
                  variant="outlined"
                >
                  <MenuItem value="" disabled>Select Origin</MenuItem>
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
                  label="Destination"
                  value={newBooking.destination}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, destination: e.target.value, departureDate: '', departureTime: '' })
                  }
                  required
                  helperText="Select destination"
                  variant="outlined"
                >
                  <MenuItem value="" disabled>Select Destination</MenuItem>
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
                  label="Departure Date"
                  type="date"
                  value={newBooking.departureDate}
                  onChange={(e) => setNewBooking({ ...newBooking, departureDate: e.target.value, departureTime: '' })}
                  inputProps={{ min: today }}
                  required
                  helperText="Select departure date"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Departure Time"
                  value={newBooking.departureTime}
                  onChange={(e) => setNewBooking({ ...newBooking, departureTime: e.target.value })}
                  required
                  disabled={!newBooking.departureDate || timeSlots.length === 0}
                  helperText={
                    newBooking.departureDate && timeSlots.length === 0
                      ? 'No time slots available'
                      : 'Select departure time'
                  }
                  variant="outlined"
                  error={newBooking.departureDate && timeSlots.length === 0}
                >
                  <MenuItem value="" disabled>Select Time</MenuItem>
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
                  label="Full Name"
                  value={newBooking.fullName}
                  onChange={(e) => setNewBooking({ ...newBooking, fullName: e.target.value })}
                  placeholder="Enter full name"
                  required
                  helperText="Enter passenger's full name"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={newBooking.phoneNumber}
                  onChange={(e) => setNewBooking({ ...newBooking, phoneNumber: e.target.value })}
                  placeholder="+2376xxxxxxxx"
                  required
                  helperText="Enter phone number (+2376xxxxxxxx)"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Seat Number"
                  value={newBooking.seatNumber}
                  onChange={(e) => setNewBooking({ ...newBooking, seatNumber: e.target.value })}
                  placeholder="Enter seat number (1-99)"
                  required
                  helperText="Enter seat number"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Payment Status"
                  value={newBooking.paymentStatus}
                  onChange={(e) => setNewBooking({ ...newBooking, paymentStatus: e.target.value })}
                  required
                  helperText="Select payment status"
                  variant="outlined"
                >
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
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
                  label="Government ID Verified"
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
                  label="Online Booking"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reservation Date"
                  type="date"
                  value={newBooking.reservationDate}
                  onChange={(e) => setNewBooking({ ...newBooking, reservationDate: e.target.value })}
                  inputProps={{ max: today }}
                  required
                  helperText="Select reservation date"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Reservation Time"
                  value={newBooking.reservationTime}
                  onChange={(e) => setNewBooking({ ...newBooking, reservationTime: e.target.value })}
                  required
                  helperText="Select reservation time"
                  variant="outlined"
                >
                  <MenuItem value="" disabled>Select Time</MenuItem>
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
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!roleMatrix[userRole]?.canCreateReservation}
                  startIcon={<CheckIcon />}
                >
                  Add
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowAddBookingForm(false)}
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );

  const uniqueOrigins = [...new Set(routes.map((route) => route.origin).filter(Boolean))];
  const uniqueDestinations = [...new Set(routes.map((route) => route.destination).filter(Boolean))];
  const uniqueRoutes = routes
    .filter((route) => route.departure_agency_id === selectedAgencyId || route.arrival_agency_id === selectedAgencyId)
    .map((route) => ({
      id: route.id,
      name: `${route.origin} to ${route.destination}`,
    }))
    .filter((route, index, self) => 
      index === self.findIndex((r) => r.name === route.name)
    );
  const uniquePeriods = [...new Set(reservations.map((reservation) => reservation.tripDate).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));

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
          Reservation Tracking
        </Typography>
        <Card>
          <CardHeader
            title={
              <Typography variant="h6">
                Reservation Tracking - {agencies.find((a) => a.id === selectedAgencyId)?.name || 'Unknown Agency'}
              </Typography>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select
                  value={selectedAgencyId}
                  onChange={(e) => {
                    setSelectedAgencyId(e.target.value);
                    setSelectedRouteId('');
                  }}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="" disabled>Select Agency</MenuItem>
                  {agencies.map((agency) => (
                    <MenuItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="" disabled>Select Route</MenuItem>
                  {uniqueRoutes.map((route) => (
                    <MenuItem key={route.id} value={route.id}>
                      {route.name}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setShowAddBookingForm(true)}
                  startIcon={<AddIcon />}
                  disabled={!roleMatrix[userRole]?.canCreateReservation}
                >
                  Add Booking
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
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Export Origin"
                  value={exportOrigin}
                  onChange={(e) => setExportOrigin(e.target.value)}
                  variant="outlined"
                  helperText="Select origin for export"
                  InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                >
                  <MenuItem value="" disabled>Select Origin</MenuItem>
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
                  label="Export Destination"
                  value={exportDestination}
                  onChange={(e) => setExportDestination(e.target.value)}
                  variant="outlined"
                  helperText="Select destination for export"
                  InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                >
                  <MenuItem value="" disabled>Select Destination</MenuItem>
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
                  label="Export Period"
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  variant="outlined"
                  helperText="Select period for export"
                  InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                >
                  <MenuItem value="" disabled>Select Period</MenuItem>
                  {uniquePeriods.map((period) => (
                    <MenuItem key={period} value={period}>
                      {period}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={exportToPDF}
                  startIcon={<PictureAsPdfIcon />}
                  disabled={!roleMatrix[userRole]?.canGenerateReports}
                >
                  Export to PDF
                </Button>
              </Grid>
            </Grid>
            <TableContainer component={Paper}>
              <Table aria-label="Reservation Table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                    <TableCell sx={{ color: 'white' }}>Departure Agency</TableCell>
                    <TableCell sx={{ color: 'white' }}>Arrival Agency</TableCell>
                    <TableCell sx={{ color: 'white' }}>Origin</TableCell>
                    <TableCell sx={{ color: 'white' }}>Destination</TableCell>
                    <TableCell sx={{ color: 'white' }}>Departure</TableCell>
                    <TableCell sx={{ color: 'white' }}>Arrival</TableCell>
                    <TableCell sx={{ color: 'white' }}>Bus Type</TableCell>
                    <TableCell sx={{ color: 'white' }}>Price</TableCell>
                    <TableCell sx={{ color: 'white' }}>Passenger Count</TableCell>
                    <TableCell sx={{ color: 'white' }}>Reservation Status</TableCell>
                    <TableCell sx={{ color: 'white' }}>Payment Status</TableCell>
                    <TableCell sx={{ color: 'white' }}>Online Booking</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
                        No reservations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((reservation) => (
                      <React.Fragment key={reservation.id}>
                        <TableRow>
                          <TableCell>{reservation.agency}</TableCell>
                          <TableCell>{reservation.arrivalAgency}</TableCell>
                          <TableCell>{reservation.origin}</TableCell>
                          <TableCell>{reservation.destination}</TableCell>
                          <TableCell>{reservation.departureTime}</TableCell>
                          <TableCell>{reservation.arrivalTime}</TableCell>
                          <TableCell>{reservation.busType}</TableCell>
                          <TableCell>{reservation.totalPrice}</TableCell>
                          <TableCell>{reservation.passengerCount}</TableCell>
                          <TableCell>{reservation.reservationStatus}</TableCell>
                          <TableCell>{reservation.paymentStatus}</TableCell>
                          <TableCell>{reservation.isOnline}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={12} sx={{ backgroundColor: 'grey.100' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>#</TableCell>
                                  <TableCell>Full Name</TableCell>
                                  <TableCell>Phone Number</TableCell>
                                  <TableCell>Seat Number</TableCell>
                                  <TableCell>Passenger Number</TableCell>
                                  <TableCell>Payment Status</TableCell>
                                  <TableCell>Government ID</TableCell>
                                  <TableCell>Reservation Date</TableCell>
                                  <TableCell>Online Booking</TableCell>
                                  <TableCell>Passenger Assignment Created</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {reservation.passengers.map((passenger) => (
                                  <TableRow key={passenger.passengerIndex}>
                                    <TableCell>{passenger.passengerIndex}</TableCell>
                                    <TableCell>{passenger.fullName}</TableCell>
                                    <TableCell>{passenger.phoneNumber}</TableCell>
                                    <TableCell>{passenger.seatNumber}</TableCell>
                                    <TableCell>{passenger.passengerNumber}</TableCell>
                                    <TableCell>{passenger.paymentStatus}</TableCell>
                                    <TableCell>{passenger.identityCardVerified}</TableCell>
                                    <TableCell>{passenger.reservationDateTime}</TableCell>
                                    <TableCell>{passenger.isOnline}</TableCell>
                                    <TableCell>{passenger.passengerAssignmentCreatedAt}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        {showAddBookingForm && renderBookingForm()}
      </Box>
    </ThemeProvider>
  );
};

export default ReservationTracking;