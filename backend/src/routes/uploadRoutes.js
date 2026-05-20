const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

// Define the route for uploading data
// 'file' is the key expected in the multipart/form-data request
router.post('/upload', authMiddleware, upload.single('file'), uploadController.uploadFinancialData);
router.get('/uploads', authMiddleware, uploadController.getUploads);
router.delete('/uploads/:id', authMiddleware, uploadController.deleteUpload);
router.post('/reset', authMiddleware, uploadController.resetUserData);

module.exports = router;
