import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { supabase } from './supabase'; // Import Supabase client
import { toast } from 'react-toastify';

const Actions = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('User is not authenticated, redirecting to sign-in');
          navigate('/');
        }
      } catch (err) {
        console.error('Auth check error:', err.message, err.stack);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Typography color="error">{error.message}</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Transport Studio Actions
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        Welcome! Choose an action below:
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate('/create-transport-company')}
        >
          Create a Transport Company
        </Button>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => navigate('/join-agency')}
        >
          Join an Agency
        </Button>
      </Box>
    </Box>
  );
};

export default Actions;