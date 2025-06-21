import React from "react";
import { Box, Typography, Alert, Button } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    // You can log error to an error reporting service here
    this.setState({ error, errorInfo });
    if (typeof window !== "undefined" && window.console) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught an error", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally, force a reload or call a parent reset handler
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />}>
            <Typography variant="h5" component="div" gutterBottom>
              Une erreur s'est produite.
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {this.state.error && this.state.error.toString()}
            </Typography>
            {this.state.errorInfo && (
              <details style={{ whiteSpace: "pre-wrap", textAlign: "left", margin: "0 auto", maxWidth: 600 }}>
                {this.state.errorInfo.componentStack}
              </details>
            )}
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={this.handleReset}>
              Réessayer
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;