import React, { useState } from "react";
import api from "../utils/api";
import { setCompanyId, setLicenseKey } from "../utils/companyService";

const LicenseModal = ({ isOpen, onClose, onSuccess }) => {
  const [licenseKey, setLicenseKeyInput] = useState("");
  const [companyId, setCompanyIdInput] = useState("");
  const [companyName, setCompanyNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await api.post("/license/register", {
        license_key: licenseKey,
        company_id: companyId,
        company_name: companyName
      });

      if (response.data && response.data.success) {
        setCompanyId(companyId);
        setLicenseKey(licenseKey);
        alert("License Activated Successfully!");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        setErrorMsg(response.data.message || "Failed to activate license.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Activation Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: "#fff",
        padding: "25px",
        borderRadius: "8px",
        width: "380px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
      }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>Activate Software License</h3>
        {errorMsg && <p style={{ color: "red", fontSize: "14px" }}>{errorMsg}</p>}
        
        <form onSubmit={handleActivate}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Company ID:</label>
            <input
              type="text"
              required
              placeholder="e.g. COMP_RADHE_101"
              value={companyId}
              onChange={(e) => setCompanyIdInput(e.target.value)}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Company Name:</label>
            <input
              type="text"
              required
              placeholder="e.g. Radhe Enterprise"
              value={companyName}
              onChange={(e) => setCompanyNameInput(e.target.value)}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>License Key:</label>
            <input
              type="text"
              required
              placeholder="e.g. LIC-XXXX-YYYY"
              value={licenseKey}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {loading ? "Activating..." : "Activate License"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LicenseModal;