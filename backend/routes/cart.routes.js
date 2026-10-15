const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart
} = require("../controllers/cart.controller");
const protect = require("../middlewares/auth.middleware");

// All cart routes require authentication
router.use(protect);

// Root cart endpoints
router.get("/", getCart);
router.delete("/", clearCart);

// Product-specific cart endpoints
router.post("/:productId", addToCart);
router.patch("/:productId", updateCartQuantity);
router.delete("/:productId", removeFromCart);

module.exports = router;
