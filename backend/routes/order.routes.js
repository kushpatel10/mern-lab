const express = require("express");
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getSandboxSignature
} = require("../controllers/order.controller");
const protect = require("../middlewares/auth.middleware");

// All order routes require authentication
router.use(protect);

// Payment & Checkout workflows
router.post("/create-payment-order", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.post("/sandbox-signature", getSandboxSignature);

// Orders listing & single order
router.get("/", getMyOrders);
router.get("/:id", getOrderById);

// Order status update (Bonus)
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
