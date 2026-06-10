import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress, Tooltip, IconButton, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, FormControl, Dialog,
  DialogTitle, DialogContent, DialogActions, Collapse, FormHelperText, Grid, Card, CardContent,
  Input, Chip, Menu, MenuItem, Select, InputLabel
} from '@mui/material';
import * as Yup from 'yup';
import { Formik } from 'formik';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopy from '@mui/icons-material/FileCopy';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import PublicIcon from '@mui/icons-material/Public';
import ImageIcon from '@mui/icons-material/Image';
import CancelIcon from '@mui/icons-material/Cancel';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from './supabase';

// Translations
const translations = {
  en: {
    company_error: 'Error',
    company_unknownError: 'Unknown error: {error}',
    company_errorDetails: 'Details: {details}',
    company_noDetails: 'No details available',
    company_contactSupport: 'Please contact support.',
    company_retry: 'Retry',
    company_refresh: 'Refresh Page',
    company_copyError: 'Copy Error Details',
    company_support: 'Support',
    company_networkError: 'Network Error',
    company_criticalError: 'Critical Error',
    company_hideDetails: 'Hide Details',
    company_showDetails: 'Show Details',
    company_supabaseNotInitialized: 'Supabase client not initialized.',
    company_loginRequired: 'Please login to continue.',
    company_noSession: 'No active session.',
    company_userAgenciesFetchError: 'Failed to fetch user agencies: {error}',
    company_companyFetchError: 'Failed to fetch company: {error}',
    company_agenciesFetchError: 'Failed to fetch agencies: {error}',
    company_fetchFailed: 'Failed to fetch data.',
    company_noPermission: 'You do not have permission to access this page.',
    company_noPermissionCreate: 'You do not have permission to create a company.',
    company_sessionError: 'Session error: {error}',
    company_nameRequired: 'Company name is required.',
    company_locationRequired: 'Headquarters location is required.',
    company_phoneRequired: 'Contact phone is required.',
    company_invalidEmail: 'Invalid email format.',
    company_emailRequired: 'Contact email is required.',
    company_scopeRequired: 'Operational scope is required.',
    company_logoRequired: 'Logo is required.',
    company_invalidFileType: 'Invalid file type. Only JPEG, PNG, GIF allowed.',
    company_fileSizeLimit: 'File size must be less than 5MB.',
    company_missingUserId: 'Missing user ID for logo upload.',
    company_logoUploadError: 'Failed to upload logo: {error}',
    company_publicUrlError: 'Failed to get public URL for logo.',
    company_duplicateEmail: 'Duplicate email.',
    company_createError: 'Failed to create company: {error}',
    company_roleAssignError: 'Failed to assign role: {error}',
    company_createSuccess: 'Company created successfully.',
    company_createFailed: 'Failed to create company.',
    company_noPermissionSaveAgency: 'You do not have permission to save agencies.',
    company_noPermissionUpdateAgency: 'You do not have permission to update agencies.',
    company_noPermissionCreateAgency: 'You do not have permission to create agencies.',
    company_duplicateAgencyName: 'Duplicate agency name.',
    company_saveAgencyError: 'Failed to save agency: {error}',
    company_agencyUpdated: 'Agency updated successfully.',
    company_agencyCreated: 'Agency created successfully.',
    company_saveAgencyFailed: 'Failed to save agency.',
    company_noPermissionDeleteAgency: 'You do not have permission to delete agencies.',
    company_deleteAgencyError: 'Failed to delete agency: {error}',
    company_agencyDeleted: 'Agency deleted successfully.',
    company_deleteAgencyFailed: 'Failed to delete agency.',
    company_elevationExists: 'Elevation request already exists.',
    company_elevationError: 'Failed to request elevation: {error}',
    company_elevationSuccess: 'Elevation requested successfully.',
    company_elevationFailed: 'Failed to request elevation.',
    company_pageTitle: 'Transport Company Management',
    company_createTitle: 'Create Transport Company',
    company_name: 'Company Name',
    company_headquarters: 'Headquarters Location',
    company_phonePlaceholder: 'Enter phone number',
    company_email: 'Email',
    company_operationalScope: 'Operational Scope',
    company_scopeRegional: 'Regional',
    company_scopeInternational: 'International',
    company_logo: 'Logo',
    company_logoAlt: 'Company Logo',
    company_cancel: 'Cancel',
    company_create: 'Create',
    company_overview: 'Company Overview',
    company_menu: 'Menu',
    company_edit: 'Edit Company',
    company_requestElevation: 'Request Temporary Elevation',
    company_elevationTitle: 'Temporary Role Elevation',
    company_elevationDescription: 'Request temporary elevation to Operations Manager for 24 hours.',
    company_agencies: 'Agencies',
    company_addAgency: 'Add Agency',
    company_editAgency: 'Edit Agency',
    company_agencyName: 'Agency Name',
    company_agencyAddress: 'Agency Address',
    company_agencyPhone: 'Agency Phone',
    company_agencyEmail: 'Agency Email',
    company_managerName: 'Manager Name',
    company_cancelEdit: 'Cancel Edit',
    company_updateAgency: 'Update Agency',
    company_searchAgencies: 'Search Agencies',
    company_searchPlaceholder: 'Search by name, address, or email',
    company_noSearchResults: 'No agencies match your search.',
    company_noAgencies: 'No agencies found. {action}',
    company_addAgencyAction: 'Add one above.',
    company_contactAdminAction: 'Contact your administrator.',
    company_agencyTable: 'Agencies Table',
    company_actions: 'Actions',
    company_agencyRow: 'Agency: {name}',
    company_agencyNameRequired: 'Agency name is required.',
    company_agencyAddressRequired: 'Agency address is required.',
    company_agencyPhoneRequired: 'Agency phone is required.',
    company_agencyEmailRequired: 'Agency email is required.',
    company_managerNameRequired: 'Manager name is required.',
    company_editTitle: 'Edit Company',
    company_updatedSuccess: 'Company updated successfully.',
    company_updateFailed: 'Failed to update company.',
  },
  fr: {
    company_error: 'Erreur',
    company_unknownError: 'Erreur inconnue : {error}',
    company_errorDetails: 'Détails : {details}',
    company_noDetails: 'Aucun détail disponible',
    company_contactSupport: 'Veuillez contacter le support.',
    company_retry: 'Réessayer',
    company_refresh: 'Rafraîchir la Page',
    company_copyError: 'Copier les Détails de l\'Erreur',
    company_support: 'Support',
    company_networkError: 'Erreur de Réseau',
    company_criticalError: 'Erreur Critique',
    company_hideDetails: 'Masquer les Détails',
    company_showDetails: 'Afficher les Détails',
    company_supabaseNotInitialized: 'Client Supabase non initialisé.',
    company_loginRequired: 'Veuillez vous connecter pour continuer.',
    company_noSession: 'Aucune session active.',
    company_userAgenciesFetchError: 'Échec de la récupération des agences utilisateur : {error}',
    company_companyFetchError: 'Échec de la récupération de l\'entreprise : {error}',
    company_agenciesFetchError: 'Échec de la récupération des agences : {error}',
    company_fetchFailed: 'Échec de la récupération des données.',
    company_noPermission: 'Vous n\'avez pas la permission d\'accéder à cette page.',
    company_noPermissionCreate: 'Vous n\'avez pas la permission de créer une entreprise.',
    company_sessionError: 'Erreur de session : {error}',
    company_nameRequired: 'Le nom de l\'entreprise est requis.',
    company_locationRequired: 'L\'emplacement du siège est requis.',
    company_phoneRequired: 'Le téléphone de contact est requis.',
    company_invalidEmail: 'Format d\'email invalide.',
    company_emailRequired: 'L\'email de contact est requis.',
    company_scopeRequired: 'La portée opérationnelle est requise.',
    company_logoRequired: 'Le logo est requis.',
    company_invalidFileType: 'Type de fichier invalide. Seuls JPEG, PNG, GIF autorisés.',
    company_fileSizeLimit: 'La taille du fichier doit être inférieure à 5 Mo.',
    company_missingUserId: 'ID utilisateur manquant pour le téléchargement du logo.',
    company_logoUploadError: 'Échec du téléchargement du logo : {error}',
    company_publicUrlError: 'Échec de l\'obtention de l\'URL publique pour le logo.',
    company_duplicateEmail: 'Email dupliqué.',
    company_createError: 'Échec de la création de l\'entreprise : {error}',
    company_roleAssignError: 'Échec de l\'assignation du rôle : {error}',
    company_createSuccess: 'Entreprise créée avec succès.',
    company_createFailed: 'Échec de la création de l\'entreprise.',
    company_noPermissionSaveAgency: 'Vous n\'avez pas la permission de sauvegarder les agences.',
    company_noPermissionUpdateAgency: 'Vous n\'avez pas la permission de mettre à jour les agences.',
    company_noPermissionCreateAgency: 'Vous n\'avez pas la permission de créer des agences.',
    company_duplicateAgencyName: 'Nom d\'agence dupliqué.',
    company_saveAgencyError: 'Échec de la sauvegarde de l\'agence : {error}',
    company_agencyUpdated: 'Agence mise à jour avec succès.',
    company_agencyCreated: 'Agence créée avec succès.',
    company_saveAgencyFailed: 'Échec de la sauvegarde de l\'agence.',
    company_noPermissionDeleteAgency: 'Vous n\'avez pas la permission de supprimer des agences.',
    company_deleteAgencyError: 'Échec de la suppression de l\'agence : {error}',
    company_agencyDeleted: 'Agence supprimée avec succès.',
    company_deleteAgencyFailed: 'Échec de la suppression de l\'agence.',
    company_elevationExists: 'Demande d\'élévation déjà existante.',
    company_elevationError: 'Échec de la demande d\'élévation : {error}',
    company_elevationSuccess: 'Élévation demandée avec succès.',
    company_elevationFailed: 'Échec de la demande d\'élévation.',
    company_pageTitle: 'Gestion de la Compagnie de Transport',
    company_createTitle: 'Créer une Compagnie de Transport',
    company_name: 'Nom de la Compagnie',
    company_headquarters: 'Emplacement du Siège',
    company_phonePlaceholder: 'Entrez le numéro de téléphone',
    company_email: 'Email',
    company_operationalScope: 'Portée Opérationnelle',
    company_scopeRegional: 'Régionale',
    company_scopeInternational: 'Internationale',
    company_logo: 'Logo',
    company_logoAlt: 'Logo de la Compagnie',
    company_cancel: 'Annuler',
    company_create: 'Créer',
    company_overview: 'Aperçu de la Compagnie',
    company_menu: 'Menu',
    company_edit: 'Modifier la Compagnie',
    company_requestElevation: 'Demander une Élévation Temporaire',
    company_elevationTitle: 'Élévation Temporaire de Rôle',
    company_elevationDescription: 'Demander une élévation temporaire à Operations Manager pour 24 heures.',
    company_agencies: 'Agences',
    company_addAgency: 'Ajouter une Agence',
    company_editAgency: 'Modifier l\'Agence',
    company_agencyName: 'Nom de l\'Agence',
    company_agencyAddress: 'Adresse de l\'Agence',
    company_agencyPhone: 'Téléphone de l\'Agence',
    company_agencyEmail: 'Email de l\'Agence',
    company_managerName: 'Nom du Manager',
    company_cancelEdit: 'Annuler la Modification',
    company_updateAgency: 'Mettre à Jour l\'Agence',
    company_searchAgencies: 'Rechercher des Agences',
    company_searchPlaceholder: 'Rechercher par nom, adresse ou email',
    company_noSearchResults: 'Aucune agence ne correspond à votre recherche.',
    company_noAgencies: 'Aucune agence trouvée. {action}',
    company_addAgencyAction: 'Ajoutez-en une ci-dessus.',
    company_contactAdminAction: 'Contactez votre administrateur.',
    company_agencyTable: 'Table des Agences',
    company_actions: 'Actions',
    company_agencyRow: 'Agence : {name}',
    company_agencyNameRequired: 'Le nom de l\'agence est requis.',
    company_agencyAddressRequired: 'L\'adresse de l\'agence est requise.',
    company_agencyPhoneRequired: 'Le téléphone de l\'agence est requis.',
    company_agencyEmailRequired: 'L\'email de l\'agence est requis.',
    company_managerNameRequired: 'Le nom du manager est requis.',
    company_editTitle: 'Modifier la Compagnie',
    company_updatedSuccess: 'Compagnie mise à jour avec succès.',
    company_updateFailed: 'Échec de la mise à jour de la compagnie.',
  },
};

const logError = (context, error, info = {}) => {
  console.error(`[${new Date().toISOString()}] ${context}:`, {
    message: error?.message, code: error?.code, ...info
  });
};

const logSuccess = (context, msg, info = {}) => {
  console.log(`[${new Date().toISOString()}] ${context}:`, { msg, ...info });
};

const checkDependencies = () => {
  if (!React || !useTheme || !Yup || !Formik || !toast || !supabase || !PhoneInput) {
    throw new Error('Missing dependency');
  }
  logSuccess('DependencyCheck', 'Dependencies validated');
};

const validateEnvironment = () => {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    const err = new Error('Missing environment variables');
    logError('EnvironmentValidation', err);
    return err;
  }
  return null;
};

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6">{this.props.t('company_error')}</Typography>
            <Typography>{this.state.error?.message || this.props.t('company_unknownError', { error: 'Unknown' })}</Typography>
            <Typography variant="caption">{this.props.t('company_errorDetails', { details: this.state.errorInfo?.componentStack?.split('\n')[0] || this.props.t('company_noDetails') })}</Typography>
            <Typography>{this.props.t('company_contactSupport')}</Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }} aria-label={this.props.t('company_retry')}>
              {this.props.t('company_retry')}
            </Button>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

const DiagnosticOverlay = ({ error, onRetry, t }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isNetwork = error?.message?.includes('network') || error?.message?.includes('timeout');

  const errorDetails = JSON.stringify(
    { message: error?.message, code: error?.code, timestamp: new Date().toISOString() },
    null,
    2
  );

  const handleCopyError = () => {
    navigator.clipboard.writeText(errorDetails);
    toast.info(t('company_copyError'));
  };

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6">{isNetwork ? t('company_networkError') : t('company_criticalError')}</Typography>
        <Typography>{error?.message || t('company_unknownError', { error: 'Unknown' })}</Typography>
        <Typography variant="caption">{t('company_contactSupport')}</Typography>
        <Button onClick={() => setShowDetails(!showDetails)} sx={{ mt: 1 }} size="small" variant="text">
          {showDetails ? t('company_hideDetails') : t('company_showDetails')}
        </Button>
        <Collapse in={showDetails}>
          <Typography variant="caption" component="pre" sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100', p: 1 }}>
            {errorDetails}
          </Typography>
        </Collapse>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {onRetry && <Button onClick={onRetry} aria-label={t('company_retry')}>{t('company_retry')}</Button>}
          <Button onClick={() => window.location.reload()} aria-label={t('company_refresh')}>{t('company_refresh')}</Button>
          <Tooltip title={t('company_copyError')}>
            <IconButton onClick={handleCopyError} aria-label={t('company_copyError')}>
              <FileCopy />
            </IconButton>
          </Tooltip>
          <Button href="https://support.example.com" target="_blank" aria-label={t('company_support')}>
            {t('company_support')}
          </Button>
        </Box>
      </Alert>
    </Box>
  );
};

const fetchRoles = async (userId) => {
  try {
    const { data: userRow, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    if (!userRow || !userRow.role) return [];
    return [{ role: userRow.role }];
  } catch (err) {
    logError('RoleFetch', err, { userId });
    return [];
  }
};

const CreateTransportCompany = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('fr');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [filteredAgencies, setFilteredAgencies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAgency, setEditingAgency] = useState(null);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [userAgencies, setUserAgencies] = useState([]);
  const [temporaryElevation, setTemporaryElevation] = useState(null);
  const [openElevationDialog, setOpenElevationDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showEditCompany, setShowEditCompany] = useState(false);

  const t = useCallback((key, params = {}) => {
    let text = translations[language][key] || key;
    for (const param in params) {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }
    return text;
  }, [language]);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const withTimeout = async (promise, ms = 10000) => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
    return Promise.race([promise, timeout]);
  };

  // --- Role Definitions ---
  const rolesMatrix = {
    'Super Admin': {
      canManageCompany: true,
      canCreateAgency: true,
      canUpdateAgency: true,
      canDeleteAgency: true,
      canRequestElevation: false,
      canViewCompanyPage: true,
      canViewAllAgencies: true,
      canEditAllAgencies: true,
      canDeleteAllAgencies: true,
      canEditOwnAgencies: true,
      canViewReports: true,
      canViewAuditLogs: true,
      canConfigureDashboard: true,
    },
    'Operations Manager': {
      canManageCompany: false,
      canCreateAgency: false,
      canUpdateAgency: true,
      canDeleteAgency: false,
      canRequestElevation: false,
      canViewCompanyPage: true,
      canViewAllAgencies: true,
      canEditAllAgencies: true,
      canDeleteAllAgencies: false,
      canEditOwnAgencies: true,
      canViewReports: true,
      canViewAuditLogs: true,
      canConfigureDashboard: true,
    },
    'Agent Supervisor': {
      canManageCompany: false,
      canCreateAgency: false,
      canUpdateAgency: false,
      canDeleteAgency: false,
      canRequestElevation: true,
      canViewCompanyPage: true,
      canViewAllAgencies: false,
      canEditAllAgencies: false,
      canDeleteAllAgencies: false,
      canEditOwnAgencies: false,
      canViewReports: true,
      canViewAuditLogs: true,
      canConfigureDashboard: true,
    },
    'Ticketing Agent': {
      canManageCompany: false,
      canCreateAgency: false,
      canUpdateAgency: false,
      canDeleteAgency: false,
      canRequestElevation: false,
      canViewCompanyPage: true,
      canViewAllAgencies: false,
      canEditAllAgencies: false,
      canDeleteAllAgencies: false,
      canEditOwnAgencies: false,
      canViewReports: false,
      canViewAuditLogs: true,
      canConfigureDashboard: false,
    }
  };

  // --- End Role Definitions ---

  useEffect(() => {
    if (!supabase) {
      const initError = new Error(t('company_supabaseNotInitialized'));
      logError('SupabaseInit', initError);
      setError(initError);
    }
  }, [t]);

  useEffect(() => {
    const fetchData = async () => {
      const start = performance.now();
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) {
          logError('AuthCheck', sessionError, { note: 'Session fetch failed' });
          throw sessionError;
        }
        if (!session || !session.user?.id) {
          logError('AuthCheck', new Error('No active session or user ID'), { session: session });
          toast.error(t('company_loginRequired'));
          navigate('/application/login');
          return;
        }

        const rolesData = await fetchRoles(session.user.id);
        setUserRoles(rolesData);

        try {
          const { data: elevationData, error: elevationError } = await supabase
            .from('temporary_role_elevations')
            .select('elevated_role, start_time, end_time')
            .eq('user_id', session.user.id)
            .gt('end_time', new Date().toISOString())
            .single();
          if (elevationError && elevationError.code !== 'PGRST116') {
            logError('ElevationFetch', elevationError, { userId: session.user.id });
          }
          setTemporaryElevation(elevationData);
        } catch (err) {
          logError('ElevationFetch', err, { userId: session.user.id });
        }

        const { data: userAgenciesData, error: userAgenciesError } = await supabase
          .from('user_agencies')
          .select('agency_id')
          .eq('user_id', session.user.id);
        if (userAgenciesError) {
          logError('UserAgenciesFetch', userAgenciesError, { userId: session.user.id });
          throw new Error(t('company_userAgenciesFetchError', { error: userAgenciesError.message }));
        }
        setUserAgencies(userAgenciesData || []);

        const { data: companyData, error: companyError } = await supabase
          .from('transport_companies')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (companyError) {
          if (companyError.code === 'PGRST116') {
            setCompany(null);
            logSuccess('DataFetch', 'No company found', { userId: session.user.id });
          } else {
            logError('CompanyFetch', companyError, { userId: session.user.id });
            throw new Error(t('company_companyFetchError', { error: companyError.message }));
          }
        } else {
          setCompany(companyData);
          const agencyQuery = supabase.from('agencies').select('*').eq('company_id', companyData.id);
          if (!(rolesData.some(r => r.role === 'Super Admin') || rolesData.some(r => r.role === 'Operations Manager'))) {
            if (userAgenciesData.length > 0) {
              agencyQuery.in('id', userAgenciesData.map(ua => ua.agency_id));
            } else {
              setAgencies([]);
              setFilteredAgencies([]);
              return;
            }
          }
          const { data: agenciesData, error: agenciesError } = await agencyQuery;
          if (agenciesError) {
            logError('AgenciesFetch', agenciesError, { userId: session.user.id });
            throw new Error(t('company_agenciesFetchError', { error: agenciesError.message }));
          }
          setAgencies(agenciesData || []);
          setFilteredAgencies(agenciesData || []);
          logSuccess('DataFetch', 'Company and agencies fetched', { userId: session.user.id, companyId: companyData.id });
        }
      } catch (err) {
        logError('DataFetch', err, { userId: session?.user?.id });
        toast.error(err.message || t('company_fetchFailed'));
        setError(err);
      } finally {
        setIsLoading(false);
        logSuccess('DataFetch', `Completed in ${performance.now() - start}ms`);
      }
    };

    try {
      checkDependencies();
      const envError = validateEnvironment();
      if (envError) throw envError;
      fetchData();
    } catch (depError) {
      logError('Initialization', depError);
      setError(depError);
      setIsLoading(false);
    }
  }, [navigate, t]);

  const memoizedFilteredAgencies = useMemo(() => {
    if (!searchQuery) {
      return agencies;
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      return agencies.filter(
        agency =>
          agency?.name?.toLowerCase().includes(lowerQuery) ||
          agency?.address?.toLowerCase().includes(lowerQuery) ||
          agency?.email?.toLowerCase().includes(lowerQuery)
      );
    }
  }, [searchQuery, agencies]);

  // Compute effective role (including temporary elevation)
  const effectiveRole = () => {
    if (temporaryElevation && new Date(temporaryElevation.end_time) > new Date()) {
      return temporaryElevation.elevated_role;
    }
    if (userRoles.some(r => r.role === 'Super Admin')) return 'Super Admin';
    if (userRoles.some(r => r.role === 'Operations Manager')) return 'Operations Manager';
    if (userRoles.some(r => r.role === 'Agent Supervisor')) return 'Agent Supervisor';
    if (userRoles.some(r => r.role === 'Ticketing Agent')) return 'Ticketing Agent';
    return null;
  };

  const role = effectiveRole();
  const roleFlags = rolesMatrix[role] || {};

  const handleLogoUpload = async (file, userId) => {
    try {
      if (!userId) throw new Error(t('company_missingUserId'));
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw new Error(t('company_logoUploadError', { error: error.message }));
      const { data: publicUrlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      if (!publicUrlData?.publicUrl) throw new Error(t('company_publicUrlError'));
      return publicUrlData.publicUrl;
    } catch (error) {
      logError('LogoUpload', error, { userId });
      throw error;
    }
  };

  // Only Super Admin can create company
  const handleCreateCompany = async (values, { setSubmitting }) => {
    const start = performance.now();
    try {
      if (!roleFlags.canManageCompany) throw new Error(t('company_noPermissionCreate'));
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(t('company_sessionError', { error: sessionError.message }));
      if (!session || !session.user?.id) throw new Error(t('company_noSession'));
      let logoUrl = await handleLogoUpload(values.logoFile, session.user.id);
      const companyData = {
        user_id: session.user.id,
        name: values.companyName,
        headquarters_location: values.headquartersLocation,
        contact_phone: values.contactPhone,
        contact_email: values.contactEmail,
        operational_scope: values.operationalScope,
        logo_url: logoUrl,
      };

      const { data: company, error: companyError } = await supabase
        .from('transport_companies')
        .insert(companyData)
        .select()
        .single();
      if (companyError) {
        if (companyError.code === '23505') throw new Error(t('company_duplicateEmail'));
        throw new Error(t('company_createError', { error: companyError.message }));
      }

      // Assign Super Admin role after company creation
      const { error: userError } = await supabase
        .from('users')
        .update({
          role: 'Super Admin',
          company_id: company.id,
          permissions: [
            'bus_management:view',
            'bus_management:create',
            'bus_management:update',
            'bus_management:delete',
            'route_management:view',
            'route_management:create',
            'route_management:update',
            'route_management:delete',
            'reservation_management:view',
            'reservation_management:create',
            'reservation_management:update',
            'reservation_management:delete',
            'reports:view',
            'audit_logs:view',
            'analytics:view',
            'analytics:generate'
          ]
        })
        .eq('user_id', session.user.id);

      if (userError) {
        await supabase.from('transport_companies').delete().eq('id', company.id);
        throw new Error(t('company_roleAssignError', { error: userError.message }));
      }

      setCompany(company);
      setUserRoles([{ role: 'Super Admin' }]);
      toast.success(t('company_createSuccess'));
      navigate('/dashboard/default');
    } catch (error) {
      logError('CompanyCreate', error);
      toast.error(error.message || t('company_createFailed'));
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('CompanyCreate', `Completed in ${performance.now() - start}ms`);
    }
  };

  // Update company
  const handleUpdateCompany = async (values, { setSubmitting }) => {
    const start = performance.now();
    try {
      if (!roleFlags.canManageCompany) throw new Error(t('company_noPermissionCreate'));
      let logoUrl = company.logo_url;
      if (values.logoFile) {
        logoUrl = await handleLogoUpload(values.logoFile, company.user_id);
      }
      const updateData = {
        name: values.companyName,
        headquarters_location: values.headquartersLocation,
        contact_phone: values.contactPhone,
        contact_email: values.contactEmail,
        operational_scope: values.operationalScope,
        logo_url: logoUrl,
      };
      const { error: updateError } = await supabase
        .from('transport_companies')
        .update(updateData)
        .eq('id', company.id);
      if (updateError) {
        if (updateError.code === '23505') throw new Error(t('company_duplicateEmail'));
        throw new Error(t('company_createError', { error: updateError.message }));
      }
      setCompany({ ...company, ...updateData });
      setShowEditCompany(false);
      toast.success(t('company_updatedSuccess'));
    } catch (error) {
      logError('CompanyUpdate', error);
      toast.error(error.message || t('company_updateFailed'));
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('CompanyUpdate', `Completed in ${performance.now() - start}ms`);
    }
  };

  // Agency save (create or update)
  const handleSaveAgency = async (values, { setSubmitting, resetForm }) => {
    const start = performance.now();
    try {
      if (!roleFlags.canCreateAgency && !roleFlags.canUpdateAgency) throw new Error(t('company_noPermissionSaveAgency'));
      const agencyData = {
        company_id: company.id,
        name: values.agencyName,
        address: values.agencyAddress,
        phone: values.agencyPhone,
        email: values.agencyEmail,
        manager_name: values.managerName,
      };
      let data, error;
      if (editingAgency) {
        if (!roleFlags.canUpdateAgency) throw new Error(t('company_noPermissionUpdateAgency'));
        ({ data, error } = await supabase.from('agencies').update(agencyData).eq('id', editingAgency.id).select().single());
      } else {
        if (!roleFlags.canCreateAgency) throw new Error(t('company_noPermissionCreateAgency'));
        ({ data, error } = await supabase.from('agencies').insert(agencyData).select().single());
      }
      if (error) {
        if (error.code === '23505') throw new Error(t('company_duplicateAgencyName'));
        throw new Error(t('company_saveAgencyError', { error: error.message }));
      }
      if (editingAgency) {
        setAgencies(agencies.map(agency => agency.id === data.id ? data : agency));
        setFilteredAgencies(filteredAgencies.map(agency => agency.id === data.id ? data : agency));
        toast.success(t('company_agencyUpdated'));
        setEditingAgency(null);
      } else {
        setAgencies([...agencies, data]);
        setFilteredAgencies([...filteredAgencies, data]);
        toast.success(t('company_agencyCreated'));
      }
      setShowAgencyForm(false);
      resetForm();
    } catch (error) {
      logError('AgencySave', error);
      toast.error(error.message || t('company_saveAgencyFailed'));
      setError(error);
    } finally {
      setSubmitting(false);
      logSuccess('AgencySave', `Completed in ${performance.now() - start}ms`);
    }
  };

  const handleDeleteAgency = async (agencyId) => {
    const start = performance.now();
    try {
      if (!roleFlags.canDeleteAgency) throw new Error(t('company_noPermissionDeleteAgency'));
      const { error } = await supabase.from('agencies').delete().eq('id', agencyId);
      if (error) throw new Error(t('company_deleteAgencyError', { error: error.message }));
      setAgencies(agencies.filter(agency => agency.id !== agencyId));
      setFilteredAgencies(filteredAgencies.filter(agency => agency.id !== agencyId));
      toast.success(t('company_agencyDeleted'));
    } catch (error) {
      logError('AgencyDelete', error);
      toast.error(error.message || t('company_deleteAgencyFailed'));
      setError(error);
    } finally {
      logSuccess('AgencyDelete', `Completed in ${performance.now() - start}ms`);
    }
  };

  const handleRequestElevation = async () => {
    const start = performance.now();
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(t('company_sessionError', { error: sessionError.message }));
      if (!session || !session.user?.id) throw new Error(t('company_noSession'));
      const elevationData = {
        user_id: session.user.id,
        elevated_role: 'Operations Manager',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      const { data, error } = await supabase.from('temporary_role_elevations').insert(elevationData).select().single();
      if (error) {
        if (error.code === '23505') throw new Error(t('company_elevationExists'));
        throw new Error(t('company_elevationError', { error: error.message }));
      }
      setTemporaryElevation(data);
      toast.success(t('company_elevationSuccess'));
      setOpenElevationDialog(false);
    } catch (error) {
      logError('ElevationRequest', error);
      toast.error(error.message || t('company_elevationFailed'));
      setError(error);
    } finally {
      logSuccess('ElevationRequest', `Completed in ${performance.now() - start}ms`);
    }
  };

  if (!supabase) {
    const initError = new Error(t('company_supabaseNotInitialized'));
    logError('SupabaseInit', initError);
    return <DiagnosticOverlay error={initError} t={t} />;
  }

  if (error) {
    logError('ComponentError', error);
    return <DiagnosticOverlay error={error} onRetry={() => setError(null)} t={t} />;
  }

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress aria-label={t('loading')} /></Box>;
  }

  if (!roleFlags.canViewCompanyPage) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          <Typography>
            {t('company_noPermission')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <ErrorBoundary t={t}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon /> {t('company_pageTitle')}
            {role && <Chip label={role} color={role === 'Super Admin' ? 'primary' : role === 'Operations Manager' ? 'secondary' : 'default'} sx={{ ml: 2 }} />}
          </Typography>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            size="small"
            sx={{ minWidth: 60 }}
          >
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="fr">FR</MenuItem>
          </Select>
        </Box>

        {!company ? (
          roleFlags.canManageCompany ? (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon /> {t('company_createTitle')}
                </Typography>
                <Formik
                  initialValues={{
                    companyName: '',
                    headquartersLocation: '',
                    contactPhone: '',
                    contactEmail: '',
                    operationalScope: 'regional',
                    logoFile: null,
                    submit: null,
                  }}
                  validationSchema={Yup.object().shape({
                    companyName: Yup.string().max(255).required(t('company_nameRequired')),
                    headquartersLocation: Yup.string().max(255).required(t('company_locationRequired')),
                    contactPhone: Yup.string().required(t('company_phoneRequired')),
                    contactEmail: Yup.string().email(t('company_invalidEmail')).max(255).required(t('company_emailRequired')),
                    operationalScope: Yup.string().oneOf(['regional', 'international']).required(t('company_scopeRequired')),
                    logoFile: Yup.mixed()
                      .required(t('company_logoRequired'))
                      .test('fileType', t('company_invalidFileType'), value => value ? ['image/jpeg', 'image/png', 'image/gif'].includes(value.type) : false)
                      .test('fileSize', t('company_fileSizeLimit'), value => value ? value.size <= 5 * 1024 * 1024 : false),
                  })}
                  onSubmit={handleCreateCompany}
                >
                  {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue }) => (
                    <Box component="form" noValidate onSubmit={handleSubmit}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            error={Boolean(touched.companyName && errors.companyName)}
                            helperText={touched.companyName && errors.companyName}
                            label={t('company_name')}
                            margin="normal"
                            name="companyName"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.companyName}
                            variant="outlined"
                            InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                            aria-label={t('company_name')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            error={Boolean(touched.headquartersLocation && errors.headquartersLocation)}
                            helperText={touched.headquartersLocation && errors.headquartersLocation}
                            label={t('company_headquarters')}
                            margin="normal"
                            name="headquartersLocation"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.headquartersLocation}
                            variant="outlined"
                            InputProps={{ startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                            aria-label={t('company_headquarters')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal" error={Boolean(touched.contactPhone && errors.contactPhone)}>
                            <PhoneInput
                              international
                              defaultCountry="US"
                              value={values.contactPhone}
                              onChange={value => setFieldValue('contactPhone', value)}
                              onBlur={handleBlur}
                              placeholder={t('company_phonePlaceholder')}
                              style={{
                                padding: '10px',
                                border: errors.contactPhone && touched.contactPhone ? '1px solid red' : '1px solid #ccc',
                                borderRadius: '4px',
                              }}
                              aria-label={t('company_phone')}
                            />
                            {touched.contactPhone && errors.contactPhone && (
                              <FormHelperText error>{errors.contactPhone}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            error={Boolean(touched.contactEmail && errors.contactEmail)}
                            helperText={touched.contactEmail && errors.contactEmail}
                            label={t('company_email')}
                            margin="normal"
                            name="contactEmail"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.contactEmail}
                            variant="outlined"
                            InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                            aria-label={t('company_email')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal">
                            <InputLabel>{t('company_operationalScope')}</InputLabel>
                            <Select
                              name="operationalScope"
                              value={values.operationalScope}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={Boolean(touched.operationalScope && errors.operationalScope)}
                              aria-label={t('company_operationalScope')}
                            >
                              <MenuItem value="regional">{t('company_scopeRegional')}</MenuItem>
                              <MenuItem value="international">{t('company_scopeInternational')}</MenuItem>
                            </Select>
                            {touched.operationalScope && errors.operationalScope && (
                              <FormHelperText error>{errors.operationalScope}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal" error={Boolean(touched.logoFile && errors.logoFile)}>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={event => setFieldValue('logoFile', event.currentTarget.files[0])}
                              onBlur={handleBlur}
                              name="logoFile"
                              sx={{ pt: 1 }}
                              aria-label={t('company_logo')}
                            />
                            {touched.logoFile && errors.logoFile && (
                              <FormHelperText error>{errors.logoFile}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button
                    
                        >
                          {t('company_cancel')}
                        </Button>
                        <Button
                          color="primary"
                          disabled={isSubmitting}
                          type="submit"
                          variant="contained"
                          sx={{ flex: 1 }}
                          aria-label={t('company_create')}
                        >
                          {t('company_create')}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Formik>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="error">
              <Typography>{t('company_noPermissionCreate')}</Typography>
            </Alert>
          )
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon /> {t('company_overview')}
              </Typography>
              {roleFlags.canManageCompany && (
                <Box>
                  <IconButton onClick={handleMenuClick} aria-label={t('company_menu')}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={() => { handleMenuClose(); setShowEditCompany(!showEditCompany); }} aria-label={t('company_edit')}>
                      {showEditCompany ? t('company_cancelEdit') : t('company_edit')}
                    </MenuItem>
                  </Menu>
                </Box>
              )}
            </Box>
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography><BusinessIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>{t('company_name')}:</strong> {company.name}</Typography>
                    <Typography><LocationOnIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>{t('company_headquarters')}:</strong> {company.headquarters_location}</Typography>
                    <Typography><PhoneIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>{t('company_phone')}:</strong> {company.contact_phone}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><EmailIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>{t('company_email')}:</strong> {company.contact_email}</Typography>
                    <Typography><PublicIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>{t('company_operationalScope')}:</strong> {t(`company_scope${company.operational_scope.charAt(0).toUpperCase() + company.operational_scope.slice(1)}`)}</Typography>
                    <Typography><ImageIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>{t('company_logo')}:</strong> <img src={company.logo_url} alt={t('company_logoAlt')} style={{ maxWidth: '100px', marginTop: '8px' }} /></Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Collapse in={showEditCompany}>
              <Card sx={{ mt: 2, mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon /> {t('company_editTitle')}
                  </Typography>
                  <Formik
                    initialValues={{
                      companyName: company.name,
                      headquartersLocation: company.headquarters_location,
                      contactPhone: company.contact_phone,
                      contactEmail: company.contact_email,
                      operationalScope: company.operational_scope,
                      logoFile: null,
                      submit: null,
                    }}
                    validationSchema={Yup.object().shape({
                      companyName: Yup.string().max(255).required(t('company_nameRequired')),
                      headquartersLocation: Yup.string().max(255).required(t('company_locationRequired')),
                      contactPhone: Yup.string().required(t('company_phoneRequired')),
                      contactEmail: Yup.string().email(t('company_invalidEmail')).max(255).required(t('company_emailRequired')),
                      operationalScope: Yup.string().oneOf(['regional', 'international']).required(t('company_scopeRequired')),
                      logoFile: Yup.mixed().nullable()
                        .test('fileType', t('company_invalidFileType'), value => !value || ['image/jpeg', 'image/png', 'image/gif'].includes(value.type))
                        .test('fileSize', t('company_fileSizeLimit'), value => !value || value.size <= 5 * 1024 * 1024),
                    })}
                    onSubmit={handleUpdateCompany}
                  >
                    {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue }) => (
                      <Box component="form" noValidate onSubmit={handleSubmit}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.companyName && errors.companyName)}
                              helperText={touched.companyName && errors.companyName}
                              label={t('company_name')}
                              margin="normal"
                              name="companyName"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.companyName}
                              variant="outlined"
                              InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                              aria-label={t('company_name')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.headquartersLocation && errors.headquartersLocation)}
                              helperText={touched.headquartersLocation && errors.headquartersLocation}
                              label={t('company_headquarters')}
                              margin="normal"
                              name="headquartersLocation"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.headquartersLocation}
                              variant="outlined"
                              InputProps={{ startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                              aria-label={t('company_headquarters')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal" error={Boolean(touched.contactPhone && errors.contactPhone)}>
                              <PhoneInput
                                international
                                defaultCountry="US"
                                value={values.contactPhone}
                                onChange={value => setFieldValue('contactPhone', value)}
                                onBlur={handleBlur}
                                placeholder={t('company_phonePlaceholder')}
                                style={{
                                  padding: '10px',
                                  border: errors.contactPhone && touched.contactPhone ? '1px solid red' : '1px solid #ccc',
                                  borderRadius: '4px',
                                }}
                                aria-label={t('company_phone')}
                              />
                              {touched.contactPhone && errors.contactPhone && (
                                <FormHelperText error>{errors.contactPhone}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.contactEmail && errors.contactEmail)}
                              helperText={touched.contactEmail && errors.contactEmail}
                              label={t('company_email')}
                              margin="normal"
                              name="contactEmail"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.contactEmail}
                              variant="outlined"
                              InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                              aria-label={t('company_email')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal">
                              <InputLabel>{t('company_operationalScope')}</InputLabel>
                              <Select
                                name="operationalScope"
                                value={values.operationalScope}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={Boolean(touched.operationalScope && errors.operationalScope)}
                                aria-label={t('company_operationalScope')}
                              >
                                <MenuItem value="regional">{t('company_scopeRegional')}</MenuItem>
                                <MenuItem value="international">{t('company_scopeInternational')}</MenuItem>
                              </Select>
                              {touched.operationalScope && errors.operationalScope && (
                                <FormHelperText error>{errors.operationalScope}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal" error={Boolean(touched.logoFile && errors.logoFile)}>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={event => setFieldValue('logoFile', event.currentTarget.files[0])}
                                onBlur={handleBlur}
                                name="logoFile"
                                sx={{ pt: 1 }}
                                aria-label={t('company_logo')}
                              />
                              {touched.logoFile && errors.logoFile && (
                                <FormHelperText error>{errors.logoFile}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                          <Button
                            color="secondary"
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => setShowEditCompany(false)}
                            sx={{ flex: 1 }}
                            aria-label={t('company_cancel')}
                          >
                            {t('company_cancel')}
                          </Button>
                          <Button
                            color="primary"
                            disabled={isSubmitting}
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                            aria-label={t('company_updateAgency')}
                          >
                            {t('company_updateAgency')}
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Formik>
                </CardContent>
              </Card>
            </Collapse>

            {roleFlags.canRequestElevation && (
              <Box sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<SupervisorAccountIcon />}
                  onClick={() => setOpenElevationDialog(true)}
                  aria-label={t('company_requestElevation')}
                >
                  {t('company_requestElevation')}
                </Button>
                <Dialog open={openElevationDialog} onClose={() => setOpenElevationDialog(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>{t('company_elevationTitle')}</DialogTitle>
                  <DialogContent>
                    <Typography>
                      {t('company_elevationDescription')}
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setOpenElevationDialog(false)} aria-label={t('company_cancel')}>
                      {t('company_cancel')}
                    </Button>
                    <Button color="primary" onClick={handleRequestElevation} aria-label={t('company_requestElevation')}>
                      {t('company_requestElevation')}
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon /> {t('company_agencies')}
              </Typography>
              {(roleFlags.canCreateAgency || roleFlags.canUpdateAgency) && !showAgencyForm && !editingAgency && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAgencyForm(true)}
                  aria-label={t('company_addAgency')}
                >
                  {t('company_addAgency')}
                </Button>
              )}
            </Box>

            {(roleFlags.canCreateAgency || roleFlags.canUpdateAgency) && (showAgencyForm || editingAgency) && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{editingAgency ? t('company_editAgency') : t('company_addAgency')}</Typography>
                  <Formik
                    enableReinitialize
                    initialValues={{
                      agencyName: editingAgency?.name || '',
                      agencyAddress: editingAgency?.address || '',
                      agencyPhone: editingAgency?.phone || '',
                      agencyEmail: editingAgency?.email || '',
                      managerName: editingAgency?.manager_name || '',
                      submit: null,
                    }}
                    validationSchema={Yup.object().shape({
                      agencyName: Yup.string().max(255).required(t('company_agencyNameRequired')),
                      agencyAddress: Yup.string().max(255).required(t('company_agencyAddressRequired')),
                      agencyPhone: Yup.string().required(t('company_agencyPhoneRequired')),
                      agencyEmail: Yup.string().email(t('company_invalidEmail')).max(255).required(t('company_agencyEmailRequired')),
                      managerName: Yup.string().max(255).required(t('company_managerNameRequired')),
                    })}
                    onSubmit={handleSaveAgency}
                  >
                    {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue, resetForm }) => (
                      <Box component="form" noValidate onSubmit={handleSubmit}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.agencyName && errors.agencyName)}
                              helperText={touched.agencyName && errors.agencyName}
                              label={t('company_agencyName')}
                              margin="normal"
                              name="agencyName"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.agencyName}
                              variant="outlined"
                              InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                              aria-label={t('company_agencyName')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.agencyAddress && errors.agencyAddress)}
                              helperText={touched.agencyAddress && errors.agencyAddress}
                              label={t('company_agencyAddress')}
                              margin="normal"
                              name="agencyAddress"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.agencyAddress}
                              variant="outlined"
                              InputProps={{ startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                              aria-label={t('company_agencyAddress')}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal" error={Boolean(touched.agencyPhone && errors.agencyPhone)}>
                              <PhoneInput
                                international
                                defaultCountry="US"
                                value={values.agencyPhone}
                                onChange={value => setFieldValue('agencyPhone', value)}
                                onBlur={handleBlur}
                                placeholder={t('company_phonePlaceholder')}
                                style={{
                                  padding: '10px',
                                  border: errors.agencyPhone && touched.agencyPhone ? '1px solid red' : '1px solid #ccc',
                                  borderRadius: '4px',
                                }}
                                aria-label={t('company_agencyPhone')}
                              />
                              {touched.agencyPhone && errors.agencyPhone && (
                                <FormHelperText error>{errors.agencyPhone}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.agencyEmail && errors.agencyEmail)}
                              helperText={touched.agencyEmail && errors.agencyEmail}
                              label={t('company_agencyEmail')}
                              margin="normal"
                              name="agencyEmail"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.agencyEmail}
                              variant="outlined"
                              InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                              aria-label={t('company_agencyEmail')}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              error={Boolean(touched.managerName && errors.managerName)}
                              helperText={touched.managerName && errors.managerName}
                              label={t('company_managerName')}
                              margin="normal"
                              name="managerName"
                              onBlur={handleBlur}
                              onChange={handleChange}
                              value={values.managerName}
                              variant="outlined"
                              aria-label={t('company_managerName')}
                            />
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                          <Button
                            color="secondary"
                            variant="outlined"
                            onClick={() => { resetForm(); setEditingAgency(null); setShowAgencyForm(false); }}
                            sx={{ flex: 1 }}
                            aria-label={editingAgency ? t('company_cancelEdit') : t('company_cancel')}
                          >
                            {editingAgency ? t('company_cancelEdit') : t('company_cancel')}
                          </Button>
                          <Button
                            color="primary"
                            disabled={isSubmitting}
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                            aria-label={editingAgency ? t('company_updateAgency') : t('company_addAgency')}
                          >
                            {editingAgency ? t('company_updateAgency') : t('company_addAgency')}
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Formik>
                </CardContent>
              </Card>
            )}

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label={t('company_searchAgencies')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('company_searchPlaceholder')}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                variant="outlined"
                aria-label={t('company_searchAgencies')}
              />
            </Box>

            <TableContainer component={Paper}>
              <Table aria-label={t('company_agencyTable')}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('company_agencyName')}</TableCell>
                    <TableCell>{t('company_agencyAddress')}</TableCell>
                    <TableCell>{t('company_agencyPhone')}</TableCell>
                    <TableCell>{t('company_agencyEmail')}</TableCell>
                    <TableCell>{t('company_managerName')}</TableCell>
                    <TableCell>{t('company_actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memoizedFilteredAgencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        {searchQuery ? t('company_noSearchResults') : t('company_noAgencies', { action: roleFlags.canCreateAgency ? t('company_addAgencyAction') : t('company_contactAdminAction') })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    memoizedFilteredAgencies.map(agency => (
                      <TableRow key={agency.id} aria-label={t('company_agencyRow', { name: agency.name })}>
                        <TableCell>{agency.name}</TableCell>
                        <TableCell>{agency.address}</TableCell>
                        <TableCell>{agency.phone}</TableCell>
                        <TableCell>{agency.email}</TableCell>
                        <TableCell>{agency.manager_name}</TableCell>
                        <TableCell>
                          {roleFlags.canUpdateAgency && (
                            <Tooltip title={t('company_editAgency')}>
                              <IconButton onClick={() => { setEditingAgency(agency); setShowAgencyForm(true); }} aria-label={t('company_editAgency')}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {roleFlags.canDeleteAgency && (
                            <Tooltip title={t('company_deleteAgency')}>
                              <IconButton onClick={() => handleDeleteAgency(agency.id)} aria-label={t('company_deleteAgency')}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default CreateTransportCompany;