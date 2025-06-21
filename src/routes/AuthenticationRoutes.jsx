import React, { lazy } from 'react';
import { Outlet } from 'react-router-dom';
import 'react-phone-number-input/style.css';
import Loadable from '../component/Loadable';
import MinimalLayout from '../layout/MinimalLayout';

const AuthLogin = Loadable(lazy(() => import('../views/Login')));
const AuthRegister = Loadable(lazy(() => import('../views/Register')));
const AuthLogout = Loadable(lazy(() => import('../views/Logout/AuthLogout'))); // Add AuthLogout

const AuthenticationRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: '/application/login',
      element: <AuthLogin />
    },
    {
      path: '/application/register',
      element: <AuthRegister />
    },
    {
      path: '/application/logout',
      element: <AuthLogout /> // Add logout route
    }
  ]
};

export default AuthenticationRoutes;