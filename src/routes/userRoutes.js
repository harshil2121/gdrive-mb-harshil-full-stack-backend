const express = require("express");
const router = express.Router();
const user = require("../controller/userController");

router.post("/google", user.googleLogin);
router.post("/google/callback", user.googleCallBack);
router.post("/revoke-access", user.googleRevokeAccess);

module.exports = router;
