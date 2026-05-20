import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DatasetProvider } from './context/DatasetContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <DatasetProvider>
            <AppRoutes />
          </DatasetProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
