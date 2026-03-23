/**
 * Projects router
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/projectController");
const { createProjectRules, projectIdRules } = require("../validators");

router.get("/", ctrl.listProjects);
router.post("/", createProjectRules, ctrl.createProject);
router.get("/:projectId", projectIdRules, ctrl.getProject);
router.delete("/:projectId", projectIdRules, ctrl.deleteProject);

module.exports = router;
