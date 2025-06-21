import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormHelperText,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import * as Yup from 'yup';
import { Formik } from 'formik';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumber } from 'react-phone-number-input';
import { toast } from 'react-toastify';
import { supabase } from '../utils/supabase';

const JoinAgency = () => {
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
          navigate('/application/login');
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

  const handleJoinSubmit = async (values, { setSubmitting }) => {
    try {
      console.log('Join agency submit initiated with values:', values);
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Validate agency code
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('agency_code')
        .eq('agency_code', values.agencyCode)
        .single();

      if (agencyError || !agencyData) {
        console.error('Agency validation error:', agencyError);
        throw new Error('Invalid agency code');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Submit join request
      const { error: joinError } = await supabase
        .from('join_requests')
        .insert({
          agency_code: values.agencyCode,
          full_name: values.fullName,
          email: user.email,
          phone: values.phone,
          role: values.role,
          status: 'pending'
        });

      if (joinError) {
        console.error('Join request insert error:', joinError);
        throw new Error('Failed to submit join request');
      }

      console.log('Join request submitted successfully');
      toast.success('Join request sent! Awaiting admin approval.');
      navigate('/actions');
    } catch (error) {
      console.error('Join agency error:', error.message, error.stack);
      toast.error(error.message || 'Invalid agency code or request failed');
    } finally {
      setSubmitting(false);
      console.log('Join agency submit completed');
    }
  };

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
        Join an Agency
      </Typography>
      <Typography variant="body2" align="center" color="textSecondary" gutterBottom>
        Enter the agency code and your details to request to join.
      </Typography>
      <Formik
        initialValues={{
          agencyCode: '',
          fullName: '',
          phone: '',
          role: '',
          submit: null
        }}
        validationSchema={Yup.object().shape({
          agencyCode: Yup.string()
            .matches(/^[A-Z]{2,3}-\d{3}$/, 'Agency code must be in format ABC-123')
            .required('Agency code is required'),
          fullName: Yup.string().max(255).required('Full name is required'),
          phone: Yup.string()
            .required('Phone number is required')
            .test('valid-phone', 'Must be a valid phone number', value => {
              if (!value) return false;
              try {
                const phoneNumber = parsePhoneNumber(value);
                return phoneNumber ? phoneNumber.isValid() : false;
              } catch {
                return false;
              }
            }),
          role: Yup.string().required('Role is required')
        })}
        onSubmit={handleJoinSubmit}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue }) => (
          <form noValidate onSubmit={handleSubmit}>
            <TextField
              fullWidth
              error={Boolean(touched.agencyCode && errors.agencyCode)}
              helperText={touched.agencyCode && errors.agencyCode}
              label="Agency Code (e.g., STA-456)"
              margin="normal"
              name="agencyCode"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.agencyCode}
              variant="outlined"
            />

            <TextField
              fullWidth
              error={Boolean(touched.fullName && errors.fullName)}
              helperText={touched.fullName && errors.fullName}
              label="Full Name"
              margin="normal"
              name="fullName"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.fullName}
              variant="outlined"
            />

            <Box sx={{ mt: 2, mb: 1 }}>
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry="US"
                value={values.phone}
                onChange={value => setFieldValue('phone', value)}
                onBlur={handleBlur}
                name="phone"
                placeholder="Enter phone number"
                style={{
                  border: `1px solid ${errors.phone && touched.phone ? theme => theme.palette.error.main : '#ccc'}`,
                  borderRadius: '4px',
                  padding: '10px',
                  fontSize: '16px'
                }}
              />
              {touched.phone && errors.phone && (
                <FormHelperText error>{errors.phone}</FormHelperText>
              )}
            </Box>

            <FormControl fullWidth sx={{ mt: 2, mb: 1 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={values.role}
                onChange={handleChange}
                onBlur={handleBlur}
                name="role"
                label="Role"
                error={Boolean(touched.role && errors.role)}
              >
                <MenuItem value="">
                  <em>Select a role</em>
                </MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="guichetier">Guichetier</MenuItem>
              </Select>
              {touched.role && errors.role && (
                <FormHelperText error>{errors.role}</FormHelperText>
              )}
            </FormControl>

            <Button
              color="primary"
              disabled={isSubmitting}
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              sx={{ mt: 2 }}
            >
              Request to Join
            </Button>
          </form>
        )}
      </Formik>
    </Box>
  );
};

export default JoinAgency;