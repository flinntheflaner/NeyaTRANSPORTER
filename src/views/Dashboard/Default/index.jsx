import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CssBaseline,
  Typography,
  Select,
  MenuItem,
  Button,
  Alert,
  Skeleton,
  Divider,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

// Translations
const translations = {
  en: {
    analytics_dashboard: 'Analytics Dashboard',
    analytics_sendMessage: 'Analytics - {companyName} {agencyName}',
    select_agency: 'Select Agency',
    time_frame: 'Time Frame',
    company_wide_analytics: 'Company-Wide Analytics',
    error_occurred: 'Error Occurred',
    error: 'Error',
    please_contact_support: 'Please contact support for assistance.',
    retry: 'Retry',
    no_company_associated: 'No Company Associated',
    no_company_message: 'Please create a company to view analytics.',
    no_agencies: 'No Agencies Found',
    no_agencies_message_super_admin: 'Please create an agency to view analytics.',
    no_agencies_message_operations_manager: 'Please contact your administrator to associate agencies with your account.',
    add_agency: 'Add Agency',
    contact_support: 'Contact Support',
    user_age_distribution: 'User Age Distribution',
    user_locations: 'User Locations',
    booking_origins: 'Booking Origins',
    booking_destinations: 'Booking Destinations',
    bus_type_bookings: 'Bus Type Bookings',
    seat_preferences: 'Seat Preferences',
    popular_routes: 'Popular Routes',
    route_occupancy_rates: 'Route Occupancy Rates',
    revenue_per_agency: 'Revenue per Agency',
    no_data_available: 'No {title} data available',
    weekly: 'Weekly',
    monthly: 'Monthly',
    sixMonthly: '6-Monthly',
    yearly: 'Yearly',
    unknown_agency: 'Unknown Agency',
    no_access: 'You do not have access to this page.',
  },
  fr: {
    analytics_dashboard: 'Tableau de Bord Analytique',
    analytics_sendMessage: 'Analytique - {companyName} {agencyName}',
    select_agency: 'Sélectionner l\'Agence',
    time_frame: 'Période',
    company_wide_analytics: 'Analytique à l\'Échelle de l\'Entreprise',
    error_occurred: 'Une Erreur est Survenue',
    error: 'Erreur',
    please_contact_support: 'Veuillez contacter le support pour assistance.',
    retry: 'Réessayer',
    no_company_associated: 'Aucune Entreprise Associée',
    no_company_message: 'Veuillez créer une entreprise pour voir les analyses.',
    no_agencies: 'Aucune Agence Trouvée',
    no_agencies_message_super_admin: 'Veuillez créer une agence pour voir les analyses.',
    no_agencies_message_operations_manager: 'Veuillez contacter votre administrateur pour associer des agences à votre compte.',
    add_agency: 'Ajouter une Agence',
    contact_support: 'Contacter le Support',
    user_age_distribution: 'Distribution d\'Âge des Utilisateurs',
    user_locations: 'Emplacements des Utilisateurs',
    booking_origins: 'Origines des Réservations',
    booking_destinations: 'Destinations des Réservations',
    bus_type_bookings: 'Réservations par Type de Bus',
    seat_preferences: 'Préférences de Sièges',
    popular_routes: 'Itinéraires Populaires',
    route_occupancy_rates: 'Taux d\'Occupation des Itinéraires',
    revenue_per_agency: 'Revenu par Agence',
    no_data_available: 'Aucune donnée {title} disponible',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuel',
    sixMonthly: 'Semestriel',
    yearly: 'Annuel',
    unknown_agency: 'Agence Inconnue',
    no_access: 'Vous n\'avez pas accès à cette page.',
  },
};

// Breadcrumb Component
const Breadcrumb = ({ title, children, language, setLanguage }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
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

// Theme setup with minimal MUI overrides
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f7fafc' },
  },
  typography: {
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
});

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canViewAnalytics: true,
    canViewAllAgencies: true,
    canCreateAgency: true,
    canCreateCompany: true,
  },
  'Operations Manager': {
    canViewAnalytics: true,
    canViewAllAgencies: false,
    canCreateAgency: false,
    canCreateCompany: false,
  },
  'Agent Supervisor': {
    canViewAnalytics: false,
    canViewAllAgencies: false,
    canCreateAgency: false,
    canCreateCompany: true,
  },
  'Ticketing Agent': {
    canViewAnalytics: false,
    canViewAllAgencies: false,
    canCreateAgency: false,
    canCreateCompany: false,
  },
};

// Error and success logging utilities
const logError = (context, error, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${context}:`, {
    message: error.message,
    stack: error.stack,
    ...additionalInfo,
  });
};

const logSuccess = (context, message, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${context}:`, { message, ...additionalInfo });
};

// Timeout utility
const withTimeout = async (promise, ms = 10000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
};

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FFCD56', '#4BC0C0', '#C9CBFF', '#36A2EB',
  '#FF6F61', '#6B7280', '#10B981', '#F59E0B', '#3B82F6',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('fr');
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [userAgencies, setUserAgencies] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [passengerAssignments, setPassengerAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [showCompanyAnalytics, setShowCompanyAnalytics] = useState(false);

  const t = useCallback((key, params = {}) => {
    let text = translations[language][key] || key;
    for (const param in params) {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }
    return text;
  }, [language]);

  // Date range calculation
  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ranges = {
      weekly: { start: new Date(today), end: new Date(today) },
      monthly: { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
      sixMonthly: { start: new Date(today.getFullYear(), today.getMonth() - 6, 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
      yearly: { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) },
    };
    ranges.weekly.start.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    ranges.weekly.end.setDate(ranges.weekly.start.getDate() + 6);
    return ranges[timeFrame];
  }, [timeFrame]);

  // Analytics data processing
  const analytics = useCallback(() => {
    const { start, end } = getDateRange();

    // Age Groups
    const ageGroups = profiles.reduce((acc, profile) => {
      if (!profile.dob) return acc;
      const age = new Date().getFullYear() - new Date(profile.dob).getFullYear();
      let key = age < 18 ? '<18' : age <= 25 ? '18-25' : age <= 35 ? '26-35' : age <= 50 ? '36-50' : '50+';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 });
    const ageGroupsArray = Object.entries(ageGroups).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Locations
    const locations = profiles.reduce((acc, profile) => {
      if (profile.location) acc[profile.location] = (acc[profile.location] || 0) + 1;
      return acc;
    }, {});
    const locationsArray = Object.entries(locations).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Origins
    const origins = reservations.reduce((acc, res) => {
      if (res.routes?.origin) acc[res.routes.origin] = (acc[res.routes.origin] || 0) + res.passenger_count;
      return acc;
    }, {});
    const originsArray = Object.entries(origins).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Destinations
    const destinations = reservations.reduce((acc, res) => {
      if (res.routes?.destination) acc[res.routes.destination] = (acc[res.routes.destination] || 0) + res.passenger_count;
      return acc;
    }, {});
    const destinationsArray = Object.entries(destinations).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Bus Types
    const busTypes = { Standard: 0, VIP: 0, VVIP: 0, Unknown: 0 };
    reservations.forEach((res) => {
      const busType = res.routes?.buses?.bus_type || 'Unknown';
      busTypes[busType] = (busTypes[busType] || 0) + res.passenger_count;
    });
    const busTypesArray = Object.entries(busTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Seat Preferences
    const seatPreferences = passengerAssignments.reduce((acc, pa) => {
      pa.seat_number.forEach((seat) => {
        if (seat % 2 === 0) acc.window += 1;
        else acc.aisle += 1;
        if (seat <= 10) acc.front += 1;
        else if (seat > 20) acc.back += 1;
        else acc.middle += 1;
      });
      return acc;
    }, { window: 0, aisle: 0, front: 0, middle: 0, back: 0 });
    const seatPreferencesArray = [
      { name: 'Window', value: seatPreferences.window },
      { name: 'Aisle', value: seatPreferences.aisle },
      { name: 'Front', value: seatPreferences.front },
      { name: 'Middle', value: seatPreferences.middle },
      { name: 'Back', value: seatPreferences.back },
    ].filter((item) => item.value > 0);

    // Popular Routes
    const popularRoutes = reservations.reduce((acc, res) => {
      if (res.routes?.origin && res.routes?.destination) {
        const key = `${res.routes.origin}-${res.routes.destination}`;
        acc[key] = (acc[key] || 0) + res.passenger_count;
      }
      return acc;
    }, {});
    const popularRoutesArray = Object.entries(popularRoutes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Occupancy Rates
    const occupancyRates = {};
    routes.forEach((route) => {
      const key = `${route.origin}-${route.destination}`;
      if (!occupancyRates[key]) {
        occupancyRates[key] = { totalPassengers: 0, totalSeats: 0 };
      }
      const routeReservations = reservations.filter((res) => res.route_id === route.id);
      const totalPassengers = routeReservations.reduce((sum, res) => sum + res.passenger_count, 0);
      occupancyRates[key].totalPassengers += totalPassengers;
      const bus = route.buses;
      occupancyRates[key].totalSeats += bus ? bus.capacity : route.seats_available;
    });
    const occupancyRatesArray = Object.entries(occupancyRates).map(([name, { totalPassengers, totalSeats }]) => ({
      name,
      value: totalSeats > 0 ? (totalPassengers / totalSeats) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    // Revenue per Agency (only for company-wide analytics)
    const revenuePerAgency = agencies.reduce((acc, agency) => {
      const agencyReservations = reservations.filter((res) => res.agency_id === agency.id);
      const totalRevenue = agencyReservations.reduce((sum, res) => sum + (res.total_price || 0), 0);
      acc[agency.name] = totalRevenue;
      return acc;
    }, {});
    const revenuePerAgencyArray = Object.entries(revenuePerAgency)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Log bus types and revenue for debugging
    logSuccess('AnalyticsAggregation', 'Data aggregated', { busTypes, revenuePerAgency });

    return {
      ageGroups: ageGroupsArray,
      locations: locationsArray,
      origins: originsArray,
      destinations: destinationsArray,
      busTypes: busTypesArray,
      seatPreferences: seatPreferencesArray,
      popularRoutes: popularRoutesArray,
      occupancyRates: occupancyRatesArray,
      revenuePerAgency: revenuePerAgencyArray,
    };
  }, [reservations, routes, profiles, passengerAssignments, agencies, getDateRange]);

  const memoizedAnalytics = useMemo(() => analytics(), [analytics]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(`Session error: ${sessionError.message}`);
        if (!session) {
          toast.error(t('messages_loginRequired'));
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

        // Restrict access based on role
        if (!roleMatrix[userRow.role]?.canViewAnalytics) {
          throw new Error(t('no_access'));
        }

        let companyIdToUse = userRow.company_id;
        if (!companyIdToUse && roleMatrix[userRow.role]?.canCreateCompany) {
          const { data: companyData, error: companyError } = await supabase
            .from('transport_companies')
            .select('id, name')
            .eq('user_id', session.user.id)
            .single();
          if (companyError) {
            if (companyError.code === 'PGRST116') throw new Error(t('messages_noCompany'));
            throw new Error(`Failed to fetch company: ${companyError.message}`);
          }
          companyIdToUse = companyData.id;
          setCompanyId(companyData.id);
          setCompanyName(companyData.name);
        } else if (companyIdToUse) {
          const { data: companyData, error: companyError } = await supabase
            .from('transport_companies')
            .select('name')
            .eq('id', companyIdToUse)
            .single();
          if (companyError) throw new Error(`Failed to fetch company: ${companyError.message}`);
          setCompanyId(companyIdToUse);
          setCompanyName(companyData.name);
        } else {
          throw new Error(t('messages_noCompany'));
        }

        // Fetch user agencies for Operations Manager
        const { data: userAgenciesData, error: userAgenciesError } = await supabase
          .from('user_agencies')
          .select('agency_id')
          .eq('user_id', session.user.id);
        if (userAgenciesError) throw new Error(`Failed to fetch user agencies: ${userAgenciesError.message}`);
        setUserAgencies(userAgenciesData || []);

        let agencyQuery = supabase
          .from('agencies')
          .select('id, name')
          .eq('company_id', companyIdToUse)
          .order('name', { ascending: true });

        // Restrict Operations Manager to assigned agencies
        if (userRow.role === 'Operations Manager' && userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          agencyQuery = agencyQuery.in('id', agencyIds);
        }

        const { data: agenciesData, error: agenciesError } = await withTimeout(agencyQuery);
        if (agenciesError) throw new Error(`Failed to fetch agencies: ${agenciesError.message}`);
        setAgencies(agenciesData || []);
        if (agenciesData.length > 0) setSelectedAgencyId(agenciesData[0].id);

        logSuccess('InitialDataFetch', 'Initial data fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          agencyCount: agenciesData.length,
        });
      } catch (error) {
        logError('InitialDataFetch', error, { userId: session?.user?.id });
        setError(error.message);
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };
    fetchInitialData();
  }, [navigate, t]);

  // Fetch analytics data
  useEffect(() => {
    if (!companyId) return;
    const fetchAnalyticsData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);
        const { start, end } = getDateRange();
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        // Fetch all reservations with joins
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
              buses!inner(id, bus_type, capacity, license_plate),
              departure_agency:agencies!routes_departure_agency_id_fkey(id, name),
              arrival_agency:agencies!routes_arrival_agency_id_fkey(id, name)
            ),
            agencies!inner(id, name),
            transport_companies!inner(id, name)
          `)
          .eq('company_id', companyId)
          .gte('reservation_date_time', startISO)
          .lte('reservation_date_time', endISO);

        if (!showCompanyAnalytics && selectedAgencyId) {
          reservationQuery = reservationQuery.eq('agency_id', selectedAgencyId);
          if (userRole === 'Operations Manager' && userAgencies.length > 0) {
            const agencyIds = userAgencies.map((ua) => ua.agency_id);
            reservationQuery = reservationQuery.in('agency_id', agencyIds);
          }
        }

        const { data: reservationData, error: reservationError } = await withTimeout(reservationQuery);
        if (reservationError) throw new Error(`Failed to fetch reservations: ${reservationError.message}`);
        setReservations(reservationData || []);

        // Fetch all routes with joins
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
            seats_available,
            buses!inner(id, bus_type, capacity, license_plate),
            departure_agency:agencies!routes_departure_agency_id_fkey(id, name),
            arrival_agency:agencies!routes_arrival_agency_id_fkey(id, name)
          `)
          .eq('company_id', companyId)
          .gte('trip_date', start.toISOString().split('T')[0])
          .lte('trip_date', end.toISOString().split('T')[0]);

        if (!showCompanyAnalytics && userRole === 'Operations Manager' && userAgencies.length > 0) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
          );
        }

        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(`Failed to fetch routes: ${routesError.message}`);
        setRoutes(routesData || []);

        // Fetch all profiles
        const { data: profilesData, error: profilesError } = await withTimeout(
          supabase.from('profiles').select('id, dob, location')
        );
        if (profilesError) throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        setProfiles(profilesData || []);

        // Fetch all passenger assignments
        let passengerQuery = supabase
          .from('passenger_assignments')
          .select('id, route_id, company_id, agency_id, seat_number, passenger_number, reservation_date_time')
          .eq('company_id', companyId)
          .gte('reservation_date_time', startISO)
          .lte('reservation_date_time', endISO);

        if (!showCompanyAnalytics && selectedAgencyId) {
          passengerQuery = passengerQuery.eq('agency_id', selectedAgencyId);
          if (userRole === 'Operations Manager' && userAgencies.length > 0) {
            const agencyIds = userAgencies.map((ua) => ua.agency_id);
            passengerQuery = passengerQuery.in('agency_id', agencyIds);
          }
        }

        const { data: passengerData, error: passengerError } = await withTimeout(passengerQuery);
        if (passengerError) throw new Error(`Failed to fetch passenger assignments: ${passengerError.message}`);
        setPassengerAssignments(passengerData || []);

        logSuccess('AnalyticsDataFetch', 'Analytics data fetched successfully', {
          reservationCount: reservationData?.length,
          routeCount: routesData?.length,
          profileCount: profilesData?.length,
          passengerCount: passengerData?.length,
          busTypes: routesData?.map((route) => route.buses?.bus_type || 'Unknown') || [],
        });
      } catch (error) {
        logError('AnalyticsDataFetch', error);
        setError(`Failed to fetch analytics data: ${error.message}`);
      } finally {
        setLoading(false);
        logSuccess('AnalyticsDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };
    fetchAnalyticsData();
  }, [companyId, selectedAgencyId, timeFrame, userRole, userAgencies, showCompanyAnalytics, getDateRange, t]);

  // No access state for Ticketing Agent
  if (userRole === 'Ticketing Agent') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Alert severity="error" className="rounded-lg shadow-md">
              <Typography variant="h6">{t('no_access')}</Typography>
             
                {t('contact_support')}
              
            </Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Loading state
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Skeleton variant="text" className="w-48 h-10 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="bg-white shadow-lg rounded-lg overflow-hidden">
                  <CardHeader title={<Skeleton variant="text" className="w-32" />} />
                  <CardContent>
                    <Skeleton variant="rectangular" className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Error state
  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Alert severity="error" className="rounded-lg shadow-md">
              <Typography variant="h6">{t('error_occurred')}</Typography>
              <Typography>{error}</Typography>
              <Typography>{t('please_contact_support')}</Typography>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                aria-label={t('retry')}
              >
                {t('retry')}
              </Button>
            </Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // No company state
  if (!companyId && roleMatrix[userRole]?.canCreateCompany) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Alert severity="error" className="rounded-lg shadow-md">
              <Typography variant="h6">{t('no_company_associated')}</Typography>
              <Typography>{t('no_company_message')}</Typography>
              <Button
            
              >
                {t('create_company')}
              </Button>
            </Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  } else if (!companyId) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Alert severity="error" className="rounded-lg shadow-md">
              <Typography variant="h6">{t('no_company_associated')}</Typography>
              <Typography>{t('please_contact_support')}</Typography>
              <Button
        
              >
                {t('contact_support')}
              </Button>
            </Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // No agencies state
  if (agencies.length === 0 && !showCompanyAnalytics) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Alert severity="error" className="rounded-lg shadow-md">
              <Typography variant="h6">{t('no_agencies')}</Typography>
              <Typography>
                {roleMatrix[userRole]?.canCreateAgency
                  ? t('no_agencies_message_super_admin')
                  : t('no_agencies_message_operations_manager')}
              </Typography>
              {roleMatrix[userRole]?.canCreateAgency ? (
                <Button
              
                >
                  {t('add_agency')}
                </Button>
              ) : (
                <Button
         
                >
                  {t('contact_support')}
                </Button>
              )}
            </Alert>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const analyticsData = memoizedAnalytics;

  const charts = [
    { title: 'user_age_distribution', type: 'pie', dataField: 'ageGroups' },
    { title: 'user_locations', type: 'bar', dataField: 'locations' },
    { title: 'booking_origins', type: 'bar', dataField: 'origins' },
    { title: 'booking_destinations', type: 'bar', dataField: 'destinations' },
    { title: 'bus_type_bookings', type: 'pie', dataField: 'busTypes' },
    { title: 'seat_preferences', type: 'bar', dataField: 'seatPreferences' },
    { title: 'popular_routes', type: 'line', dataField: 'popularRoutes' },
    { title: 'route_occupancy_rates', type: 'bar', dataField: 'occupancyRates' },
    ...(showCompanyAnalytics ? [{ title: 'revenue_per_agency', type: 'bar', dataField: 'revenuePerAgency' }] : []),
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb title={t('analytics_dashboard')} language={language} setLanguage={setLanguage}>
          </Breadcrumb>
          <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
            <CardHeader
              title={
                <Typography variant="h6" className="text-gray-700">
                  {t('analytics_sendMessage', { companyName, agencyName: showCompanyAnalytics ? '' : ` - ${agencies.find((a) => a.id === selectedAgencyId)?.name || t('unknown_agency')}` })}
                </Typography>
              }
              action={
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {!showCompanyAnalytics && (
                    <FormControl className="w-48">
                      <InputLabel>{t('select_agency')}</InputLabel>
                      <Select
                        value={selectedAgencyId}
                        onChange={(e) => setSelectedAgencyId(e.target.value)}
                        label={t('select_agency')}
                        className="bg-white"
                      >
                        <MenuItem value="" disabled>{t('select_agency')}</MenuItem>
                        {agencies.map((agency) => (
                          <MenuItem key={agency.id} value={agency.id}>{agency.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <FormControl className="w-48">
                    <InputLabel>{t('time_frame')}</InputLabel>
                    <Select
                      value={timeFrame}
                      onChange={(e) => setTimeFrame(e.target.value)}
                      label={t('time_frame')}
                      className="bg-white"
                    >
                      <MenuItem value="weekly">{t('weekly')}</MenuItem>
                      <MenuItem value="monthly">{t('monthly')}</MenuItem>
                      <MenuItem value="sixMonthly">{t('sixMonthly')}</MenuItem>
                      <MenuItem value="yearly">{t('yearly')}</MenuItem>
                    </Select>
                  </FormControl>
                  {userRole === 'Super Admin' && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showCompanyAnalytics}
                          onChange={(e) => setShowCompanyAnalytics(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={t('company_wide_analytics')}
                      className="text-gray-700"
                    />
                  )}
                </div>
              }
              className="bg-gray-50 p-4"
            />
            <Divider />
            <CardContent className="p-6">
              {error && (
                <Alert severity="error" className="mb-6 rounded-lg shadow-md">
                  {t('error_occurred')}: {error}
                </Alert>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {charts.map((chart, index) => {
                  const data = analyticsData[chart.dataField];
                  const hasData = data.length > 0 && (chart.dataField === 'busTypes' || data.some((e) => e.value > 0));
                  return (
                    <Card key={index} className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                      <CardHeader title={t(chart.title)} className="bg-gray-50 text-gray-700 text-lg font-semibold" />
                      <CardContent className="p-4">
                        {hasData ? (
                          <ResponsiveContainer width="100%" height={300}>
                            {chart.type === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={data}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  label={false}
                                  labelLine={false}
                                >
                                  {data.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                              </PieChart>
                            ) : chart.type === 'bar' ? (
                              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                                <YAxis />
                                <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                                <Legend />
                                <Bar dataKey="value">
                                  {data.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            ) : (
                              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                                <YAxis />
                                <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke={COLORS[0]} />
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center">
                            {t('no_data_available', { title: t(chart.title).toLowerCase() })}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Dashboard;