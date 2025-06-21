import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Parser } from '@json2csv/plainjs';
import html2pdf from 'html2pdf.js';
import { supabase } from './supabase';

// material-ui
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
  CssBaseline,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CalendarToday as CalendarTodayIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Sort as SortIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from './LanguageContext';

// Breadcrumb Component
const Breadcrumb = ({ title, children }) => {
  const { t } = useTranslation();
  try {
    console.log('Rendering Breadcrumb', { title });
    return (
      <Box sx={{ mb: 2, transition: 'all 0.3s ease-in-out' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} />
          {title}
        </Typography>
        <Box sx={{ mt: 1 }}>{children}</Box>
      </Box>
    );
  } catch (error) {
    console.error('Error rendering Breadcrumb:', error);
    return <Typography color="error">{t('reports_breadcrumbError')}</Typography>;
  }
};
const gridSpacing = 2;

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null, browserContext: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const browserContext = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    console.error('ErrorBoundary caught an error:', { error, errorInfo, browserContext });
    this.setState({ errorInfo, browserContext });
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      console.log('ErrorBoundary rendering error UI', {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        browserContext: this.state.browserContext,
      });
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {t('reports_error')}: {this.state.error?.message || t('reports_unknownError', { error: 'Unknown' })}
          </Typography>
          <Typography variant="body2">
            {t('reports_errorDetails', { details: this.state.errorInfo?.componentStack || t('reports_noDetails') })}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {t('reports_browserContext', {
              url: this.state.browserContext?.url || 'N/A',
              agent: this.state.browserContext?.userAgent || 'N/A',
            })}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {t('reports_resolveSteps')}
            <ul>
              <li>{t('reports_checkConsole')}</li>
              <li>{t('reports_installDependencies')}</li>
              <li>{t('reports_reloadPage')}</li>
              <li>{t('reports_contactAdmin')}</li>
            </ul>
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

// Role-based access control matrix
const roleMatrix = {
  'Super Admin': {
    canViewReports: true,
    canViewAllAgencies: true,
  },
  'Operations Manager': {
    canViewReports: true,
    canViewAllAgencies: true,
  },
  'Agent Supervisor': {
    canViewReports: true,
    canViewAllAgencies: false,
  },
  'Ticketing Agent': {
    canViewReports: false,
    canViewAllAgencies: false,
  },
};

// Utility function for timeout handling
const withTimeout = async (promise, ms = 10000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
};

// ==============================|| REPORTS PAGE ||============================== //

const Reports = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reports, setReports] = useState([]);
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [customOrigin, setCustomOrigin] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [isTemporaryRole, setIsTemporaryRole] = useState(false);
  const [temporaryRoleExpiry, setTemporaryRoleExpiry] = useState(null);
  const [userAgencies, setUserAgencies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const today = new Date().toISOString().split('T')[0];

  // Determine effective role
  const effectiveRole = useCallback(() => {
    const now = new Date();
    if (isTemporaryRole && temporaryRoleExpiry && new Date(temporaryRoleExpiry) > now) {
      return userRole;
    }
    return userRole;
  }, [userRole, isTemporaryRole, temporaryRoleExpiry]);

  const role = effectiveRole();

  // Check permissions per RBAC spec
  const canViewReports = roleMatrix[role]?.canViewReports;

  // Fetch user role, company data, and agencies
  useEffect(() => {
    const fetchInitialData = async () => {
      const startTime = performance.now();
      try {
        setIsLoading(true);
        setError(null);

        // Fetch authenticated user session
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession());
        if (sessionError) throw new Error(t('reports_sessionError', { error: sessionError.message }));
        if (!session) {
          logError('AuthCheck', new Error('No active session'), { userId: 'unknown' });
          toast.error(t('reports_loginRequired'));
          navigate('/application/login');
          return;
        }

        // Fetch user data from users table
        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('user_id, role, temporary_role, temporary_role_expiry, company_id')
          .eq('user_id', session.user.id)
          .single();
        if (userRowError) throw new Error(t('reports_userFetchError', { error: userRowError.message }));

        const now = new Date();
        const isTemp = userRow.temporary_role && userRow.temporary_role_expiry && new Date(userRow.temporary_role_expiry) > now;
        const activeRole = isTemp ? userRow.temporary_role : userRow.role || 'Ticketing Agent';
        setUserRole(activeRole);
        setIsTemporaryRole(isTemp);
        setTemporaryRoleExpiry(isTemp ? userRow.temporary_role_expiry : null);

        // Check if user has report view permission
        if (!roleMatrix[activeRole]?.canViewReports) {
          throw new Error(t('reports_noPermission'));
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
          throw new Error(t('reports_agencyFetchError', { error: userAgenciesError.message }));
        }
        setUserAgencies(userAgenciesData || []);

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
              throw new Error(t('reports_noCompany'));
            }
            throw new Error(t('reports_companyFetchError', { error: companyError.message }));
          }
          companyIdToUse = companyData.id;
        }
        setCompanyId(companyIdToUse);

        // Fetch agencies with role-based restrictions
        let agencyQuery = supabase
          .from('agencies')
          .select('id, name, address, phone, email, manager_name')
          .eq('company_id', companyIdToUse)
          .order('name', { ascending: true });

        if (userAgenciesData.length > 0) {
          const allowedAgencyIds = userAgenciesData.map((ua) => ua.agency_id);
          agencyQuery = agencyQuery.in('id', allowedAgencyIds);
        } else if (!roleMatrix[activeRole]?.canViewAllAgencies) {
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
              throw new Error(t('reports_agencyFetchError', { error: err.message }));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        setAgencies(agenciesData);

        // Set default selected agency
        if (agenciesData.length > 0) {
          setSelectedAgencyId(agenciesData[0].id);
        }

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
              ? t('reports_dbError', { code: error.code || 'N/A' })
              : t('reports_fetchError', { error: error.message })
          );
        }
      } finally {
        setIsLoading(false);
        logSuccess('InitialDataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchInitialData();
  }, [navigate, retryCount, t]);

  // Fetch routes, buses, and reservations
  useEffect(() => {
    if (!companyId || !role || !selectedAgencyId) return;

    const fetchData = async () => {
      const startTime = performance.now();
      try {
        setIsLoading(true);
        setError(null);

        // Fetch routes
        let routeQuery = supabase.from('routes').select('*').eq('company_id', companyId);
        if (!roleMatrix[role]?.canViewAllAgencies && userAgencies.length > 0) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          routeQuery = routeQuery.or(
            `departure_agency_id.in.(${agencyIds.join(',')}),arrival_agency_id.in.(${agencyIds.join(',')}),arrest_agency_ids.cs.{${agencyIds.join(',')}}`
          );
        }
        const { data: routesData, error: routesError } = await withTimeout(routeQuery);
        if (routesError) throw new Error(t('reports_routesFetchError', { error: routesError.message }));
        setRoutes(routesData || []);

        // Fetch buses
        let busQuery = supabase.from('buses').select('*').eq('company_id', companyId);
        if (!roleMatrix[role]?.canViewAllAgencies && userAgencies.length > 0) {
          busQuery = busQuery.in('agency_id', userAgencies.map((ua) => ua.agency_id));
        }
        const { data: busesData, error: busesError } = await withTimeout(busQuery);
        if (busesError) throw new Error(t('reports_busesFetchError', { error: busesError.message }));
        setBuses(busesData || []);

        // Fetch reservations for the selected agency
        let reservationQuery = supabase
          .from('reservations')
          .select('*, routes!inner(origin, destination, trip_date, departure_time, bus_id, wifi, charger_ports, air_conditioning, price)')
          .eq('company_id', companyId)
          .eq('agency_id', selectedAgencyId);
        if (!roleMatrix[role]?.canViewAllAgencies) {
          const agencyIds = userAgencies.map((ua) => ua.agency_id);
          if (agencyIds.length > 0) {
            reservationQuery = reservationQuery.in('agency_id', agencyIds);
          } else {
            reservationQuery = reservationQuery.limit(0);
          }
        }
        const { data: reservationsData, error: reservationsError } = await withTimeout(reservationQuery);
        if (reservationsError) throw new Error(t('reports_reservationsFetchError', { error: reservationsError.message }));
        setReservations(reservationsData || []);

        logSuccess('DataFetch', 'Routes, buses, and reservations fetched successfully', {
          routeCount: routesData?.length,
          busCount: busesData?.length,
          reservationCount: reservationsData?.length,
        });
      } catch (error) {
        logError('DataFetch', error);
        setError(t('reports_dataFetchError', { error: error.message }));
      } finally {
        setIsLoading(false);
        logSuccess('DataFetch', `Fetch completed in ${performance.now() - startTime}ms`);
      }
    };

    fetchData();
  }, [companyId, selectedAgencyId, role, userAgencies, t]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('Reports state updated', {
      reports: reports.length,
      customRange,
      customOrigin,
      customDestination,
      expandedReport,
      isLoading,
      sortConfig,
      filterType,
      error,
      reservationsCount: reservations.length,
      userRole: role,
      userAgenciesCount: userAgencies.length,
    });
  }, [reports, customRange, customOrigin, customDestination, expandedReport, isLoading, sortConfig, filterType, error, reservations, role, userAgencies]);

  const allReceipts = useMemo(() => {
    try {
      console.log('Calculating allReceipts', { reservationsCount: reservations.length });
      return reservations.map((res) => ({
        reservationId: res.id,
        origin: res.routes.origin,
        destination: res.routes.destination,
        date: res.routes.trip_date,
        time: res.routes.departure_time,
        passengerCount: res.passenger_count,
        totalPrice: res.total_price,
        paymentStatus: res.payment_status,
        reservationStatus: res.reservation_status,
        reservationDateTime: res.reservation_date_time,
        agencyId: res.agency_id,
        busType: buses.find((b) => b.id === res.routes.bus_id)?.bus_type || 'Standard',
        amenities: buses.find((b) => b.id === res.routes.bus_id)?.amenities || [],
      }));
    } catch (error) {
      logError('AllReceiptsMemo', error);
      toast.error(t('reports_receiptsCalculationError'));
      return [];
    }
  }, [reservations, buses, t]);

  const reportTypes = useMemo(() => {
    try {
      console.log('Calculating reportTypes', { reportsCount: reports.length });
      return [...new Set(reports.map((report) => report.type).filter(Boolean))];
    } catch (error) {
      logError('ReportTypesMemo', error);
      toast.error(t('reports_reportTypesError'));
      return [];
    }
  }, [reports, t]);

  const validateDateRange = useCallback((start, end) => {
    try {
      console.log('Validating date range:', { start, end });
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (!start || !end) {
        return { isValid: false, message: t('reports_missingDates') };
      }
      if (isNaN(startDate) || isNaN(endDate)) {
        return { isValid: false, message: t('reports_invalidDates') };
      }
      if (startDate > endDate) {
        return { isValid: false, message: t('reports_invalidDateRange') };
      }
      return { isValid: true };
    } catch (error) {
      logError('ValidateDateRange', error);
      return { isValid: false, message: t('reports_dateValidationError') };
    }
  }, [t]);

  const calculateReportMetrics = useCallback((receipts) => {
    try {
      console.log('Calculating report metrics', { receiptsCount: receipts.length });
      const totalRevenue = receipts.reduce((sum, receipt) => sum + Number(receipt.totalPrice || 0), 0);
      const totalPassengers = receipts.reduce((sum, receipt) => sum + Number(receipt.passengerCount || 0), 0);
      const uniqueTrips = [
        ...new Set(receipts.map((receipt) => `${receipt.date}-${receipt.origin}-${receipt.destination}`)),
      ];
      const metrics = {
        revenue: totalRevenue,
        reservations: receipts.length,
        trips: uniqueTrips.length,
        passengers: totalPassengers,
      };
      console.log('Report metrics calculated', metrics);
      return metrics;
    } catch (error) {
      logError('CalculateReportMetrics', error);
      toast.error(t('reports_metricsCalculationError'));
      return { revenue: 0, reservations: 0, trips: 0, passengers: 0 };
    }
  }, [t]);

  const generateReport = useCallback(
    async (type) => {
      setIsLoading(true);
      setError('');
      try {
        console.log('Generating report:', {
          type,
          selectedAgencyId,
          customRange,
          customOrigin,
          customDestination,
          receiptsCount: allReceipts.length,
        });
        let newReport = {};
        let filteredReceipts = allReceipts.filter((receipt) => receipt.agencyId === selectedAgencyId);

        if (type === 'Weekly') {
          const startDate = new Date(today);
          const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          filteredReceipts = filteredReceipts.filter((receipt) => {
            const receiptDate = new Date(receipt.date);
            return receiptDate >= startDate && receiptDate <= endDate;
          });

          const metrics = calculateReportMetrics(filteredReceipts);
          newReport = {
            id: reports.length + 1,
            agencyId: selectedAgencyId,
            type: t('reports_weekly'),
            period: `${startDate.toISOString().split('T')[0]} ${t('reports_to')} ${endDate.toISOString().split('T')[0]}`,
            ...metrics,
            receipts: filteredReceipts,
          };
        } else if (type === 'Monthly') {
          const startDate = new Date(today);
          startDate.setDate(1);
          const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          filteredReceipts = filteredReceipts.filter((receipt) => {
            const receiptDate = new Date(receipt.date);
            return receiptDate >= startDate && receiptDate <= endDate;
          });

          const metrics = calculateReportMetrics(filteredReceipts);
          newReport = {
            id: reports.length + 1,
            agencyId: selectedAgencyId,
            type: t('reports_monthly'),
            period: `${startDate.toISOString().split('T')[0].slice(0, 7)}`,
            ...metrics,
            receipts: filteredReceipts,
          };
        } else if (type === 'Custom') {
          const validation = validateDateRange(customRange.start, customRange.end);
          if (!validation.isValid) {
            throw new Error(validation.message);
          }

          filteredReceipts = filteredReceipts.filter((receipt) => {
            const receiptDate = new Date(receipt.date);
            const startDate = new Date(customRange.start);
            const endDate = new Date(customRange.end);
            const matchesDate = receiptDate >= startDate && receiptDate <= endDate;
            const matchesOrigin = customOrigin
              ? receipt.origin.toLowerCase().includes(customOrigin.toLowerCase())
              : true;
            const matchesDestination = customDestination
              ? receipt.destination.toLowerCase().includes(customDestination.toLowerCase())
              : true;
            return matchesDate && matchesOrigin && matchesDestination;
          });

          const metrics = calculateReportMetrics(filteredReceipts);
          newReport = {
            id: reports.length + 1,
            agencyId: selectedAgencyId,
            type: t('reports_custom'),
            period: `${customRange.start} ${t('reports_to')} ${customRange.end}${
              customOrigin || customDestination
                ? ` (${customOrigin || t('reports_any')} - ${customDestination || t('reports_any')})`
                : ''
            }`,
            ...metrics,
            receipts: filteredReceipts,
          };
        } else {
          throw new Error(t('reports_unknownReportType', { type }));
        }

        if (filteredReceipts.length === 0) {
          throw new Error(t('reports_noReceiptsFound'));
        }

        setReports((prev) => [...prev, newReport]);
        toast.success(t('reports_generateSuccess', { type: t(`reports_${type.toLowerCase()}`) }));
      } catch (error) {
        logError('GenerateReport', error);
        toast.error(error.message || t('reports_generateError'));
      } finally {
        setIsLoading(false);
      }
    },
    [allReceipts, selectedAgencyId, customRange, customOrigin, customDestination, reports, calculateReportMetrics, validateDateRange, t]
  );

  const exportReportToCSV = useCallback((report) => {
    try {
      console.log('Exporting report to CSV:', { reportId: report.id, type: report.type });
      const fields = [
        { label: t('reports_reservationId'), value: 'reservationId' },
        { label: t('reports_origin'), value: 'origin' },
        { label: t('reports_destination'), value: 'destination' },
        { label: t('reports_date'), value: 'date' },
        { label: t('reports_time'), value: 'time' },
        { label: t('reports_passengerCount'), value: 'passengerCount' },
        { label: t('reports_totalPrice'), value: 'totalPrice' },
        { label: t('reports_paymentStatus'), value: 'paymentStatus' },
        { label: t('reports_reservationStatus'), value: 'reservationStatus' },
      ];

      const data = report.receipts.map((receipt) => ({
        reservationId: receipt.reservationId,
        origin: receipt.origin,
        destination: receipt.destination,
        date: receipt.date,
        time: receipt.time,
        passengerCount: receipt.passengerCount,
        totalPrice: receipt.totalPrice,
        paymentStatus: receipt.paymentStatus,
        reservationStatus: receipt.reservationStatus,
      }));

      if (data.length === 0) {
        throw new Error(t('reports_noValidReceipts'));
      }

      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${report.type}_${report.id}_${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logSuccess('ExportCSV', 'CSV exported successfully', { reportId: report.id });
      toast.success(t('reports_exportCSVSuccess'));
    } catch (error) {
      logError('ExportCSV', error);
      toast.error(error.message || t('reports_exportCSVError'));
    }
  }, [t]);

  const exportReportToPDF = useCallback((report) => {
    try {
      console.log('Exporting report to PDF:', { reportId: report.id, type: report.type });
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 16px;">${t('reports_reportTitle', { type: report.type, period: report.period || 'N/A' })}</h1>
        <p><strong>${t('reports_revenue')}:</strong> ${(report.revenue || 0).toLocaleString('fr-FR')} XAF</p>
        <p><strong>${t('reports_reservations')}:</strong> ${report.reservations || 0}</p>
        <p><strong>${t('reports_trips')}:</strong> ${report.trips || 0}</p>
        <p><strong>${t('reports_passengers')}:</strong> ${report.passengers || 0}</p>
        <h2 style="font-size: 18px; margin-top: 16px; margin-bottom: 8px;">${t('reports_reservations')}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #007bff; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_reservationId')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_origin')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_destination')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_date')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_time')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_passengerCount')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_totalPrice')} (XAF)</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_paymentStatus')}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('reports_reservationStatus')}</th>
            </tr>
          </thead>
          <tbody>
            ${report.receipts.map(
              (receipt) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.reservationId || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.origin || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.destination || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.date || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.time || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.passengerCount || 0}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${(receipt.totalPrice || 0).toLocaleString('fr-FR')}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.paymentStatus || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${receipt.reservationStatus || 'N/A'}</td>
                </tr>
              `
            ).join('')}
          </tbody>
        </table>
      `;

      html2pdf()
        .from(element)
        .set({
          margin: 1,
          filename: `report_${report.type}_${report.id}_${new Date().toISOString()}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .save();
      logSuccess('ExportPDF', 'PDF exported successfully', { reportId: report.id });
      toast.success(t('reports_exportPDFSuccess'));
    } catch (error) {
      logError('ExportPDF', error);
      toast.error(error.message || t('reports_exportPDFError'));
    }
  }, [t]);

  const handleSort = useCallback(
    (key) => {
      try {
        console.log('Sorting reports by:', { key, currentSortConfig: sortConfig });
        setSortConfig((prev) => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
      } catch (error) {
        logError('HandleSort', error);
        toast.error(t('reports_sortError'));
      }
    },
    [sortConfig, t]
  );

  const sortedReports = useMemo(() => {
    try {
      console.log('Sorting reports', { sortConfig, reportsCount: reports.length });
      return [...reports]
        .filter((report) => report.agencyId === selectedAgencyId)
        .sort((a, b) => {
          const aValue = a[sortConfig.key] ?? '';
          const bValue = b[sortConfig.key] ?? '';
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
    } catch (error) {
      logError('SortedReportsMemo', error);
      toast.error(t('reports_sortError'));
      return [];
    }
  }, [reports, sortConfig, selectedAgencyId, t]);

  const filteredReports = useMemo(() => {
    try {
      console.log('Filtering reports', { filterType, sortedReportsCount: sortedReports.length });
      return filterType ? sortedReports.filter((report) => report.type === filterType) : sortedReports;
    } catch (error) {
      logError('FilteredReportsMemo', error);
      toast.error(t('reports_filterError'));
      return [];
    }
  }, [sortedReports, filterType, t]);

  const toggleReport = useCallback(
    (id) => {
      try {
        console.log('Toggling report:', { id, currentExpanded: expandedReport });
        setExpandedReport((prev) => (prev === id ? null : id));
      } catch (error) {
        logError('ToggleReport', error);
        toast.error(t('reports_toggleError'));
      }
    },
    [expandedReport, t]
  );

  // Permission check for page access
  if (!canViewReports) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" color="error">
              {t('reports_noPermission')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('reports_requiredRoles', { role: role || t('reports_noRole') })}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 2 }}
              aria-label={t('reports_returnToDashboard')}
            >
              {t('reports_returnToDashboard')}
            </Button>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress aria-label={t('reports_loading')} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {t('reports_loading')}
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
              {t('reports_error', { error })}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
              aria-label={t('reports_retry')}
            >
              {t('reports_retry')}
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }}>
              {t('reports_contactSupport')}
            </Typography>
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
            <Breadcrumb title={t('reports_pageTitle')}>
              <Typography
                variant="subtitle2"
                color="primary"
                className="link-breadcrumb"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <ReceiptIcon sx={{ mr: 1, fontSize: '1rem' }} />
                {t('reports_pageTitle')}
              </Typography>
            </Breadcrumb>
            <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
              <CardHeader
                title={
                  <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    {t('reports_noAgencies')}
                    {isTemporaryRole && temporaryRoleExpiry && (
                      <Chip
                        label={t('reports_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
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
                  <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                  {t('reports_noAgenciesMessage')}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.open('https://support.example.com', '_blank')}
                  sx={{ mt: 2 }}
                  aria-label={t('reports_contactAdmin')}
                >
                  {t('reports_contactAdmin')}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate('/dashboard/default')}
                  sx={{ mt: 2, ml: 2 }}
                  aria-label={t('reports_returnToDashboard')}
                >
                  {t('reports_returnToDashboard')}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  try {
    console.log('Rendering Reports main UI', {
      filteredReportsCount: filteredReports.length,
      error,
      isLoading,
      renderTimestamp: new Date().toISOString(),
      role,
    });
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Breadcrumb title={`${t('reports_pageTitle')} - ${agencies.find((a) => a.id === selectedAgencyId)?.name || t('reports_agency')}`}>
              <Typography
                variant="subtitle2"
                color="primary"
                className="link-breadcrumb"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <ReceiptIcon sx={{ mr: 1, fontSize: '1rem' }} />
                {t('reports_pageTitle')}
              </Typography>
            </Breadcrumb>
            <Grid container spacing={gridSpacing}>
              <Grid item xs={12}>
                <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                  <CardHeader
                    title={
                      <Typography component="div" className="card-header" sx={{ display: 'flex', alignItems: 'center' }}>
                        <DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
                        {t('reports_pageTitle')} - {agencies.find((a) => a.id === selectedAgencyId)?.name || t('reports_agency')}
                        {isTemporaryRole && temporaryRoleExpiry && (
                          <Chip
                            label={t('reports_temporaryRole', { date: new Date(temporaryRoleExpiry).toLocaleString() })}
                            color="warning"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    }
                    action={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          select
                          label={t('reports_changeAgency')}
                          value={selectedAgencyId}
                          onChange={(e) => setSelectedAgencyId(e.target.value)}
                          variant="outlined"
                          sx={{ minWidth: 200 }}
                          InputProps={{
                            startAdornment: <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                          aria-label={t('reports_changeAgency')}
                        >
                          {agencies.map((agency) => (
                            <MenuItem key={agency.id} value={agency.id}>
                              {agency.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => generateReport('Weekly')}
                          disabled={isLoading}
                          startIcon={<CalendarTodayIcon />}
                          sx={{
                            '&:hover': {
                              backgroundColor: theme.palette.primary.dark,
                              transform: 'scale(1.05)',
                            },
                          }}
                          aria-label={t('reports_weeklyReport')}
                        >
                          {t('reports_weeklyReport')}
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => generateReport('Monthly')}
                          disabled={isLoading}
                          startIcon={<CalendarTodayIcon />}
                          sx={{
                            '&:hover': {
                              backgroundColor: theme.palette.primary.dark,
                              transform: 'scale(1.05)',
                            },
                          }}
                          aria-label={t('reports_monthlyReport')}
                        >
                          {t('reports_monthlyReport')}
                        </Button>
                      </Box>
                    }
                  />
                  <Divider />
                  <CardContent>
                    {error && (
                      <Alert severity="error" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <InfoIcon sx={{ mr: 1 }} />
                        {t('reports_error', { error })}
                      </Alert>
                    )}
                    {isLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress aria-label={t('reports_loading')} />
                      </Box>
                    )}
                    <Card sx={{ mb: 4, p: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <AddIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
                        {t('reports_generateCustomReport')}
                      </Typography>
                      <Grid container spacing={gridSpacing}>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label={t('reports_startDate')}
                            type="date"
                            value={customRange.start}
                            onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                            disabled={isLoading}
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            helperText={t('reports_startDateHelper')}
                            InputProps={{
                              startAdornment: <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                              inputProps: { max: today },
                            }}
                            sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                            aria-label={t('reports_startDate')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label={t('reports_endDate')}
                            type="date"
                            value={customRange.end}
                            onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                            disabled={isLoading}
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            helperText={t('reports_endDateHelper')}
                            InputProps={{
                              startAdornment: <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                              inputProps: { max: today },
                            }}
                            sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                            aria-label={t('reports_endDate')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label={t('reports_originOptional')}
                            value={customOrigin}
                            onChange={(e) => setCustomOrigin(e.target.value)}
                            placeholder={t('reports_originPlaceholder')}
                            disabled={isLoading}
                            variant="outlined"
                            helperText={t('reports_originHelper')}
                            InputProps={{
                              startAdornment: <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                            sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                            aria-label={t('reports_originOptional')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label={t('reports_destinationOptional')}
                            value={customDestination}
                            onChange={(e) => setCustomDestination(e.target.value)}
                            placeholder={t('reports_destinationPlaceholder')}
                            disabled={isLoading}
                            variant="outlined"
                            helperText={t('reports_destinationHelper')}
                            InputProps={{
                              startAdornment: <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                            sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: theme.palette.primary.main } }}
                            aria-label={t('reports_destinationOptional')}
                          />
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => generateReport('Custom')}
                            disabled={isLoading}
                            startIcon={<AddIcon />}
                            sx={{
                              '&:hover': {
                                backgroundColor: theme.palette.success.dark,
                                transform: 'scale(1.05)',
                              },
                            }}
                            aria-label={t('reports_generate')}
                          >
                            {isLoading ? t('reports_generating') : t('reports_generate')}
                          </Button>
                        </Grid>
                      </Grid>
                    </Card>
                    <Box sx={{ mb: 4 }}>
                      <TextField
                        select
                        label={t('reports_filterByType')}
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        variant="outlined"
                        sx={{ width: { xs: '100%', md: '200px' } }}
                        helperText={t('reports_filterByTypeHelper')}
                        InputProps={{
                          startAdornment: <SortIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        SelectProps={{
                          MenuProps: {
                            PaperProps: {
                              sx: { maxHeight: 300 },
                            },
                          },
                        }}
                        aria-label={t('reports_filterByType')}
                      >
                        <MenuItem value="">{t('reports_all')}</MenuItem>
                        {reportTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                    <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <Table aria-label={t('reports_table')}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                            <TableCell
                              sx={{ color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleSort('type')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <SortIcon sx={{ mr: 1 }} />
                                {t('reports_type')} {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{ color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleSort('period')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarTodayIcon sx={{ mr: 1 }} />
                                {t('reports_period')} {sortConfig.key === 'period' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{ color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleSort('revenue')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DescriptionIcon sx={{ mr: 1 }} />
                                {t('reports_revenue')} (XAF) {sortConfig.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{ color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleSort('reservations')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ReceiptIcon sx={{ mr: 1 }} />
                                {t('reports_reservations')} {sortConfig.key === 'reservations' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{ color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleSort('trips')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ReceiptIcon sx={{ mr: 1 }} />
                                {t('reports_trips')} {sortConfig.key === 'trips' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{ color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleSort('passengers')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ReceiptIcon sx={{ mr: 1 }} />
                                {t('reports_passengers')} {sortConfig.key === 'passengers' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ReceiptIcon sx={{ mr: 1 }} />
                                {t('reports_reservations')}
                              </Box>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredReports.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} align="center">
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                  {t('reports_noReports')}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredReports.map((report) => (
                              <React.Fragment key={report.id}>
                                <TableRow sx={{ '&:hover': { backgroundColor: 'action.hover' } }} aria-label={t('reports_reportRow', { id: report.id })}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <SortIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {report.type || 'N/A'}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <CalendarTodayIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                      {report.period || 'N/A'}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <DescriptionIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                      {(report.revenue || 0).toLocaleString('fr-FR')}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {report.reservations || 0}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {report.trips || 0}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                      {report.passengers || 0}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      color="primary"
                                      onClick={() => toggleReport(report.id)}
                                      startIcon={
                                        expandedReport === report.id ? <ExpandLessIcon /> : <ExpandMoreIcon />
                                      }
                                      sx={{
                                        '&:hover': {
                                          color: theme.palette.primary.dark,
                                          transform: 'scale(1.05)',
                                        },
                                      }}
                                      aria-label={expandedReport === report.id ? t('reports_hide', { count: (report.receipts || []).length }) : t('reports_view', { count: (report.receipts || []).length })}
                                    >
                                      {expandedReport === report.id ? t('reports_hide', { count: (report.receipts || []).length }) : t('reports_view', { count: (report.receipts || []).length })}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {expandedReport === report.id && (
                                  <TableRow>
                                    <TableCell colSpan={7} sx={{ backgroundColor: 'grey.100', transition: 'all 0.3s ease-in-out' }}>
                                      <Box sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                          <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => exportReportToCSV(report)}
                                            startIcon={<DownloadIcon />}
                                            sx={{
                                              '&:hover': {
                                                backgroundColor: theme.palette.primary.dark,
                                                transform: 'scale(1.05)',
                                              },
                                            }}
                                            aria-label={t('reports_exportCSV')}
                                          >
                                            {t('reports_exportCSV')}
                                          </Button>
                                          <Button
                                            variant="contained"
                                            color="error"
                                            onClick={() => exportReportToPDF(report)}
                                            startIcon={<DownloadIcon />}
                                            sx={{
                                              '&:hover': {
                                                backgroundColor: theme.palette.error.dark,
                                                transform: 'scale(1.05)',
                                              },
                                            }}
                                            aria-label={t('reports_exportPDF')}
                                          >
                                            {t('reports_exportPDF')}
                                          </Button>
                                        </Box>
                                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                          <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                          {t('reports_reservations')}
                                        </Typography>
                                        {(report.receipts || []).length === 0 ? (
                                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                            <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                            {t('reports_noReservations')}
                                          </Typography>
                                        ) : (
                                          <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                                            <Table size="small" aria-label={t('reports_reservationsTable')}>
                                              <TableHead>
                                                <TableRow sx={{ backgroundColor: 'grey.200' }}>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_reservationId')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_origin')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_destination')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <CalendarTodayIcon sx={{ mr: 1 }} />
                                                      {t('reports_date')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_time')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_passengerCount')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <DescriptionIcon sx={{ mr: 1 }} />
                                                      {t('reports_totalPrice')} (XAF)
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_paymentStatus')}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                      <ReceiptIcon sx={{ mr: 1 }} />
                                                      {t('reports_reservationStatus')}
                                                    </Box>
                                                  </TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {(report.receipts || []).map((receipt) => (
                                                  <TableRow key={receipt.reservationId} aria-label={t('reports_reservationRow', { id: receipt.reservationId })}>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                                        {receipt.reservationId || 'N/A'}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                                        {receipt.origin || 'N/A'}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                                        {receipt.destination || 'N/A'}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <CalendarTodayIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                                        {receipt.date || 'N/A'}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                                        {receipt.time || 'N/A'}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                                        {receipt.passengerCount || 0}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <DescriptionIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                                                        {(receipt.totalPrice || 0).toLocaleString('fr-FR')}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: receipt.paymentStatus === 'Paid' ? theme.palette.success.main : theme.palette.warning.main }} />
                                                        {t(`reports_payment${receipt.paymentStatus || 'Unknown'}`)}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <ReceiptIcon sx={{ mr: 1, color: receipt.reservationStatus === 'Confirmed' ? theme.palette.success.main : theme.palette.warning.main }} />
                                                        {t(`reports_reservation${receipt.reservationStatus || 'Unknown'}`)}
                                                      </Box>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </TableContainer>
                                        )}
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
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  } catch (error) {
    logError('RenderReports', error);
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary t={t}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" color="error">
              {t('reports_criticalError')}
            </Typography>
            <Typography variant="body2">
              {t('reports_unknownError', { error: error.message || t('reports_unknown') })}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('reports_resolveSteps')}
              <ul>
                <li>{t('reports_checkConsole')}</li>
                <li>{t('reports_installDependencies')}</li>
                <li>{t('reports_checkRouter')}</li>
                <li>{t('reports_reloadPage')}</li>
                <li>{t('reports_contactAdmin')}</li>
              </ul>
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 2 }}
              aria-label={t('reports_returnToDashboard')}
            >
              {t('reports_returnToDashboard')}
            </Button>
          </Box>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }
};

export default Reports;