/**
 * Files router — serves file tree for a project.
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/filesController");
const { projectIdRules } = require("../validators");

router.get("/:projectId", projectIdRules, ctrl.getFileTree);

module.exports = router;
