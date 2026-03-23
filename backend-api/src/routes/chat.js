/**
 * Chat router — history per project.
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/chatController");
const { projectIdRules } = require("../validators");

router.get("/:projectId", projectIdRules, ctrl.getChatHistory);
router.delete("/:projectId", projectIdRules, ctrl.clearChatHistory);

module.exports = router;
