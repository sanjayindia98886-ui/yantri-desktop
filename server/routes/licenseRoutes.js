const express = require("express");
const router = express.Router();
const licenseController = require("../controllers/licenseController");

// Existing License Routes
router.post("/verify", licenseController.verifyLicense);
router.post("/register", licenseController.registerLicense);

// 🆕 New Route: Sabhi Companies ka Days / Expiry Status dekhne ke liye
router.get("/all-status", licenseController.getAllLicensesStatus);

module.exports = router;