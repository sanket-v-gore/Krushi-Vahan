const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/bills'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'bill_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ fileUrl: `/uploads/bills/${req.file.filename}` });
});

module.exports = router; 