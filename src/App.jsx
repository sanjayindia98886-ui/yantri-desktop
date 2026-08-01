import React, { useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import HeaderNav from './components/layout/HeaderNav';
import AppRoutes from './routes/AppRoutes';
import { PermissionProvider } from './context/PermissionContext';

export default function App() {

  useEffect(() => {
    // जब भी ऐप में कहीं भी क्लिक हो, यह बटन या इनपुट पर अटका हुआ 'blur' हटा देगा
    const handleGlobalClick = (e) => {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        setTimeout(() => {
          document.activeElement.blur();
        }, 50);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <PermissionProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <HeaderNav />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AppRoutes />
          </div>
        </div>
      </Router>
    </PermissionProvider>
  );
}