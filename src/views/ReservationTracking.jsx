import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
// Translations
const translations = {
  en: {
    reservation_error: 'Error',
    reservation_unknownError: 'Unknown error: {error}',
    reservation_errorDetails: 'Details: {details}',
    reservation_noDetails: 'No details available',
    reservation_refreshOrContact: 'Please refresh the page or contact support.',
    reservation_session_failed: 'Failed to get session: {error}',
    reservation_login_required: 'Login required',
    reservation_user_failed: 'Failed to fetch user: {error}',
    reservation_no_permission_view: 'You do not have permission to view reservations',
    reservation_user_agencies_failed: 'Failed to fetch user agencies: {error}',
    reservation_no_company: 'No company associated with this user',
    reservation_company_failed: 'Failed to fetch company: {error}',
    reservation_agencies_failed: 'Failed to fetch agencies: {error}',
    reservation_buses_failed: 'Failed to fetch buses: {error}',
    reservation_routes_failed: 'Failed to fetch routes: {error}',
    reservation_db_error: 'Database error: {code}',
    reservation_fetch_failed: 'Failed to fetch data: {error}',
    reservation_reservations_failed: 'Failed to fetch reservations: {error}',
    reservation_passenger_assignments_failed: 'Failed to fetch passenger assignments for reservation {id}: {error}',
    reservation_profile_failed: 'Failed to fetch profile: {error}',
    reservation_no_permission_create: 'You do not have permission to create reservations',
    reservation_full_name_required: 'Full name is required',
    reservation_invalid_phone: 'Invalid phone number format (+2376xxxxxxxx)',
    reservation_invalid_seat: 'Seat number must be between 1 and 99',
    reservation_departure_required: 'Departure date and time are required',
    reservation_reservation_required: 'Reservation date and time are required',
    reservation_past_trip: 'Cannot book a trip in the past',
    reservation_reservation_before_departure: 'Reservation must be before departure',
    reservation_reservation_no_future: 'Reservation cannot be in the future',
    reservation_no_trip_exists: 'No trip exists for {origin} to {destination} on {date} at {time}',
    reservation_seat_taken: 'Seat already taken',
    reservation_no_seats: 'No seats available for this trip',
    reservation_insert_failed: 'Failed to insert reservation: {error}',
    reservation_passenger_insert_failed: 'Failed to insert passenger assignment: {error}',
    reservation_fetch_new_failed: 'Failed to fetch new reservation: {error}',
    reservation_booking_added: 'Booking added successfully',
    reservation_no_permission_export: 'You do not have permission to export reports',
    reservation_export_required: 'Route is required for export',
    reservation_pdf_exported: 'PDF exported successfully',
    reservation_pdf_failed: 'Failed to export PDF',
    reservation_tracking: 'Reservation Tracking',
    reservation_add_booking: 'Add Booking',
    reservation_export_route: 'Export Route',
    reservation_select_route_export: 'Select route for export',
    reservation_export_pdf: 'Export to PDF',
    reservation_no_reservations: 'No reservations found',
    reservation_departure_agency: 'Departure Agency',
    reservation_arrival_agency: 'Arrival Agency',
    reservation_origin: 'Origin',
    reservation_destination: 'Destination',
    reservation_departure: 'Departure',
    reservation_arrival: 'Arrival',
    reservation_bus_type: 'Bus Type',
    reservation_price: 'Price',
    reservation_passenger_count: 'Passenger Count',
    reservation_reservation_status: 'Reservation Status',
    reservation_payment_status: 'Payment Status',
    reservation_online_booking: 'Online Booking',
    reservation_passenger_index: '#',
    reservation_full_name: 'Full Name',
    reservation_phone_number: 'Phone Number',
    reservation_seat_number: 'Seat Number',
    reservation_passenger_number: 'Passenger Number',
    reservation_government_id: 'Government ID',
    reservation_reservation_date: 'Reservation Date',
    reservation_passenger_created: 'Passenger Assignment Created',
    reservation_add_new_booking: 'Add New Booking',
    reservation_select_origin: 'Select Origin',
    reservation_select_destination: 'Select Destination',
    reservation_departure_date: 'Departure Date',
    reservation_departure_time: 'Departure Time',
    reservation_no_time_slots: 'No time slots available',
    reservation_select_time: 'Select Time',
    reservation_enter_full_name: 'Enter full name',
    reservation_passenger_full_name: "Enter passenger's full name",
    reservation_enter_phone: 'Enter phone number (+2376xxxxxxxx)',
    reservation_enter_seat: 'Enter seat number (1-99)',
    reservation_seat_helper: 'Enter seat number',
    reservation_select_payment: 'Select payment status',
    reservation_paid: 'Paid',
    reservation_pending: 'Pending',
    reservation_id_verified: 'Government ID Verified',
    reservation_online_booking_label: 'Online Booking',
    reservation_reservation_date_label: 'Reservation Date',
    reservation_reservation_time: 'Reservation Time',
    reservation_select_reservation_time: 'Select reservation time',
    reservation_add: 'Add',
    reservation_cancel: 'Cancel',
    reservation_no_agencies: 'No agencies found',
    reservation_contact_support: 'Please contact support to associate agencies with your account',
    reservation_return_dashboard: 'Return to Dashboard',
    reservation_loading: 'Loading',
    reservation_retry: 'Retry',
    reservation_pdf_title: 'Passenger Verification Report',
    reservation_pdf_route: 'Route: {origin} to {destination}',
    reservation_pdf_trip_date: 'Trip Date: {period}',
    reservation_pdf_generated: 'Generated: {date}',
    reservation_pdf_company: 'Company: {companyName}',
    reservation_pdf_summary: 'Summary',
    reservation_pdf_total_res: 'Total Reservations: {count}',
    reservation_pdf_total_pass: 'Total Passengers: {count}',
    reservation_pdf_headers: [
      '#', 'Passenger Name', 'Departure Agency', 'Arrival Agency', 'Origin', 'Destination', 'Departure', 'Bus Type',
      'License Plate', 'Price', 'Phone Number', 'Seat Number', 'Payment Status', 'Government ID', 'Reservation Date', 'Booking Type'
    ],
    reservation_select_agency: 'Select Agency',
    reservation_select_route: 'Select Route',
  },
  fr: {
    reservation_error: 'Erreur',
    reservation_unknownError: 'Erreur inconnue : {error}',
    reservation_errorDetails: 'Détails : {details}',
    reservation_noDetails: 'Aucun détail disponible',
    reservation_refreshOrContact: 'Veuillez rafraîchir la page ou contacter le support.',
    reservation_session_failed: 'Échec de l\'obtention de la session : {error}',
    reservation_login_required: 'Connexion requise',
    reservation_user_failed: 'Échec de la récupération de l\'utilisateur : {error}',
    reservation_no_permission_view: "Vous n'avez pas la permission de voir les réservations",
    reservation_user_agencies_failed: 'Échec de la récupération des agences utilisateur : {error}',
    reservation_no_company: 'Aucune entreprise associée à cet utilisateur',
    reservation_company_failed: 'Échec de la récupération de l\'entreprise : {error}',
    reservation_agencies_failed: 'Échec de la récupération des agences : {error}',
    reservation_buses_failed: 'Échec de la récupération des bus : {error}',
    reservation_routes_failed: 'Échec de la récupération des itinéraires : {error}',
    reservation_db_error: 'Erreur de base de données : {code}',
    reservation_fetch_failed: 'Échec de la récupération des données : {error}',
    reservation_reservations_failed: 'Échec de la récupération des réservations : {error}',
    reservation_passenger_assignments_failed: 'Échec de la récupération des affectations de passagers pour la réservation {id} : {error}',
    reservation_profile_failed: 'Échec de la récupération du profil : {error}',
    reservation_no_permission_create: "Vous n'avez pas la permission de créer des réservations",
    reservation_full_name_required: 'Le nom complet est requis',
    reservation_invalid_phone: 'Format de numéro de téléphone invalide (+2376xxxxxxxx)',
    reservation_invalid_seat: 'Le numéro de siège doit être entre 1 et 99',
    reservation_departure_required: 'La date et l\'heure de départ sont requises',
    reservation_reservation_required: 'La date et l\'heure de réservation sont requises',
    reservation_past_trip: 'Impossible de réserver un voyage dans le passé',
    reservation_reservation_before_departure: 'La réservation doit être avant le départ',
    reservation_reservation_no_future: 'La réservation ne peut pas être dans le futur',
    reservation_no_trip_exists: 'Aucun voyage n\'existe pour {origin} à {destination} le {date} à {time}',
    reservation_seat_taken: 'Siège déjà pris',
    reservation_no_seats: 'Aucun siège disponible pour ce voyage',
    reservation_insert_failed: 'Échec de l\'insertion de la réservation : {error}',
    reservation_passenger_insert_failed: 'Échec de l\'insertion de l\'affectation de passager : {error}',
    reservation_fetch_new_failed: 'Échec de la récupération de la nouvelle réservation : {error}',
    reservation_booking_added: 'Réservation ajoutée avec succès',
    reservation_no_permission_export: "Vous n'avez pas la permission d'exporter des rapports",
    reservation_export_required: 'Itinéraire est requis pour l\'export',
    reservation_pdf_exported: 'PDF exporté avec succès',
    reservation_pdf_failed: 'Échec de l\'export PDF',
    reservation_tracking: 'Suivi des Réservations',
    reservation_add_booking: 'Ajouter une Réservation',
    reservation_export_route: 'Exporter Itinéraire',
    reservation_select_route_export: 'Sélectionnez l\'itinéraire pour l\'export',
    reservation_export_pdf: 'Exporter en PDF',
    reservation_no_reservations: 'Aucune réservation trouvée',
    reservation_departure_agency: 'Agence de Départ',
    reservation_arrival_agency: 'Agence d\'Arrivée',
    reservation_origin: 'Origine',
    reservation_destination: 'Destination',
    reservation_departure: 'Départ',
    reservation_arrival: 'Arrivée',
    reservation_bus_type: 'Type de Bus',
    reservation_price: 'Prix',
    reservation_passenger_count: 'Nombre de Passagers',
    reservation_reservation_status: 'Statut de Réservation',
    reservation_payment_status: 'Statut de Paiement',
    reservation_online_booking: 'Réservation en Ligne',
    reservation_passenger_index: '#',
    reservation_full_name: 'Nom Complet',
    reservation_phone_number: 'Numéro de Téléphone',
    reservation_seat_number: 'Numéro de Siège',
    reservation_passenger_number: 'Numéro de Passager',
    reservation_government_id: 'ID Gouvernemental',
    reservation_reservation_date: 'Date de Réservation',
    reservation_passenger_created: 'Création d\'Affectation de Passager',
    reservation_add_new_booking: 'Ajouter une Nouvelle Réservation',
    reservation_select_origin: 'Sélectionnez l\'Origine',
    reservation_select_destination: 'Sélectionnez la Destination',
    reservation_departure_date: 'Date de Départ',
    reservation_departure_time: 'Heure de Départ',
    reservation_no_time_slots: 'Aucun créneau horaire disponible',
    reservation_select_time: 'Sélectionnez l\'Heure',
    reservation_enter_full_name: 'Entrez le nom complet',
    reservation_passenger_full_name: 'Entrez le nom complet du passager',
    reservation_enter_phone: 'Entrez le numéro de téléphone (+2376xxxxxxxx)',
    reservation_enter_seat: 'Entrez le numéro de siège (1-99)',
    reservation_seat_helper: 'Entrez le numéro de siège',
    reservation_select_payment: 'Sélectionnez le statut de paiement',
    reservation_paid: 'Payé',
    reservation_pending: 'En Attente',
    reservation_id_verified: 'ID Gouvernemental Vérifié',
    reservation_online_booking_label: 'Réservation en Ligne',
    reservation_reservation_date_label: 'Date de Réservation',
    reservation_reservation_time: 'Heure de Réservation',
    reservation_select_reservation_time: 'Sélectionnez l\'heure de réservation',
    reservation_add: 'Ajouter',
    reservation_cancel: 'Annuler',
    reservation_no_agencies: 'Aucune agence trouvée',
    reservation_contact_support: 'Veuillez contacter le support pour associer des agences à votre compte',
    reservation_return_dashboard: 'Retour au Tableau de Bord',
    reservation_loading: 'Chargement',
    reservation_retry: 'Réessayer',
    reservation_pdf_title: 'Rapport de Vérification des Passagers',
    reservation_pdf_route: 'Itinéraire : {origin} à {destination}',
    reservation_pdf_trip_date: 'Date du Voyage : {period}',
    reservation_pdf_generated: 'Généré : {date}',
    reservation_pdf_company: 'Entreprise : {companyName}',
    reservation_pdf_summary: 'Résumé',
    reservation_pdf_total_res: 'Réservations Totales : {count}',
    reservation_pdf_total_pass: 'Passagers Totaux : {count}',
    reservation_pdf_headers: [
      '#', 'Nom du Passager', 'Agence de Départ', 'Agence d\'Arrivée', 'Origine', 'Destination', 'Départ', 'Type de Bus',
      'Plaque d\'immatriculation', 'Prix', 'Numéro de Téléphone', 'Numéro de Siège', 'Statut de Paiement', 'ID Gouvernemental', 'Date de Réservation', 'Type de Réservation'
    ],
    reservation_select_agency: 'Sélectionnez l\'Agence',
    reservation_select_route: 'Sélectionnez l\'Itinéraire',
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
    canCreateReservation: false,
    canUpdateReservation: false,
    canDeleteReservation: false,
    canViewAnalytics: false,
    canGenerateReports: true,
    canViewAgencies: true,
    canCreateAgency: false,
    canRequestElevation: false,
  },
};
const ReservationTracking = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('fr');
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [refreshKey, setRefreshKey] = useState(0);
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
  const [exportRouteId, setExportRouteId] = useState('');
  const MAX_SEATS_PER_TRIP = 30;
  const today = new Date().toISOString().split('T')[0];
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
        if (sessionError) throw new Error(t('reservation_session_failed', { error: sessionError.message }));
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          toast.error(t('reservation_login_required'));
          navigate('/application/login');
          return;
        }
        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('user_id, role, company_id')
          .eq('user_id', session.user.id)
          .single();
        if (userRowError) throw new Error(t('reservation_user_failed', { error: userRowError.message }));
        setUserRole(userRow.role || 'Ticketing Agent');
        if (!roleMatrix[userRow.role]?.canViewReservations) {
          throw new Error(t('reservation_no_permission_view'));
        }
        const { data: userAgenciesData, error: userAgenciesError } = await withTimeout(
          supabase
            .from('user_agencies')
            .select('agency_id')
            .eq('user_id', session.user.id)
        );
        if (userAgenciesError) throw new Error(t('reservation_user_agencies_failed', { error: userAgenciesError.message }));
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
              throw new Error(t('reservation_no_company'));
            }
            throw new Error(t('reservation_company_failed', { error: companyError.message }));
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
        if (agenciesError) throw new Error(t('reservation_agencies_failed', { error: agenciesError.message }));
        setAgencies(agenciesData || []);
        if (agenciesData.length > 0) {
          setSelectedAgencyId(agenciesData[0].id);
        }
        let busQuery = supabase.from('buses').select('id, bus_type, license_plate').eq('company_id', companyIdToUse);
        if (!roleMatrix[userRow.role]?.canCreateReservation && userAgenciesData.length > 0) {
          busQuery = busQuery.in('agency_id', userAgenciesData.map((ua) => ua.agency_id));
        }
        const { data: busesData, error: busesError } = await withTimeout(busQuery);
        if (busesError) throw new Error(t('reservation_buses_failed', { error: busesError.message }));
        setBuses(busesData || []);
        let routeQuery = supabase.from('routes').select('id, company_id, origin, destination, trip_date, departure_time, arrival_time, price, bus_id, departure_agency_id, arrival_agency_id').eq('company_id', companyIdToUse);
        if (!roleMatrix[userRow.role]?.canCreateReservation && userAgenciesData.length > 0) {
          const agencyIds = userAgenciesData.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
          );
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(t('reservation_routes_failed', { error: routesError.message }));
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
              ? t('reservation_db_error', { code: error.code || 'N/A' })
              : t('reservation_fetch_failed', { error: error.message })
          );
        }
      } finally {
        setLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };
    fetchInitialData();
  }, [navigate, retryCount, t]);
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
              price,
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
          throw new Error(t('reservation_reservations_failed', { error: reservationError.message }));
        }
        if (!reservationData || reservationData.length === 0) {
          setReservations([]);
          return;
        }
        const uniqueReservations = Array.from(new Map(reservationData.map(r => [r.id, r])).values());
        const uniqueRouteIds = [...new Set(uniqueReservations.map(r => r.route_id))];
        const passengersPromises = uniqueRouteIds.map(async (routeId) => {
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
            .eq('route_id', routeId)
            .eq('company_id', companyId)
            .eq('agency_id', selectedAgencyId)
            .order('created_at', { ascending: true });
          if (assignmentError) {
            throw new Error(t('reservation_passenger_assignments_failed', { id: routeId, error: assignmentError.message }));
          }
          return { routeId, assignmentData };
        });
        const passengersResults = await Promise.all(passengersPromises);
        const passengersMap = new Map(passengersResults.map(({ routeId, assignmentData }) => [routeId, assignmentData]));
        const uniquePassengerIds = new Set();
        passengersResults.forEach(({ assignmentData }) => {
          assignmentData.forEach(assignment => {
            if (assignment.passenger_id) uniquePassengerIds.add(assignment.passenger_id);
          });
        });
        let profilesMap = new Map();
        if (uniquePassengerIds.size > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, government_id_front, government_id_back')
            .in('id', [...uniquePassengerIds]);
          if (profilesError) {
            logError('ProfilesBulkFetch', profilesError);
          } else {
            profilesMap = new Map(profilesData.map(p => [p.id, p]));
          }
        }
        const reservationPromises = uniqueReservations.map(async (reservation) => {
          const assignmentData = passengersMap.get(reservation.route_id) || [];
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
          let passengers = assignmentData.map((assignment, index) => {
            const profile = profilesMap.get(assignment.passenger_id) || {};
            return {
              passengerIndex: (index + 1).toString(),
              fullName: assignment.name || 'Unknown',
              phoneNumber: assignment.phone_number || 'Unknown',
              seatNumber: Array.isArray(assignment.seat_number) && assignment.seat_number.length > 0 ? assignment.seat_number.join(', ') : 'None',
              passengerNumber: assignment.passenger_number?.toString() || 'Unknown',
              paymentStatus: assignment.payment_status || 'Unknown',
              identityCardVerified: profile.government_id_front || profile.government_id_back ? 'Confirmed' : 'No',
              reservationDateTime: assignment.reservation_date_time ? new Date(assignment.reservation_date_time).toLocaleString() : 'Unknown',
              isOnline: assignment.is_online ? 'Yes' : 'No',
              passengerAssignmentCreatedAt: assignment.created_at ? new Date(assignment.created_at).toLocaleString() : 'Unknown',
              passengerId: assignment.passenger_id || 'Unknown',
            };
          });
          passengers = Array.from(new Map(passengers.map(p => [p.passengerIndex, p])).values());
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
            price: reservation.routes.price || 0,
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
        const grouped = formattedReservations.reduce((acc, res) => {
          const key = res.routeId;
          if (!acc.has(key)) {
            acc.set(key, {
              routeId: key,
              agency: res.agency,
              arrivalAgency: res.arrivalAgency,
              origin: res.origin,
              destination: res.destination,
              departureTime: res.departureTime,
              arrivalTime: res.arrivalTime,
              busType: res.busType,
              busPlate: res.busPlate,
              price: res.price,
              passengerCount: 0,
              reservationStatus: res.reservationStatus,
              paymentStatus: res.paymentStatus,
              isOnline: res.isOnline,
              passengers: [],
              uniquePassengerIds: new Set(),
            });
          }
          const group = acc.get(key);
          res.passengers.forEach(p => {
            if (p.passengerId !== 'Unknown') group.uniquePassengerIds.add(p.passengerId);
          });
          if (group.passengers.length === 0) {
            group.passengers = res.passengers;
          }
          group.passengerCount = group.uniquePassengerIds.size;
          return acc;
        }, new Map());
        const groupedReservations = Array.from(grouped.values());
        setReservations(groupedReservations);
        logSuccess('ReservationsFetch', 'Reservations fetched successfully', {
          userId,
          reservationCount: groupedReservations.length,
          agencyId: selectedAgencyId,
          routeId: selectedRouteId || 'All',
        });
      } catch (error) {
        logError('ReservationsFetch', error, { userId: session?.user?.id });
        setError(
          error.message.includes('infinite recursion') || error.message.includes('timeout')
            ? t('reservation_db_error', { code: error.code || 'N/A' })
            : t('reservation_reservations_failed', { error: error.message })
        );
      } finally {
        setLoading(false);
        logSuccess('ReservationsFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };
    fetchReservations();
  }, [companyId, userRole, selectedAgencyId, selectedRouteId, refreshKey, t]);
  const busMap = useMemo(() => {
    return buses.reduce((acc, bus) => {
      acc[bus.id] = bus;
      return acc;
    }, {});
  }, [buses]);
  const getAvailableTimeSlots = useMemo(() => {
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
  }, [newBooking.origin, newBooking.destination, newBooking.departureDate, routes]);
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
        toast.error(t('reservation_no_permission_create'));
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error(t('reservation_login_required'));
          navigate('/application/login');
          return;
        }
        if (!newBooking.fullName.trim()) {
          throw new Error(t('reservation_full_name_required'));
        }
        if (!validatePhoneNumber(newBooking.phoneNumber)) {
          throw new Error(t('reservation_invalid_phone'));
        }
        if (!newBooking.seatNumber.match(/^[1-9][0-9]?$/)) {
          throw new Error(t('reservation_invalid_seat'));
        }
        if (!newBooking.departureDate || !newBooking.departureTime) {
          throw new Error(t('reservation_departure_required'));
        }
        if (!newBooking.reservationDate || !newBooking.reservationTime) {
          throw new Error(t('reservation_reservation_required'));
        }
        const departureDateTime = new Date(`${newBooking.departureDate}T${newBooking.departureTime}`);
        const reservationDateTime = new Date(`${newBooking.reservationDate}T${newBooking.reservationTime}`);
        const now = new Date();
        if (departureDateTime <= now) {
          throw new Error(t('reservation_past_trip'));
        }
        if (reservationDateTime >= departureDateTime) {
          throw new Error(t('reservation_reservation_before_departure'));
        }
        if (reservationDateTime > now) {
          throw new Error(t('reservation_reservation_no_future'));
        }
        const tripExists = routes.find(
          (route) =>
            route.origin === newBooking.origin &&
            route.destination === newBooking.destination &&
            route.trip_date === newBooking.departureDate &&
            route.departure_time === newBooking.departureTime
        );
        if (!tripExists) {
          throw new Error(t('reservation_no_trip_exists', { origin: newBooking.origin, destination: newBooking.destination, date: newBooking.departureDate, time: newBooking.departureTime }));
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
          throw new Error(t('reservation_seat_taken'));
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
          throw new Error(t('reservation_no_seats'));
        }
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .insert({
            route_id: tripExists.id,
            user_id: user.id,
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
        if (reservationError) throw new Error(t('reservation_insert_failed', { error: reservationError.message }));
        const { data: passengerData, error: passengerError } = await supabase
          .from('passenger_assignments')
          .insert({
            route_id: tripExists.id,
            passenger_id: user.id,
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
        if (passengerError) throw new Error(t('reservation_passenger_insert_failed', { error: passengerError.message }));
        toast.success(t('reservation_booking_added'));
      } catch (error) {
        logError('AddBooking', error);
        toast.error(
          error.message.includes('infinite recursion') || error.message.includes('timeout')
            ? t('reservation_db_error', { code: error.code || 'N/A' })
            : error.message
        );
      } finally {
        setShowAddBookingForm(false);
        setRefreshKey((prev) => prev + 1);
      }
    },
    [newBooking, routes, selectedAgencyId, reservations, validatePhoneNumber, companyId, userRole, t, navigate]
  );
  const exportToPDF = useCallback(() => {
    if (!roleMatrix[userRole]?.canGenerateReports) {
      toast.error(t('reservation_no_permission_export'));
      return;
    }
    try {
      if (!exportRouteId) {
        toast.error(t('reservation_export_required'));
        return;
      }
      const selectedRoute = routes.find((r) => r.id === exportRouteId);
      if (!selectedRoute) {
        toast.error('Selected route not found');
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
      doc.text(t('reservation_pdf_title'), 14, 25);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(t('reservation_pdf_route', { origin: selectedRoute.origin, destination: selectedRoute.destination }), 14, 32);
      doc.text(t('reservation_pdf_trip_date', { period: selectedRoute.trip_date }), 14, 38);
      doc.text(t('reservation_pdf_generated', { date: currentDate }), 14, 44);
      doc.text(t('reservation_pdf_company', { companyName }), 14, 50);
      // Summary
      const selectedGroup = reservations.find(
        (group) =>
          group.routeId === exportRouteId
      );
      const totalReservations = selectedGroup ? selectedGroup.passengers.length : 0;
      const totalPassengers = selectedGroup ? selectedGroup.passengerCount : 0;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text(t('reservation_pdf_summary'), 14, 60);
      doc.setFont('Helvetica', 'normal');
      doc.text(t('reservation_pdf_total_res', { count: totalReservations }), 14, 66);
      doc.text(t('reservation_pdf_total_pass', { count: totalPassengers }), 14, 72);
      // Passenger Table
      const reservationTableData = selectedGroup ? selectedGroup.passengers.map((passenger) => [
        passenger.passengerIndex,
        passenger.fullName,
        selectedGroup.agency,
        selectedGroup.arrivalAgency,
        selectedGroup.origin,
        selectedGroup.destination,
        selectedGroup.departureTime,
        selectedGroup.busType,
        selectedGroup.busPlate,
        selectedGroup.price,
        passenger.phoneNumber,
        passenger.seatNumber,
        passenger.paymentStatus,
        passenger.identityCardVerified,
        passenger.reservationDateTime,
        passenger.isOnline,
      ]) : [];
      doc.autoTable({
        head: [translations[language].reservation_pdf_headers],
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
          8: { cellWidth: 20 }, // License Plate
          9: { cellWidth: 15 }, // Price
          10: { cellWidth: 20 }, // Phone Number
          11: { cellWidth: 15 }, // Seat Number
          12: { cellWidth: 15 }, // Payment Status
          13: { cellWidth: 15 }, // Government ID
          14: { cellWidth: 20 }, // Reservation Date
          15: { cellWidth: 15 }, // Booking Type
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
      doc.save(`passenger_verification_${selectedRoute.origin}_${selectedRoute.destination}_${selectedRoute.trip_date}_${new Date().toISOString()}.pdf`);
      toast.success(t('reservation_pdf_exported'));
    } catch (error) {
      logError('ExportToPDF', error);
      toast.error(t('reservation_pdf_failed'));
    }
  }, [reservations, exportRouteId, routes, userRole, language, t]);
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
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      onClick={() => setShowAddBookingForm(false)}
    >
      <Card
        sx={{ width: '80%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', p: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <AddIcon sx={{ mr: 1 }} />
              {t('reservation_add_new_booking')}
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
                  label={t('reservation_select_origin')}
                  value={newBooking.origin}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, origin: e.target.value, departureDate: '', departureTime: '' })
                  }
                  required
                  helperText={t('reservation_select_origin')}
                  variant="outlined"
                >
                  <MenuItem value="" disabled>{t('reservation_select_origin')}</MenuItem>
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
                  label={t('reservation_select_destination')}
                  value={newBooking.destination}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, destination: e.target.value, departureDate: '', departureTime: '' })
                  }
                  required
                  helperText={t('reservation_select_destination')}
                  variant="outlined"
                >
                  <MenuItem value="" disabled>{t('reservation_select_destination')}</MenuItem>
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
                  label={t('reservation_departure_date')}
                  type="date"
                  value={newBooking.departureDate}
                  onChange={(e) => setNewBooking({ ...newBooking, departureDate: e.target.value, departureTime: '' })}
                  inputProps={{ min: today }}
                  required
                  helperText={t('reservation_departure_date')}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label={t('reservation_departure_time')}
                  value={newBooking.departureTime}
                  onChange={(e) => setNewBooking({ ...newBooking, departureTime: e.target.value })}
                  required
                  disabled={!newBooking.departureDate || getAvailableTimeSlots.length === 0}
                  helperText={
                    newBooking.departureDate && getAvailableTimeSlots.length === 0
                      ? t('reservation_no_time_slots')
                      : t('reservation_departure_time')
                  }
                  variant="outlined"
                  error={newBooking.departureDate && getAvailableTimeSlots.length === 0}
                >
                  <MenuItem value="" disabled>{t('reservation_select_time')}</MenuItem>
                  {getAvailableTimeSlots.map((time) => (
                    <MenuItem key={time} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('reservation_full_name')}
                  value={newBooking.fullName}
                  onChange={(e) => setNewBooking({ ...newBooking, fullName: e.target.value })}
                  placeholder={t('reservation_enter_full_name')}
                  required
                  helperText={t('reservation_passenger_full_name')}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('reservation_phone_number')}
                  value={newBooking.phoneNumber}
                  onChange={(e) => setNewBooking({ ...newBooking, phoneNumber: e.target.value })}
                  placeholder="+2376xxxxxxxx"
                  required
                  helperText={t('reservation_enter_phone')}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('reservation_seat_number')}
                  value={newBooking.seatNumber}
                  onChange={(e) => setNewBooking({ ...newBooking, seatNumber: e.target.value })}
                  placeholder={t('reservation_enter_seat')}
                  required
                  helperText={t('reservation_seat_helper')}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label={t('reservation_payment_status')}
                  value={newBooking.paymentStatus}
                  onChange={(e) => setNewBooking({ ...newBooking, paymentStatus: e.target.value })}
                  required
                  helperText={t('reservation_select_payment')}
                  variant="outlined"
                >
                  <MenuItem value="Paid">{t('reservation_paid')}</MenuItem>
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
                  label={t('reservation_id_verified')}
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
                  label={t('reservation_online_booking_label')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('reservation_reservation_date_label')}
                  type="date"
                  value={newBooking.reservationDate}
                  onChange={(e) => setNewBooking({ ...newBooking, reservationDate: e.target.value })}
                  inputProps={{ max: today }}
                  required
                  helperText={t('reservation_reservation_date_label')}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label={t('reservation_reservation_time')}
                  value={newBooking.reservationTime}
                  onChange={(e) => setNewBooking({ ...newBooking, reservationTime: e.target.value })}
                  required
                  helperText={t('reservation_select_reservation_time')}
                  variant="outlined"
                >
                  <MenuItem value="" disabled>{t('reservation_select_time')}</MenuItem>
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
                  {t('reservation_add')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowAddBookingForm(false)}
                >
                  {t('reservation_cancel')}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
  const uniqueOrigins = useMemo(() => [...new Set(routes.map((route) => route.origin).filter(Boolean))].sort(), [routes]);
  const uniqueDestinations = useMemo(() => [...new Set(routes.map((route) => route.destination).filter(Boolean))].sort(), [routes]);
  const uniqueRoutes = useMemo(() =>
    routes
      .filter((route) => route.departure_agency_id === selectedAgencyId || route.arrival_agency_id === selectedAgencyId)
      .map((route) => {
        const bus = busMap[route.bus_id];
        const busInfo = bus ? `${bus.bus_type} (${bus.license_plate})` : 'Unknown Bus';
        return {
          id: route.id,
          name: `${route.origin} to ${route.destination} - ${busInfo}`,
        };
      }),
  [routes, selectedAgencyId, busMap]);
  const uniqueExportRoutes = useMemo(() =>
    routes.map((route) => {
      const bus = busMap[route.bus_id];
      const busInfo = bus ? `${bus.bus_type} (${bus.license_plate})` : 'Unknown Bus';
      return {
        id: route.id,
        name: `${route.origin} to ${route.destination} - ${busInfo} - ${route.trip_date} at ${route.departure_time}`,
      };
    }),
  [routes, busMap]);
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress aria-label={t('reservation_loading')} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {t('reservation_loading')}
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
              {t('reservation_error')}: {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              {t('reservation_retry')}
            </Button>
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
            <Breadcrumb title={t('reservation_tracking')} language={language} setLanguage={setLanguage} />
            <Typography variant="h6" color="error">
              {t('reservation_no_agencies')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('reservation_contact_support')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 2 }}
            >
              {t('reservation_return_dashboard')}
            </Button>
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
          <Breadcrumb title={t('reservation_tracking')} language={language} setLanguage={setLanguage} />
          <Card>
            <CardHeader
              title={
                <Typography variant="h6">
                  {t('reservation_tracking')} - {agencies.find((a) => a.id === selectedAgencyId)?.name || 'Unknown Agency'}
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
                    <MenuItem value="" disabled>{t('reservation_select_agency')}</MenuItem>
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
                    <MenuItem value="">{t('reservation_select_route')}</MenuItem>
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
                    {t('reservation_add_booking')}
                  </Button>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {t('reservation_error')}: {error}
                </Alert>
              )}
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label={t('reservation_export_route')}
                    value={exportRouteId}
                    onChange={(e) => setExportRouteId(e.target.value)}
                    variant="outlined"
                    helperText={t('reservation_select_route_export')}
                    InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                  >
                    <MenuItem value="" disabled>{t('reservation_select_route_export')}</MenuItem>
                    {uniqueExportRoutes.map((route) => (
                      <MenuItem key={route.id} value={route.id}>
                        {route.name}
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
                    {t('reservation_export_pdf')}
                  </Button>
                </Grid>
              </Grid>
              <TableContainer component={Paper}>
                <Table aria-label="Reservation Table">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_departure_agency')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_arrival_agency')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_origin')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_destination')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_departure')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_arrival')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_bus_type')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_price')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_passenger_count')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_reservation_status')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_payment_status')}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{t('reservation_online_booking')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} align="center">
                          {t('reservation_no_reservations')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      reservations.map((group) => (
                        <React.Fragment key={group.routeId}>
                          <TableRow>
                            <TableCell>{group.agency}</TableCell>
                            <TableCell>{group.arrivalAgency}</TableCell>
                            <TableCell>{group.origin}</TableCell>
                            <TableCell>{group.destination}</TableCell>
                            <TableCell>{group.departureTime}</TableCell>
                            <TableCell>{group.arrivalTime}</TableCell>
                            <TableCell>{group.busType}</TableCell>
                            <TableCell>{group.price}</TableCell>
                            <TableCell>{group.passengerCount}</TableCell>
                            <TableCell>{group.reservationStatus}</TableCell>
                            <TableCell>{group.paymentStatus}</TableCell>
                            <TableCell>{group.isOnline}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={12} sx={{ backgroundColor: 'grey.100' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>{t('reservation_passenger_index')}</TableCell>
                                    <TableCell>{t('reservation_full_name')}</TableCell>
                                    <TableCell>{t('reservation_phone_number')}</TableCell>
                                    <TableCell>{t('reservation_seat_number')}</TableCell>
                                    <TableCell>{t('reservation_passenger_number')}</TableCell>
                                    <TableCell>{t('reservation_payment_status')}</TableCell>
                                    <TableCell>{t('reservation_government_id')}</TableCell>
                                    <TableCell>{t('reservation_reservation_date')}</TableCell>
                                    <TableCell>{t('reservation_online_booking')}</TableCell>
                                    <TableCell>{t('reservation_passenger_created')}</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {group.passengers.map((passenger) => (
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
      </ErrorBoundary>
    </ThemeProvider>
  );
};
export default ReservationTracking;