/**
 * Multer middleware for ZIP file uploads.
 * Validates file type and size before storing temporarily.
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config");

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
    cb(null, true);
  } else {
    cb(new Error("Only ZIP files are accepted"), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 1,
  },
});

module.exports = upload;
