const express = require("express");
const router = express.Router();
const licenseController = require("../controllers/licenseController");

// License Routes
router.post("/verify", licenseController.verifyLicense);
router.post("/register", licenseController.registerLicense);

module.exports = router;