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
  Radio,
  RadioGroup,
  FormControlLabel,
  Skeleton,
} from '@mui/material';
import { PictureAsPdf as PictureAsPdfIcon, FilterList as FilterListIcon } from '@mui/icons-material';
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

const Reports = () => {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [reportType, setReportType] = useState('weekly');
  const [viewType, setViewType] = useState('reservations');

  // Calculate date ranges for reports
  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ranges = {
      weekly: {
        start: new Date(today),
        end: new Date(today),
      },
      monthly: {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      },
      sixMonthly: {
        start: new Date(today.getFullYear(), today.getMonth() - 6, 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      },
      yearly: {
        start: new Date(today.getFullYear(), 0, 1),
        end: new Date(today.getFullYear(), 11, 31),
      },
    };

    ranges.weekly.start.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    ranges.weekly.end.setDate(ranges.weekly.start.getDate() + 6);

    return ranges[reportType];
  }, [reportType]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalReservations = reservations.length;
    const totalPassengers = reservations.reduce((sum, res) => sum + res.passengerCount, 0);
    const totalRevenue = reservations.reduce((sum, res) => sum + res.totalPrice, 0);
    const totalRoutes = routes.length;

    // Reservation metrics
    const reservationsByStatus = reservations.reduce(
      (acc, res) => {
        acc[res.reservationStatus] = (acc[res.reservationStatus] || 0) + 1;
        return acc;
      },
      { Pending: 0, Confirmed: 0, Cancelled: 0 }
    );
    const revenueByPaymentStatus = reservations.reduce(
      (acc, res) => {
        acc[res.paymentStatus] = (acc[res.paymentStatus] || 0) + res.totalPrice;
        return acc;
      },
      { Paid: 0, Pending: 0, Failed: 0 }
    );
    const averagePrice = totalReservations > 0 ? (totalRevenue / totalReservations).toFixed(2) : 0;
    const onlineBookings = reservations.filter((res) => res.isOnline === 'Yes').length;
    const onlineBookingPercentage = totalReservations > 0 ? ((onlineBookings / totalReservations) * 100).toFixed(2) : 0;

    // Route metrics
    const routesByBusType = routes.reduce(
      (acc, route) => {
        acc[route.busType] = (acc[route.busType] || 0) + 1;
        return acc;
      },
      { VIP: 0, VVIP: 0, Standard: 0, Unknown: 0 }
    );
    const averageRoutePrice = totalRoutes > 0 ? (routes.reduce((sum, route) => sum + route.price, 0) / totalRoutes).toFixed(2) : 0;
    const originFrequency = routes.reduce((acc, route) => {
      acc[route.origin] = (acc[route.origin] || 0) + 1;
      return acc;
    }, {});
    const destinationFrequency = routes.reduce((acc, route) => {
      acc[route.destination] = (acc[route.destination] || 0) + 1;
      return acc;
    }, {});
    const mostFrequentOrigin = Object.entries(originFrequency).reduce(
      (max, [origin, count]) => (count > max.count ? { origin, count } : max),
      { origin: 'None', count: 0 }
    );
    const mostFrequentDestination = Object.entries(destinationFrequency).reduce(
      (max, [destination, count]) => (count > max.count ? { destination, count } : max),
      { destination: 'None', count: 0 }
    );

    return {
      totalReservations,
      totalPassengers,
      totalRevenue: totalRevenue.toFixed(2),
      totalRoutes,
      reservationsByStatus,
      revenueByPaymentStatus,
      averagePrice,
      onlineBookingPercentage,
      routesByBusType,
      averageRoutePrice,
      mostFrequentOrigin,
      mostFrequentDestination,
    };
  }, [reservations, routes]);

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

        if (!roleMatrix[userRow.role]?.canGenerateReports) {
          throw new Error('You do not have permission to generate reports');
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

  // Fetch reservations and routes
  useEffect(() => {
    if (!companyId || !userRole || !selectedAgencyId) return;

    const fetchData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);

        const session = (await supabase.auth.getSession()).data.session;
        const userId = session?.user?.id;

        const { start, end } = getDateRange();
        const startISO = start.toISOString();
        const endISO = end.toISOString();

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
          .eq('agency_id', selectedAgencyId)
          .gte('reservation_date_time', startISO)
          .lte('reservation_date_time', endISO);

        if (userAgencies.length > 0) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          reservationQuery = reservationQuery.in('agency_id', agencyIds);
        }

        const { data: reservationData, error: reservationError } = await withTimeout(reservationQuery);
        if (reservationError) {
          throw new Error(`Failed to fetch reservations: ${reservationError.message}`);
        }

        let routeQuery = supabase
          .from('routes')
          .select(`
            id,
            company_id,
            origin,
            destination,
            trip_date,
            departure_time,
            arrival_time,
            price,
            bus_id,
            departure_agency_id,
            arrival_agency_id,
            buses!inner(id, bus_type, license_plate),
            departure_agency:agencies!routes_departure_agency_id_fkey(id, name, address),
            arrival_agency:agencies!routes_arrival_agency_id_fkey(id, name, address)
          `)
          .eq('company_id', companyId)
          .gte('trip_date', start.toISOString().split('T')[0])
          .lte('trip_date', end.toISOString().split('T')[0]);

        if (userAgencies.length > 0) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
          );
        }

        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) {
          throw new Error(`Failed to fetch routes: ${routesError.message}`);
        }

        const reservationPromises = (reservationData || []).map(async (reservation) => {
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

        const formattedReservations = (await Promise.all(reservationPromises)).filter((r) => r !== null);
        setReservations(formattedReservations);

        const formattedRoutes = (routesData || []).map((route) => ({
          id: route.id,
          origin: route.origin || 'Unknown',
          destination: route.destination || 'Unknown',
          tripDate: route.trip_date || 'Unknown',
          departureTime: new Date(`${route.trip_date}T${route.departure_time}Z`).toLocaleString(),
          arrivalTime: (() => {
            const [depHours, depMinutes] = route.departure_time.split(':').map(Number);
            const [arrHours, arrMinutes] = route.arrival_time.split(':').map(Number);
            const baseDate = new Date(route.trip_date);
            if (arrHours < depHours || (arrHours === depHours && arrMinutes < depMinutes)) {
              baseDate.setDate(baseDate.getDate() + 1);
            }
            return new Date(`${baseDate.toISOString().split('T')[0]}T${route.arrival_time}Z`).toLocaleString();
          })(),
          busType: route.buses?.bus_type || 'Unknown',
          price: route.price || 0,
          departureAgency: route.departure_agency?.name || 'Unknown',
          arrivalAgency: route.arrival_agency?.name || 'Unknown',
        }));

        setRoutes(formattedRoutes);

        logSuccess('DataFetch', 'Reservations and routes fetched successfully', {
          userId,
          reservationCount: formattedReservations.length,
          routeCount: formattedRoutes.length,
          agencyId: selectedAgencyId,
        });
      } catch (error) {
        logError('DataFetch', error, { userId: session?.user?.id });
        setError(
          error.message.includes('infinite recursion') || error.message.includes('timeout')
            ? `Database error: ${error.code || 'N/A'}`
            : `Failed to fetch data: ${error.message}`
        );
      } finally {
        setLoading(false);
        logSuccess('DataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchData();
  }, [companyId, userRole, selectedAgencyId, reportType, userAgencies, getDateRange]);

  const exportToPDF = useCallback(() => {
    if (!roleMatrix[userRole]?.canGenerateReports) {
      toast.error('You do not have permission to export reports');
      return;
    }
    try {
      const doc = new jsPDF();
      const companyName = reservations[0]?.companyName || 'Unknown Company';
      const currentDate = new Date().toLocaleString();
      const { start, end } = getDateRange();
      const periodLabel = reportType.charAt(0).toUpperCase() + reportType.slice(1);

      // Header
      doc.addImage(ENTERPRISE_LOGO, 'PNG', 14, 10, 30, 10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${periodLabel} ${viewType === 'reservations' ? 'Reservations' : 'Routes'} Report`, 14, 25);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 14, 32);
      doc.text(`Generated: ${currentDate}`, 14, 38);
      doc.text(`Company: ${companyName}`, 14, 44);
      doc.text(`Agency: ${agencies.find((a) => a.id === selectedAgencyId)?.name || 'Unknown Agency'}`, 14, 50);

      // Summary
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text('Summary', 14, 60);
      doc.setFont('Helvetica', 'normal');
      let yPos = 66;
      if (viewType === 'reservations') {
        doc.text(`Total Reservations: ${metrics.totalReservations}`, 14, yPos);
        doc.text(`Total Passengers: ${metrics.totalPassengers}`, 14, yPos + 6);
        doc.text(`Total Revenue: ${metrics.totalRevenue}`, 14, yPos + 12);
        doc.text(`Average Price: ${metrics.averagePrice}`, 14, yPos + 18);
        doc.text(`Online Booking: ${metrics.onlineBookingPercentage}%`, 14, yPos + 24);
        doc.text(`Reservations by Status:`, 14, yPos + 30);
        doc.text(`  Pending: ${metrics.reservationsByStatus.Pending}`, 14, yPos + 36);
        doc.text(`  Confirmed: ${metrics.reservationsByStatus.Confirmed}`, 14, yPos + 42);
        doc.text(`  Cancelled: ${metrics.reservationsByStatus.Cancelled}`, 14, yPos + 48);
        doc.text(`Revenue by Payment Status:`, 14, yPos + 54);
        doc.text(`  Paid: ${metrics.revenueByPaymentStatus.Paid.toFixed(2)}`, 14, yPos + 60);
        doc.text(`  Pending: ${metrics.revenueByPaymentStatus.Pending.toFixed(2)}`, 14, yPos + 66);
        doc.text(`  Failed: ${metrics.revenueByPaymentStatus.Failed.toFixed(2)}`, 14, yPos + 72);
        yPos += 78;
      } else {
        doc.text(`Total Routes: ${metrics.totalRoutes}`, 14, yPos);
        doc.text(`Average Route Price: ${metrics.averageRoutePrice}`, 14, yPos + 6);
        doc.text(`Most Frequent Origin: ${metrics.mostFrequentOrigin.origin} (${metrics.mostFrequentOrigin.count})`, 14, yPos + 12);
        doc.text(`Most Frequent Destination: ${metrics.mostFrequentDestination.destination} (${metrics.mostFrequentDestination.count})`, 14, yPos + 18);
        doc.text(`Routes by Bus Type:`, 14, yPos + 24);
        doc.text(`  VIP: ${metrics.routesByBusType.VIP}`, 14, yPos + 30);
        doc.text(`  VVIP: ${metrics.routesByBusType.VVIP}`, 14, yPos + 36);
        doc.text(`  Standard: ${metrics.routesByBusType.Standard}`, 14, yPos + 42);
        doc.text(`  Unknown: ${metrics.routesByBusType.Unknown}`, 14, yPos + 48);
        yPos += 54;
      }

      // Data Table
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text(viewType === 'reservations' ? 'Reservations' : 'Routes', 14, yPos);
      if (viewType === 'reservations') {
        const reservationTableData = reservations.flatMap((reservation) =>
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
          startY: yPos + 6,
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
          margin: { top: yPos + 6, left: 14, right: 14 },
        });
      } else {
        const routeTableData = routes.map((route) => [
          route.origin,
          route.destination,
          route.departureAgency,
          route.arrivalAgency,
          route.tripDate,
          route.departureTime,
          route.arrivalTime,
          route.busType,
          route.price,
        ]);

        doc.autoTable({
          head: [['Origin', 'Destination', 'Departure Agency', 'Arrival Agency', 'Trip Date', 'Departure Time', 'Arrival Time', 'Bus Type', 'Price']],
          body: routeTableData,
          startY: yPos + 6,
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
            0: { cellWidth: 20 }, // Origin
            1: { cellWidth: 20 }, // Destination
            2: { cellWidth: 20 }, // Departure Agency
            3: { cellWidth: 20 }, // Arrival Agency
            4: { cellWidth: 20 }, // Trip Date
            5: { cellWidth: 20 }, // Departure Time
            6: { cellWidth: 20 }, // Arrival Time
            7: { cellWidth: 15 }, // Bus Type
            8: { cellWidth: 15 }, // Price
          },
          margin: { top: yPos + 6, left: 14, right: 14 },
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        doc.text(companyName, doc.internal.pageSize.width - 14 - doc.getTextWidth(companyName), doc.internal.pageSize.height - 10);
      }

      doc.save(`${reportType}_${viewType}_report_${selectedAgencyId}_${new Date().toISOString()}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      logError('ExportToPDF', error);
      toast.error('Failed to export PDF');
    }
  }, [reservations, routes, selectedAgencyId, reportType, userRole, agencies, viewType, metrics, getDateRange]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Card sx={{ mt: 2 }}>
            <CardHeader title={<Skeleton variant="text" width={300} />} />
            <CardContent>
              <Skeleton variant="rectangular" height={400} />
            </CardContent>
          </Card>
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

  const { start, end } = getDateRange();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Reports
        </Typography>
        <Card>
          <CardHeader
            title={
              <Typography variant="h6">
                {viewType === 'reservations' ? 'Reservations' : 'Routes'} Report - {agencies.find((a) => a.id === selectedAgencyId)?.name || 'Unknown Agency'}
              </Typography>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Select
                  value={selectedAgencyId}
                  onChange={(e) => setSelectedAgencyId(e.target.value)}
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
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="sixMonthly">6-Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
                <RadioGroup
                  row
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value)}
                  sx={{ ml: 2 }}
                >
                  <FormControlLabel value="reservations" control={<Radio />} label="Reservations" />
                  <FormControlLabel value="routes" control={<Radio />} label="Routes" />
                </RadioGroup>
                <Button
                  variant="contained"
                  color="error"
                  onClick={exportToPDF}
                  startIcon={<PictureAsPdfIcon />}
                  disabled={!roleMatrix[userRole]?.canGenerateReports}
                >
                  Export to PDF
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
            <Typography variant="h6" sx={{ mb: 2 }}>
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report ({start.toLocaleDateString()} - {end.toLocaleDateString()})
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Summary
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {viewType === 'reservations' ? (
                <>
                  <Grid item xs={12} sm={3}>
                    <Typography>Total Reservations: {metrics.totalReservations}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Total Passengers: {metrics.totalPassengers}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Total Revenue: {metrics.totalRevenue}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Average Price: {metrics.averagePrice}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Online Booking: {metrics.onlineBookingPercentage}%</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Pending Reservations: {metrics.reservationsByStatus.Pending}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Confirmed Reservations: {metrics.reservationsByStatus.Confirmed}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Cancelled Reservations: {metrics.reservationsByStatus.Cancelled}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Paid Revenue: {metrics.revenueByPaymentStatus.Paid.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Pending Revenue: {metrics.revenueByPaymentStatus.Pending.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Failed Revenue: {metrics.revenueByPaymentStatus.Failed.toFixed(2)}</Typography>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={3}>
                    <Typography>Total Routes: {metrics.totalRoutes}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Average Route Price: {metrics.averageRoutePrice}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Most Frequent Origin: {metrics.mostFrequentOrigin.origin} ({metrics.mostFrequentOrigin.count})</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Most Frequent Destination: {metrics.mostFrequentDestination.destination} ({metrics.mostFrequentDestination.count})</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>VIP Routes: {metrics.routesByBusType.VIP}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>VVIP Routes: {metrics.routesByBusType.VVIP}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Standard Routes: {metrics.routesByBusType.Standard}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography>Unknown Bus Type Routes: {metrics.routesByBusType.Unknown}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {viewType === 'reservations' ? 'Reservations' : 'Routes'}
            </Typography>
            <TableContainer component={Paper}>
              {viewType === 'reservations' ? (
                <Table aria-label="Reservations Table">
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
                                    <TableCell>Passenger Name</TableCell>
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
              ) : (
                <Table aria-label="Routes Table">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: 'white' }}>Origin</TableCell>
                      <TableCell sx={{ color: 'white' }}>Destination</TableCell>
                      <TableCell sx={{ color: 'white' }}>Departure Agency</TableCell>
                      <TableCell sx={{ color: 'white' }}>Arrival Agency</TableCell>
                      <TableCell sx={{ color: 'white' }}>Trip Date</TableCell>
                      <TableCell sx={{ color: 'white' }}>Departure Time</TableCell>
                      <TableCell sx={{ color: 'white' }}>Arrival Time</TableCell>
                      <TableCell sx={{ color: 'white' }}>Bus Type</TableCell>
                      <TableCell sx={{ color: 'white' }}>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {routes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          No routes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      routes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell>{route.origin}</TableCell>
                          <TableCell>{route.destination}</TableCell>
                          <TableCell>{route.departureAgency}</TableCell>
                          <TableCell>{route.arrivalAgency}</TableCell>
                          <TableCell>{route.tripDate}</TableCell>
                          <TableCell>{route.departureTime}</TableCell>
                          <TableCell>{route.arrivalTime}</TableCell>
                          <TableCell>{route.busType}</TableCell>
                          <TableCell>{route.price}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default Reports;