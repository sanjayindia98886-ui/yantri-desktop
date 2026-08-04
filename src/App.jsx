import React, { useEffect, useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import HeaderNav from './components/layout/HeaderNav';
import AppRoutes from './routes/AppRoutes';
import { PermissionProvider } from './context/PermissionContext';
import { getCompanyId, getLicenseKey } from './utils/companyService';

export default function App() {
  const [hasLicense, setHasLicense] = useState(false);

  // useEffect(() => {
    // जब भी ऐप में कहीं भी क्लिक हो, यह बटन या इनपुट पर अटका हुआ 'blur' हटा देगा
   // const handleGlobalClick = (e) => {
     // if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
      //  setTimeout(() => {
       //   document.activeElement.blur();
       // }, 50);
     // }
   // };

   // window.addEventListener('click', handleGlobalClick);
   // return () => window.removeEventListener('click', handleGlobalClick);
 // }, []);

  useEffect(() => {
    // चेक करें कि लोकल स्टोरेज में लाइसेंस और कंपनी आईडी मौजूद है या नहीं
    const companyId = getCompanyId();
    const licenseKey = getLicenseKey();

    if (companyId && licenseKey) {
      setHasLicense(true);
    } else {
      setHasLicense(false);
    }
  }, []);

  return (
    <PermissionProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {/* नेविगेशन बार तभी दिखेगा जब लाइसेंस सेट होगा */}
          {hasLicense && <HeaderNav />}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AppRoutes />
          </div>
        </div>
      </Router>
    </PermissionProvider>
  );
}