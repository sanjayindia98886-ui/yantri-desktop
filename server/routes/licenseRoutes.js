const express = require("express");
const router = express.Router();
const licenseController = require("../controllers/licenseController");

// 1. License Verification Route
router.post("/verify", licenseController.verifyLicense);

// 2. License Registration Route
router.post("/register", licenseController.registerLicense);

module.exports = router;