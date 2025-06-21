import React from 'react';
import 'react-phone-number-input/style.css';
// material-ui
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
// third-party
import { useSelector } from 'react-redux';
// project import
import theme from '/src/themes';
import Routes from '/src/routes/index';
import NavigationScroll from './NavigationScroll';
import { LanguageProvider } from '/src/views/LanguageContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ==============================|| APP ||============================== //

const App = () => {
  const customization = useSelector((state) => state.customization);

  return (
    <LanguageProvider>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme(customization)}>
          <CssBaseline />
          <NavigationScroll>
            <Routes />
          </NavigationScroll>
          <ToastContainer />
        </ThemeProvider>
      </StyledEngineProvider>
    </LanguageProvider>
  );
};

export default App;