import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Grid,
  Typography,
  Button,
  TextField,
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
  CssBaseline,
  CircularProgress,
  Chip,
  Select,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsBus as DirectionsBusIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Build as BuildIcon,
  LocalOffer as LocalOfferIcon,
  ArrowUpward as ElevateIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Breadcrumb from 'component/Breadcrumb';
import { gridSpacing } from 'config.js';
import { supabase } from './supabase';

// Translations
const translations = {
  en: {
    bus_error: 'Error',
    bus_unknownError: 'Unknown error: {error}',
    bus_refreshOrContact: 'Please refresh the page or contact support.',
    bus_loginRequired: 'Please login to continue.',
    bus_userFetchError: 'Failed to fetch user data: {error}',
    bus_noPermission: 'You do not have permission to access this page.',
    bus_noCompany: 'No associated company found.',
    bus_companyFetchError: 'Failed to fetch company data: {error}',
    bus_agencyFetchError: 'Failed to fetch agencies: {error}',
    bus_userAgenciesFetchError: 'Failed to fetch user agencies: {error}',
    bus_fetchError: 'Failed to fetch buses: {error}',
    bus_fetchFailed: 'Failed to fetch data.',
    bus_elevationRestricted: 'Elevation is only available for Agent Supervisors.',
    bus_elevationActive: 'Temporary elevation is already active.',
    bus_elevationError: 'Failed to elevate role: {error}',
    bus_elevationSuccess: 'Role elevated to Operations Manager for 24 hours.',
    bus_elevationFailed: 'Failed to elevate role: {error}',
    bus_noPermissionCreate: 'You do not have permission to create buses.',
    bus_invalidData: 'Invalid bus data. Please check all fields.',
    bus_duplicateBus: 'Duplicate bus number or license plate.',
    bus_addError: 'Failed to add bus: {error}',
    bus_addSuccess: 'Bus added successfully.',
    bus_addFailed: 'Failed to add bus.',
    bus_noPermissionDelete: 'You do not have permission to delete buses.',
    bus_confirmDelete: 'Are you sure you want to delete this bus?',
    bus_deleteError: 'Failed to delete bus: {error}',
    bus_deleteSuccess: 'Bus deleted successfully.',
    bus_deleteFailed: 'Failed to delete bus.',
    bus_noPermissionUpdate: 'You do not have permission to update buses.',
    bus_updateError: 'Failed to update bus: {error}',
    bus_updateSuccess: 'Bus updated successfully.',
    bus_updateFailed: 'Failed to update bus.',
    bus_editTitle: 'Edit Bus: {number}',
    bus_addTitle: 'Add New Bus',
    bus_update: 'Update',
    bus_add: 'Add',
    bus_help: 'Help',
    bus_editHelp: 'Editing bus {number}. Update fields as needed.',
    bus_details: 'Bus Details',
    bus_number: 'Bus Number',
    bus_numberPlaceholder: 'Enter bus number',
    bus_numberHelper: 'Unique identifier for the bus',
    bus_model: 'Model',
    bus_modelPlaceholder: 'Enter model',
    bus_modelHelper: 'Bus model name',
    bus_capacity: 'Capacity',
    bus_capacityPlaceholder: 'Enter capacity',
    bus_capacityHelper: 'Number of seats',
    bus_licensePlate: 'License Plate',
    bus_licensePlatePlaceholder: 'Enter license plate',
    bus_licensePlateHelper: 'License plate number',
    bus_type: 'Bus Type',
    bus_typeHelper: 'Select bus type',
    bus_typeStandard: 'Standard',
    bus_typeVIP: 'VIP',
    bus_typeVVIP: 'VVIP',
    bus_amenities: 'Amenities',
    bus_noAmenities: 'None',
    bus_agency: 'Agency',
    bus_selectAgency: 'Select Agency',
    bus_agencyHelper: 'Assign to an agency',
    bus_driverAssignment: 'Driver Assignment',
    bus_driver: 'Driver',
    bus_driverPlaceholder: 'Enter driver name',
    bus_driverHelper: 'Assigned driver',
    bus_status: 'Status',
    bus_statusHelper: 'Bus status',
    bus_statusActive: 'Active',
    bus_statusMaintenance: 'Maintenance',
    bus_cancel: 'Cancel',
    loading: 'Loading...',
    bus_errorInstructions: 'If the problem persists, contact support.',
    bus_createCompany: 'Create Company',
    bus_pageTitle: 'Bus Management',
    bus_temporaryRole: 'Temporary Role (Expires: {date})',
    bus_requestElevation: 'Request Elevation',
    bus_addBus: 'Add Bus',
    bus_noBuses: 'No buses found.',
    bus_table: 'Buses Table',
    bus_actions: 'Actions',
    bus_row: 'Bus {number}',
    bus_edit: 'Edit',
    bus_delete: 'Delete',
  },
  fr: {
    bus_error: 'Erreur',
    bus_unknownError: 'Erreur inconnue : {error}',
    bus_refreshOrContact: 'Veuillez rafraîchir la page ou contacter le support.',
    bus_loginRequired: 'Veuillez vous connecter pour continuer.',
    bus_userFetchError: 'Échec de la récupération des données utilisateur : {error}',
    bus_noPermission: "Vous n'avez pas la permission d'accéder à cette page.",
    bus_noCompany: 'Aucune entreprise associée trouvée.',
    bus_companyFetchError: 'Échec de la récupération des données de l\'entreprise : {error}',
    bus_agencyFetchError: 'Échec de la récupération des agences : {error}',
    bus_userAgenciesFetchError: 'Échec de la récupération des agences utilisateur : {error}',
    bus_fetchError: 'Échec de la récupération des bus : {error}',
    bus_fetchFailed: 'Échec de la récupération des données.',
    bus_elevationRestricted: 'L\'élévation est disponible uniquement pour les Superviseurs d\'Agents.',
    bus_elevationActive: 'L\'élévation temporaire est déjà active.',
    bus_elevationError: 'Échec de l\'élévation du rôle : {error}',
    bus_elevationSuccess: 'Rôle élevé à Gestionnaire des Opérations pour 24 heures.',
    bus_elevationFailed: 'Échec de l\'élévation du rôle : {error}',
    bus_noPermissionCreate: "Vous n'avez pas la permission de créer des bus.",
    bus_invalidData: 'Données de bus invalides. Veuillez vérifier tous les champs.',
    bus_duplicateBus: 'Numéro de bus ou plaque d\'immatriculation en double.',
    bus_addError: 'Échec de l\'ajout du bus : {error}',
    bus_addSuccess: 'Bus ajouté avec succès.',
    bus_addFailed: 'Échec de l\'ajout du bus.',
    bus_noPermissionDelete: "Vous n'avez pas la permission de supprimer des bus.",
    bus_confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce bus ?',
    bus_deleteError: 'Échec de la suppression du bus : {error}',
    bus_deleteSuccess: 'Bus supprimé avec succès.',
    bus_deleteFailed: 'Échec de la suppression du bus.',
    bus_noPermissionUpdate: "Vous n'avez pas la permission de mettre à jour des bus.",
    bus_updateError: 'Échec de la mise à jour du bus : {error}',
    bus_updateSuccess: 'Bus mis à jour avec succès.',
    bus_updateFailed: 'Échec de la mise à jour du bus.',
    bus_editTitle: 'Modifier le Bus : {number}',
    bus_addTitle: 'Ajouter un Nouveau Bus',
    bus_update: 'Mettre à jour',
    bus_add: 'Ajouter',
    bus_help: 'Aide',
    bus_editHelp: 'Modification du bus {number}. Mettez à jour les champs si nécessaire.',
    bus_details: 'Détails du Bus',
    bus_number: 'Numéro du Bus',
    bus_numberPlaceholder: 'Entrez le numéro du bus',
    bus_numberHelper: 'Identifiant unique pour le bus',
    bus_model: 'Modèle',
    bus_modelPlaceholder: 'Entrez le modèle',
    bus_modelHelper: 'Nom du modèle du bus',
    bus_capacity: 'Capacité',
    bus_capacityPlaceholder: 'Entrez la capacité',
    bus_capacityHelper: 'Nombre de sièges',
    bus_licensePlate: 'Plaque d\'Immatriculation',
    bus_licensePlatePlaceholder: 'Entrez la plaque d\'immatriculation',
    bus_licensePlateHelper: 'Numéro de plaque d\'immatriculation',
    bus_type: 'Type de Bus',
    bus_typeHelper: 'Sélectionnez le type de bus',
    bus_typeStandard: 'Standard',
    bus_typeVIP: 'VIP',
    bus_typeVVIP: 'VVIP',
    bus_amenities: 'Équipements',
    bus_noAmenities: 'Aucun',
    bus_agency: 'Agence',
    bus_selectAgency: 'Sélectionnez l\'Agence',
    bus_agencyHelper: 'Assigner à une agence',
    bus_driverAssignment: 'Assignation du Conducteur',
    bus_driver: 'Conducteur',
    bus_driverPlaceholder: 'Entrez le nom du conducteur',
    bus_driverHelper: 'Conducteur assigné',
    bus_status: 'Statut',
    bus_statusHelper: 'Statut du bus',
    bus_statusActive: 'Actif',
    bus_statusMaintenance: 'Maintenance',
    bus_cancel: 'Annuler',
    loading: 'Chargement...',
    bus_errorInstructions: 'Si le problème persiste, contactez le support.',
    bus_createCompany: 'Créer une Entreprise',
    bus_pageTitle: 'Gestion des Bus',
    bus_temporaryRole: 'Rôle Temporaire (Expire : {date})',
    bus_requestElevation: 'Demander Élévation',
    bus_addBus: 'Ajouter un Bus',
    bus_noBuses: 'Aucun bus trouvé.',
    bus_table: 'Table des Bus',
    bus_actions: 'Actions',
    bus_row: 'Bus {number}',
    bus_edit: 'Modifier',
    bus_delete: 'Supprimer',
  },
};

// Breadcrumb Component
const CustomBreadcrumb = ({ title, children, language, setLanguage }) => (
  <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <DirectionsBusIcon sx={{ mr: 1, color: 'primary.main' }} />
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
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {this.props.t('bus_error')}: {this.state.error?.message || this.props.t('bus_unknownError', { error: 'Unknown' })}
          </Typography>
          <Typography variant="body2">
            {this.props.t('bus_refreshOrContact')}
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

const logSuccess = (context, message, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${context}:`, {
    message,
    ...additionalInfo,
  });
};

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canAssignAgency: true,
  },
  'Operations Manager': {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canAssignAgency: true,
  },
  'Agent Supervisor': {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canAssignAgency: false,
  },
  'Ticketing Agent': {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canAssignAgency: false,
  },
};

const BusManagement = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('fr');
  const [buses, setBuses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [newBus, setNewBus] = useState({
    number: '',
    model: '',
    capacity: '',
    licensePlate: '',
    driver: '',
    status: 'Active',
    busType: 'Standard',
    amenities: [],
    agency_id: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isTemporaryRole, setIsTemporaryRole] = useState(false);
  const [temporaryRoleExpiry, setTemporaryRoleExpiry] = useState(null);
  const [agencies, setAgencies] = useState([]);

  // Define amenities for each bus type
  const busAmenities = useMemo(() => ({
    Standard: [],
    VIP: ['AC', 'Charge Port', 'Wi-Fi'],
    VVIP: ['AC', 'Charge Port', 'Wi-Fi', 'Toilets', 'Snacks'],
  }), []);

  const t = useCallback((key, params = {}) => {
    let text = translations[language][key] || key;
    for (const param in params) {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }
    return text;
  }, [language]);

  const withTimeout = async (promise, ms = 10000) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    );
    return Promise.race([promise, timeout]);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw sessionError;
        if (!session) {
          logError('AuthCheck', new Error('No active session'), {});
          toast.error(t('bus_loginRequired'));
          navigate('/application/login');
          return;
        }

        // Fetch user role from users table
        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('user_id, role, temporary_role, temporary_role_expiry, company_id')
          .eq('user_id', session.user.id)
          .single();
        if (userRowError) throw new Error(t('bus_userFetchError', { error: userRowError.message }));

        const now = new Date();
        const isTemp = userRow.temporary_role && userRow.temporary_role_expiry && new Date(userRow.temporary_role_expiry) > now;
        const activeRole = isTemp ? userRow.temporary_role : userRow.role;
        setUserRole(activeRole);
        setIsTemporaryRole(isTemp);
        setTemporaryRoleExpiry(isTemp ? userRow.temporary_role_expiry : null);

        // Check if user has view permission
        if (!roleMatrix[activeRole]?.canView) {
          throw new Error(t('bus_noPermission'));
        }

        // Fetch company for the authenticated user
        let companyIdToUse = userRow.company_id;
        if (!companyIdToUse) {
          const { data: companyData, error: companyError } = await supabase
            .from('transport_companies')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
          if (companyError) {
            if (companyError.code === 'PGRST116') {
              throw new Error(t('bus_noCompany'));
            }
            throw new Error(t('bus_companyFetchError', { error: companyError.message }));
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        // Fetch agencies for agency assignment if allowed
        if (roleMatrix[activeRole]?.canAssignAgency) {
          const { data: agenciesData, error: agenciesError } = await supabase
            .from('agencies')
            .select('id, name')
            .eq('company_id', companyIdToUse);
          if (agenciesError) throw new Error(t('bus_agencyFetchError', { error: agenciesError.message }));
          setAgencies(agenciesData || []);
        }

        let query = supabase.from('buses').select('*').eq('company_id', companyIdToUse);
        if (activeRole === 'Ticketing Agent') {
          const { data: userAgencies, error: agencyError } = await supabase
            .from('user_agencies')
            .select('agency_id')
            .eq('user_id', session.user.id);
          if (agencyError) throw new Error(t('bus_userAgenciesFetchError', { error: agencyError.message }));
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          if (agencyIds.length > 0) {
            query = query.in('agency_id', agencyIds);
          }
        }
        const { data: busesData, error: busesError } = await query;
        if (busesError) throw new Error(t('bus_fetchError', { error: busesError.message }));
        setBuses(busesData || []);
        logSuccess('DataFetch', 'Buses fetched successfully', {
          userId: session.user.id,
          companyId: companyIdToUse,
          busCount: busesData.length,
          role: activeRole,
        });
      } catch (err) {
        logError('DataFetch', err);
        toast.error(err.message || t('bus_fetchFailed'));
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate, t]);

  const requestElevation = async () => {
    try {
      if (userRole !== 'Agent Supervisor') {
        toast.error(t('bus_elevationRestricted'));
        return;
      }
      if (isTemporaryRole) {
        toast.warn(t('bus_elevationActive'));
        return;
      }
      const elevatedRole = 'Operations Manager';
      const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const { error: roleError } = await supabase
        .from('users')
        .update({
          temporary_role: elevatedRole,
          temporary_role_expiry: endTime.toISOString(),
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user.id);
      if (roleError) throw new Error(t('bus_elevationError', { error: roleError.message }));
      setUserRole(elevatedRole);
      setIsTemporaryRole(true);
      setTemporaryRoleExpiry(endTime);
      toast.success(t('bus_elevationSuccess'));
    } catch (error) {
      logError('ElevationRequest', error);
      toast.error(t('bus_elevationFailed', { error: error.message }));
    }
  };

  const validateBusData = (data) => {
    const capacity = parseInt(data.capacity);
    return (
      data.number.trim() &&
      data.model.trim() &&
      data.licensePlate.trim() &&
      data.driver.trim() &&
      !isNaN(capacity) &&
      capacity > 0 &&
      (roleMatrix[userRole]?.canAssignAgency ? !!data.agency_id : true)
    );
  };

  const addBus = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canCreate) {
      toast.error(t('bus_noPermissionCreate'));
      return;
    }
    if (!validateBusData(newBus)) {
      toast.error(t('bus_invalidData'));
      return;
    }

    try {
      if (!companyId) {
        throw new Error(t('bus_noCompany'));
      }
      const bus = {
        number: newBus.number,
        model: newBus.model,
        capacity: parseInt(newBus.capacity),
        license_plate: newBus.licensePlate,
        driver: newBus.driver,
        status: newBus.status,
        bus_type: newBus.busType,
        company_id: companyId,
        amenities: busAmenities[newBus.busType],
        agency_id: roleMatrix[userRole]?.canAssignAgency ? newBus.agency_id : null,
      };
      const { data, error } = await supabase.from('buses').insert(bus).select().single();
      if (error) {
        if (error.code === '23505') {
          throw new Error(t('bus_duplicateBus'));
        }
        throw new Error(t('bus_addError', { error: error.message }));
      }
      setBuses([...buses, data]);
      setShowAddForm(false);
      setNewBus({
        number: '',
        model: '',
        capacity: '',
        licensePlate: '',
        driver: '',
        status: 'Active',
        busType: 'Standard',
        amenities: [],
        agency_id: null,
      });
      logSuccess('BusAdd', 'Bus added successfully', { busId: data.id });
      toast.success(t('bus_addSuccess'));
    } catch (error) {
      logError('BusAdd', error);
      toast.error(error.message || t('bus_addFailed'));
    }
  };

  const deleteBus = async (id) => {
    if (!roleMatrix[userRole]?.canDelete) {
      toast.error(t('bus_noPermissionDelete'));
      return;
    }
    if (!window.confirm(t('bus_confirmDelete'))) return;
    try {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw new Error(t('bus_deleteError', { error: error.message }));
      setBuses(buses.filter((bus) => bus.id !== id));
      logSuccess('BusDelete', 'Bus deleted successfully', { busId: id });
      toast.success(t('bus_deleteSuccess'));
    } catch (error) {
      logError('BusDelete', error);
      toast.error(error.message || t('bus_deleteFailed'));
    }
  };

  const startEdit = (bus) => {
    if (!roleMatrix[userRole]?.canUpdate) {
      toast.error(t('bus_noPermissionUpdate'));
      return;
    }
    logSuccess('BusEdit', 'Starting edit for bus', { busId: bus.id });
    setEditBus({
      ...bus,
      capacity: bus.capacity.toString(),
      licensePlate: bus.license_plate,
      busType: bus.bus_type,
      amenities: bus.amenities || busAmenities[bus.bus_type],
      agency_id: bus.agency_id || null,
    });
    setShowEditForm(true);
    setShowHelp(false);
  };

  const updateBus = async (e) => {
    e.preventDefault();
    if (!roleMatrix[userRole]?.canUpdate) {
      toast.error(t('bus_noPermissionUpdate'));
      return;
    }
    if (!validateBusData(editBus)) {
      toast.error(t('bus_invalidData'));
      return;
    }
    try {
      const busUpdate = {
        number: editBus.number,
        model: editBus.model,
        capacity: parseInt(editBus.capacity),
        license_plate: editBus.licensePlate,
        driver: editBus.driver,
        status: editBus.status,
        bus_type: editBus.busType,
        amenities: busAmenities[editBus.busType],
        agency_id: roleMatrix[userRole]?.canAssignAgency ? editBus.agency_id : null,
      };
      const { data, error } = await supabase
        .from('buses')
        .update(busUpdate)
        .eq('id', editBus.id)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error(t('bus_duplicateBus'));
        }
        throw new Error(t('bus_updateError', { error: error.message }));
      }
      setBuses(buses.map((bus) => (bus.id === data.id ? data : bus)));
      setShowEditForm(false);
      setEditBus(null);
      setShowHelp(false);
      logSuccess('BusUpdate', 'Bus updated successfully', { busId: data.id });
      toast.success(t('bus_updateSuccess'));
    } catch (error) {
      logError('BusUpdate', error);
      toast.error(error.message || t('bus_updateFailed'));
    }
  };

  const renderForm = (isEdit = false) => {
    const busData = isEdit ? editBus : newBus;
    const setBusData = isEdit ? setEditBus : setNewBus;
    const handleSubmit = isEdit ? updateBus : addBus;
    const title = isEdit ? t('bus_editTitle', { number: busData.number || '' }) : t('bus_addTitle');
    const submitText = isEdit ? t('bus_update') : t('bus_add');
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
          '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
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
                  <EditIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                ) : (
                  <AddCircleOutlineIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
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
                  aria-label={t('bus_help')}
                >
                  {t('bus_help')}
                </Button>
              )
            }
          />
          <Divider />
          <CardContent>
            {isEdit && showHelp && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                {t('bus_editHelp', { number: editBus.number })}
              </Typography>
            )}
            <form onSubmit={handleSubmit}>
              <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DirectionsBusIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('bus_details')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('bus_number')}
                    value={busData.number}
                    onChange={(e) => setBusData({ ...busData, number: e.target.value })}
                    placeholder={t('bus_numberPlaceholder')}
                    required
                    helperText={t('bus_numberHelper')}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <ConfirmationNumberIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_number')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('bus_model')}
                    value={busData.model}
                    onChange={(e) => setBusData({ ...busData, model: e.target.value })}
                    placeholder={t('bus_modelPlaceholder')}
                    required
                    helperText={t('bus_modelHelper')}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <DirectionsBusIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_model')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('bus_capacity')}
                    type="number"
                    value={busData.capacity}
                    onChange={(e) => setBusData({ ...busData, capacity: e.target.value })}
                    placeholder={t('bus_capacityPlaceholder')}
                    required
                    helperText={t('bus_capacityHelper')}
                    variant="outlined"
                    inputProps={{ min: 1 }}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_capacity')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('bus_licensePlate')}
                    value={busData.licensePlate}
                    onChange={(e) => setBusData({ ...busData, licensePlate: e.target.value })}
                    placeholder={t('bus_licensePlatePlaceholder')}
                    required
                    helperText={t('bus_licensePlateHelper')}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <ConfirmationNumberIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_licensePlate')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label={t('bus_type')}
                    value={busData.busType}
                    onChange={(e) => setBusData({ ...busData, busType: e.target.value, amenities: busAmenities[e.target.value] })}
                    required
                    helperText={t('bus_typeHelper')}
                    variant="outlined"
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_type')}
                  >
                    <MenuItem value="Standard">{t('bus_typeStandard')}</MenuItem>
                    <MenuItem value="VIP">{t('bus_typeVIP')}</MenuItem>
                    <MenuItem value="VVIP">{t('bus_typeVVIP')}</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    {t('bus_amenities')}: {busData.amenities.length > 0 ? busData.amenities.join(', ') : t('bus_noAmenities')}
                  </Typography>
                </Grid>
                {roleMatrix[userRole]?.canAssignAgency && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label={t('bus_agency')}
                      value={busData.agency_id || ''}
                      onChange={(e) => setBusData({ ...busData, agency_id: e.target.value })}
                      required
                      helperText={t('bus_agencyHelper')}
                      variant="outlined"
                      aria-label={t('bus_agency')}
                    >
                      <MenuItem value="">{t('bus_selectAgency')}</MenuItem>
                      {agencies.map((agency) => (
                        <MenuItem key={agency.id} value={agency.id}>{agency.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('bus_driverAssignment')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('bus_driver')}
                    value={busData.driver}
                    onChange={(e) => setBusData({ ...busData, driver: e.target.value })}
                    placeholder={t('bus_driverPlaceholder')}
                    required
                    helperText={t('bus_driverHelper')}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_driver')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BuildIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('bus_status')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label={t('bus_status')}
                    value={busData.status}
                    onChange={(e) => setBusData({ ...busData, status: e.target.value })}
                    helperText={t('bus_statusHelper')}
                    variant="outlined"
                    sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                    aria-label={t('bus_status')}
                  >
                    <MenuItem value="Active">{t('bus_statusActive')}</MenuItem>
                    <MenuItem value="Maintenance">{t('bus_statusMaintenance')}</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isEdit ? !roleMatrix[userRole]?.canUpdate : !roleMatrix[userRole]?.canCreate}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                          transform: 'scale(1.05)',
                        },
                      }}
                      aria-label={submitText}
                    >
                      {submitText}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => (isEdit ? setShowEditForm(false) : setShowAddForm(false))}
                      sx={{
                        '&:hover': {
                          borderColor: theme.palette.error.main,
                          color: theme.palette.error.main,
                          transform: 'scale(1.05)',
                        },
                      }}
                      aria-label={t('bus_cancel')}
                    >
                      {t('bus_cancel')}
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress aria-label={t('loading')} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {t('bus_error', { error: error.message || t('bus_unknownError', { error: 'Unknown' }) })}
        </Typography>
        <Typography variant="body2">
          {t('bus_errorInstructions')}
        </Typography>
        {error.message.includes(t('bus_noCompany')) && (
          <Button
       
          >
            {t('bus_createCompany')}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary t={t}>
        <Box sx={{ p: 3 }}>
          <CustomBreadcrumb title={t('bus_pageTitle')} language={language} setLanguage={setLanguage}>
            <Typography
              variant="subtitle2"
              color="primary"
              className="link-breadcrumb"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <DirectionsBusIcon sx={{ mr: 1, fontSize: '1rem' }} />
              {t('bus_pageTitle')}
            </Typography>
          </CustomBreadcrumb>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                <CardHeader
                  title={
                    <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                      <DirectionsBusIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      {t('bus_pageTitle')}
                      {isTemporaryRole && (
                        <Chip
                          label={t('bus_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  }
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {userRole === 'Agent Supervisor' && !isTemporaryRole && (
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
                          aria-label={t('bus_requestElevation')}
                        >
                          {t('bus_requestElevation')}
                        </Button>
                      )}
                      {roleMatrix[userRole]?.canCreate && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => setShowAddForm(true)}
                          startIcon={<AddCircleOutlineIcon />}
                          sx={{
                            '&:hover': {
                              backgroundColor: theme.palette.primary.dark,
                              transform: 'scale(1.05)',
                            },
                          }}
                          aria-label={t('bus_addBus')}
                        >
                          {t('bus_addBus')}
                        </Button>
                      )}
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  {buses.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                      {t('bus_noBuses')}
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <Table aria-label={t('bus_table')}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ConfirmationNumberIcon sx={{ mr: 1 }} />
                                {t('bus_number')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DirectionsBusIcon sx={{ mr: 1 }} />
                                {t('bus_model')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1 }} />
                                {t('bus_capacity')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ConfirmationNumberIcon sx={{ mr: 1 }} />
                                {t('bus_licensePlate')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1 }} />
                                {t('bus_driver')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <BuildIcon sx={{ mr: 1 }} />
                                {t('bus_status')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocalOfferIcon sx={{ mr: 1 }} />
                                {t('bus_type')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <InfoIcon sx={{ mr: 1 }} />
                                {t('bus_amenities')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                {t('bus_actions')}
                              </Box>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {buses.map((bus) => (
                            <TableRow
                              key={bus.id}
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                },
                              }}
                              aria-label={t('bus_row', { number: bus.number })}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <ConfirmationNumberIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                  {bus.number}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <DirectionsBusIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                  {bus.model}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <PersonIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                  {bus.capacity}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <ConfirmationNumberIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                  {bus.license_plate}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <PersonIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                  {bus.driver}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: bus.status === 'Active' ? 'success.main' : 'warning.main',
                                    fontWeight: 'medium',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <BuildIcon sx={{ mr: 1 }} />
                                  {t(`bus_status${bus.status}`)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LocalOfferIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                  {t(`bus_type${bus.bus_type}`)}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                  {bus.amenities.length > 0 ? bus.amenities.join(', ') : t('bus_noAmenities')}
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                {roleMatrix[userRole]?.canUpdate && (
                                  <Tooltip title={t('bus_edit')}>
                                    <IconButton
                                      color="primary"
                                      onClick={() => startEdit(bus)}
                                      sx={{
                                        '&:hover': {
                                          transform: 'scale(1.1)',
                                        },
                                      }}
                                      aria-label={t('bus_edit', { number: bus.number })}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {roleMatrix[userRole]?.canDelete && (
                                  <Tooltip title={t('bus_delete')}>
                                    <IconButton
                                      color="error"
                                      onClick={() => deleteBus(bus.id)}
                                      sx={{
                                        '&:hover': {
                                          transform: 'scale(1.1)',
                                        },
                                      }}
                                      aria-label={t('bus_delete', { number: bus.number })}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {showAddForm && renderForm(false)}
          {showEditForm && editBus && renderForm(true)}
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default BusManagement;