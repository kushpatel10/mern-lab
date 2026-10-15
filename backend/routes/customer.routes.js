const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  logout,
  changePassword
} = require("../controllers/customer.controller");
const protect = require("../middlewares/auth.middleware");

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, getProfile);
router.post("/logout", logout);
router.patch("/change-password", protect, changePassword);

module.exports = router;
