import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import { useMediaQuery, AppBar, Box, Toolbar, Alert, Button, Typography } from '@mui/material';
import { drawerWidth } from 'config.js';
import Header from './Header';
import Sidebar from './Sidebar';

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
    logError('ErrorBoundary', error, { componentStack: errorInfo.componentStack, component: 'MainLayout' });
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

// custom style
const Main = styled((props) => <main {...props} />)(({ theme }) => ({
  width: '100%',
  minHeight: '100vh',
  flexGrow: 1,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  [theme.breakpoints.up('md')]: {
    marginLeft: -drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`
  }
}));

const OutletDiv = styled((props) => <div {...props} />)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(3)
  },
  padding: theme.spacing(5)
}));

// ==============================|| MAIN LAYOUT ||============================== //

const MainLayout = () => {
  const theme = useTheme();
  const matchUpLg = useMediaQuery(theme.breakpoints.up('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  useEffect(() => {
    setDrawerOpen(matchUpLg);
    console.log('MainLayout mounted', { drawerOpen: matchUpLg });
    return () => {
      console.log('MainLayout unmounted');
    };
  }, [matchUpLg]);

  try {
    return (
      <ErrorBoundary>
        <Box sx={{ display: 'flex', width: '100%' }}>
          <AppBar position="fixed" sx={{ zIndex: 1200 }}>
            <Toolbar>
              <Header drawerOpen={drawerOpen} drawerToggle={handleDrawerToggle} />
            </Toolbar>
          </AppBar>
          <Sidebar drawerOpen={drawerOpen} drawerToggle={handleDrawerToggle} />
          <Main
            style={{
              ...(drawerOpen && {
                transition: theme.transitions.create('margin', {
                  easing: theme.transitions.easing.easeOut,
                  duration: theme.transitions.duration.enteringScreen
                }),
                marginLeft: 0,
                marginRight: 'inherit'
              })
            }}
          >
            <Box sx={theme.mixins.toolbar} />
            <OutletDiv>
              <Outlet />
            </OutletDiv>
          </Main>
        </Box>
      </ErrorBoundary>
    );
  } catch (error) {
    logError('MainLayoutRender', error);
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Render Error</Typography>
          <Typography>{error.message || 'Failed to render the application.'}</Typography>
          <Typography variant="caption">Check the console for detailed logs.</Typography>
          <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }
};

export default MainLayout;