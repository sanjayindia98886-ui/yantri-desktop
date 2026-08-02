const db = require("../config/database");

// 1. VERIFY LICENSE & COMPANY STATUS
const verifyLicense = async function(req, res) {
  try {
    const license_key = req.body.license_key || req.query.license_key;
    const company_id = req.body.company_id || req.query.company_id;

    if (!license_key || !company_id) {
      return res.status(400).json({
        success: false,
        message: "License Key and Company ID are required"
      });
    }

    const query = "SELECT * FROM licenses WHERE license_key = $1 AND company_id = $2 AND status = 'ACTIVE'";
    const result = await db.query(query, [license_key, company_id]);

    if (result.rows && result.rows.length > 0) {
      const licenseData = result.rows[0];
      return res.json({
        success: true,
        valid: true,
        message: "License is Active and Valid",
        data: licenseData
      });
    } else {
      return res.status(403).json({
        success: false,
        valid: false,
        message: "Invalid or Expired License Key"
      });
    }
  } catch (err) {
    console.error("Error verifying license: " + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. REGISTER / ACTIVATE NEW LICENSE
const registerLicense = async function(req, res) {
  try {
    const body = req.body || {};
    const license_key = body.license_key;
    const company_id = body.company_id;
    const company_name = body.company_name || "My Company";

    if (!license_key || !company_id) {
      return res.status(400).json({
        success: false,
        message: "License Key and Company ID are required"
      });
    }

    // Insert or update Company Config
    const companyQuery = "INSERT INTO company_config (company_id, company_name) VALUES ($1, $2) ON CONFLICT (company_id) DO UPDATE SET company_name = EXCLUDED.company_name";
    await db.query(companyQuery, [company_id, company_name]);

    // Insert License Key
    const licenseQuery = "INSERT INTO licenses (license_key, company_id, status) VALUES ($1, $2, 'ACTIVE') ON CONFLICT (license_key) DO UPDATE SET status = 'ACTIVE'";
    await db.query(licenseQuery, [license_key, company_id]);

    return res.json({
      success: true,
      message: "License activated successfully!"
    });
  } catch (err) {
    console.error("Error registering license: " + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  verifyLicense: verifyLicense,
  registerLicense: registerLicense
};