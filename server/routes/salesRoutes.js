const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.post('/save', saleController.saveVoucherSale);
router.get('/summary', saleController.getPartySalesSummary);
router.get('/details/:saleId', saleController.getVoucherDetails);
router.put('/update/:saleId', saleController.updateVoucherSale);
router.delete('/delete/:saleId', saleController.deleteVoucherSale);
router.post('/move/:saleId', saleController.moveVoucherSale);

module.exports = router;