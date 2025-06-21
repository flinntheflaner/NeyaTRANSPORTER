import React, { lazy } from 'react';
import { Outlet } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import Loadable from '../component/Loadable';
import PrivateRoute from './PrivateRoute';
import { Box, Alert, Typography, Button } from '@mui/material';

// Centralized Error Logging Utility
const logError = (context, error, additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code,
    status: error.status,
    ...additionalInfo
  });
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack, component: 'MainRoutes' });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6">Application Error</Typography>
            <Typography>
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </Typography>
            <Typography variant="caption">
              Details: {this.state.errorInfo?.componentStack.split('\n')[0]}
            </Typography>
            <Typography>
              Please check the console for detailed logs or contact support.
            </Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
              Retry
            </Button>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

// Lazy-loaded Components
const DashboardDefault = Loadable(lazy(() => import('../views/Dashboard/Default')));
const UtilsTypography = Loadable(lazy(() => import('../views/Utils/Typography')));
const SamplePage = Loadable(lazy(() => import('../views/SamplePage')));
const BusManagement = Loadable(lazy(() => import('../views/BusManagement')));
const RoutePlanning = Loadable(lazy(() => import('../views/RoutePlanning')));
const AgentManagement = Loadable(lazy(() => import('../views/AgentManagement')));
const ReservationTracking = Loadable(lazy(() => import('../views/ReservationTracking')));
const Reports = Loadable(lazy(() => import('../views/Reports')));
const Messages = Loadable(lazy(() => import('../views/Messages')));
const Actions = Loadable(lazy(() => import('../views/Actions')));
const CreateTransportCompany = Loadable(lazy(() => import('../views/CreateTransportCompany/CreateTransportCompany')));
const ManageTransportCompany = Loadable(lazy(() => import('../views/ManageTransportCompany')));
const JoinAgency = Loadable(lazy(() => import('../views/JoinAgency')));
const Login = Loadable(lazy(() => import('../views/Login')));
const Register = Loadable(lazy(() => import('../views/Register/AuthRegister')));
const Logout = Loadable(lazy(() => import('../views/Logout/AuthLogout')));

const MainRoutes = {
  path: '/',
  element: <ErrorBoundary><Outlet /></ErrorBoundary>,
  children: [
    // Public Routes (Unauthenticated)
    {
      path: '/application',
      element: <Outlet />,
      children: [
        { path: 'login', element: <Login />, key: 'login' },
        { path: 'register', element: <Register />, key: 'register' },
        { path: 'logout', element: <Logout />, key: 'logout' }
      ]
    },
    // Private Routes (Authenticated)
    {
      element: <PrivateRoute />,
      children: [
        {
          element: <MainLayout />,
          children: [
            { path: '/', element: <DashboardDefault />, key: 'home' },
            { path: '/dashboard/default', element: <DashboardDefault />, key: 'dashboard' },
            { path: '/utils/util-typography', element: <UtilsTypography />, key: 'typography' },
            { path: '/sample-page', element: <SamplePage />, key: 'sample' },
            { path: '/views/BusManagement', element: <BusManagement />, key: 'bus-management' },
            { path: '/views/RoutePlanning', element: <RoutePlanning />, key: 'route-planning' },
            { path: '/views/AgentManagement', element: <AgentManagement />, key: 'agent-management' },
            { path: '/views/ReservationTracking', element: <ReservationTracking />, key: 'reservation-tracking' },
            { path: '/views/Reports', element: <Reports />, key: 'reports' },
            { path: '/views/Messages', element: <Messages />, key: 'messages' },
            { path: '/actions', element: <Actions />, key: 'actions' },
            { path: '/create-transport-company', element: <CreateTransportCompany />, key: 'create-company' },
            { path: '/manage-transport-company', element: <ManageTransportCompany />, key: 'manage-company' },
            { path: '/join-agency', element: <JoinAgency />, key: 'join-agency' }
          ]
        }
      ]
    }
  ]
};

export default MainRoutes;