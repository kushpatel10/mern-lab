const express = require("express");
const router = express.Router();
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount
} = require("../controllers/wishlist.controller");
const protect = require("../middlewares/auth.middleware");

// All wishlist routes require authentication
router.use(protect);

// Specific sub-paths before dynamic :productId
router.get("/count", getWishlistCount);

// Root wishlist route: GET /wishlist
router.get("/", getWishlist);

// Toggle wishlist item (Bonus): PATCH /wishlist/:productId/toggle (and POST support)
router.patch("/:productId/toggle", toggleWishlist);
router.post("/:productId/toggle", toggleWishlist);

// Core endpoints: POST /wishlist/:productId and DELETE /wishlist/:productId
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);

module.exports = router;
