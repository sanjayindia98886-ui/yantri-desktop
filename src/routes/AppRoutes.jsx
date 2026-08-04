import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { usePermission } from "../context/PermissionContext";

import api from "../utils/api";
import { getCompanyId, getLicenseKey } from "../utils/companyService";
import LicenseModal from "../components/LicenseModal";

import Login from "../pages/Login";
import PartyF1 from "../pages/PartyF1";
import VoucherSaleF2 from "../pages/VoucherSaleF2";
import VoucherYantriF3 from "../pages/VoucherYantriF3";
import YantriF4 from "../pages/YantriF4";
import MasterF5 from "../pages/MasterF5";
import ResultF6 from "../pages/ResultF6";
import SummaryF7 from "../pages/SummaryF7";
import BalanceHistoryF8 from "../pages/BalanceHistoryF8";
import SaleLCF9 from "../pages/SaleLCF9";
import AccountF10 from "../pages/AccountF10";
import BalanceSheetF11 from "../pages/BalanceSheetF11";
import ProfitLossF12 from "../pages/ProfitLossF12";
import GameMaster from "../pages/GameMaster";
import ChangePassword from "../pages/ChangePassword";
import AccessControl from "../pages/AccessControl";

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user } = usePermission();

  if (!user || !user.id) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRoutes() {
  const { user } = usePermission();
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Background License Verification (App crash hone se bachaega)
  const checkSoftwareLicense = async () => {
    try {
      const companyId = getCompanyId();
      const licenseKey = getLicenseKey();

      if (!companyId || !licenseKey) {
        setShowLicenseModal(true);
        return;
      }

      const res = await api.post("/license/verify", {
        license_key: licenseKey,
        company_id: companyId
      });

      if (!res.data || !res.data.valid) {
        setShowLicenseModal(true);
      }
    } catch (err) {
      console.error("License check error:", err.message);
      // Backend error aane par bhi app ko crash hone se bachaega
    }
  };

  // useEffect(() => {
    // checkSoftwareLicense();
  // }, []);

  return (
    <>
      {/* License Modal */}
      <LicenseModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onSuccess={() => {
          setShowLicenseModal(false);
          window.location.reload();
        }}
      />

      {/* Normal Page Routes */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/party"
          element={
            <ProtectedRoute>
              <PartyF1 userRole={user?.role} />
            </ProtectedRoute>
          }
        />
        <Route path="/voucher-sale" element={<ProtectedRoute><VoucherSaleF2 /></ProtectedRoute>} />
        <Route path="/voucher-yantri" element={<ProtectedRoute><VoucherYantriF3 /></ProtectedRoute>} />
        <Route path="/yantri" element={<ProtectedRoute><YantriF4 /></ProtectedRoute>} />
        <Route path="/master" element={<ProtectedRoute><MasterF5 /></ProtectedRoute>} />
        <Route path="/result" element={<ProtectedRoute><ResultF6 /></ProtectedRoute>} />
        <Route path="/summary" element={<ProtectedRoute><SummaryF7 /></ProtectedRoute>} />
        <Route path="/balance-history" element={<ProtectedRoute><BalanceHistoryF8 /></ProtectedRoute>} />
        <Route path="/sale-lc" element={<ProtectedRoute><SaleLCF9 /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountF10 /></ProtectedRoute>} />
        <Route path="/balance-sheet" element={<ProtectedRoute><BalanceSheetF11 /></ProtectedRoute>} />
        <Route path="/profit-loss" element={<ProtectedRoute><ProfitLossF12 /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><GameMaster /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/access-control" element={<ProtectedRoute><AccessControl /></ProtectedRoute>} />
      </Routes>
    </>
  );
}