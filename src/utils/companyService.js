// LocalStorage helpers for Company and License
export const getCompanyId = () => {
  return localStorage.getItem("company_id") || "DEMO_COMP_101";
};

export const setCompanyId = (companyId) => {
  if (companyId) {
    localStorage.setItem("company_id", companyId);
  }
};

export const getLicenseKey = () => {
  return localStorage.getItem("license_key") || "";
};

export const setLicenseKey = (key) => {
  if (key) {
    localStorage.setItem("license_key", key);
  }
};