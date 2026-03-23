/**
 * Query router
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/queryController");
const { queryLimiter } = require("../middleware/rateLimiter");
const { queryRules } = require("../validators");

router.post("/", queryLimiter, queryRules, ctrl.queryCodebase);

module.exports = router;
