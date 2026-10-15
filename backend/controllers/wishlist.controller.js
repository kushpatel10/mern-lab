const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

// Task 2: POST /wishlist/:productId - Add product to current user's wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate productId as valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // 2. Check if product exists in database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 3. Find authenticated customer from req.user._id
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (!customer.wishlist) {
      customer.wishlist = [];
    }

    // 4. Duplicate prevention check
    const isAlreadyWishlisted = customer.wishlist.some(
      (id) => id.toString() === productId.toString()
    );

    if (isAlreadyWishlisted) {
      return res.status(409).json({
        success: false,
        message: "Product already in wishlist"
      });
    }

    // 5. Add product ObjectId reference & save user
    customer.wishlist.push(productId);
    await customer.save();

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      count: customer.wishlist.length,
      wishlist: customer.wishlist
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error adding product to wishlist",
      error: error.message
    });
  }
};

// Task 3: GET /wishlist - Get current user's wishlist with populated product references
const getWishlist = async (req, res) => {
  try {
    // 1. Find authenticated user and populate wishlist reference
    const customer = await Customer.findById(req.user._id).populate({
      path: "wishlist",
      select: "name description price category image stock createdAt"
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Filter out any populated references that might be null (e.g., if a product was deleted)
    const validItems = (customer.wishlist || []).filter(
      (item) => item !== null && item !== undefined && item._id
    );

    return res.status(200).json({
      success: true,
      count: validItems.length,
      wishlist: validItems
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching wishlist",
      error: error.message
    });
  }
};

// Task 4: DELETE /wishlist/:productId - Remove product from current user's wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate productId as valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // 2. Find authenticated customer
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (!customer.wishlist) {
      customer.wishlist = [];
    }

    // 3. Check if product exists in customer's wishlist
    const itemIndex = customer.wishlist.findIndex(
      (id) => id.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in wishlist"
      });
    }

    // 4. Remove product reference & save
    customer.wishlist.splice(itemIndex, 1);
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      count: customer.wishlist.length,
      wishlist: customer.wishlist
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error removing product from wishlist",
      error: error.message
    });
  }
};

// Bonus Task 23: PATCH /wishlist/:productId/toggle - Toggle product in wishlist
const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // 2. Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 3. Find customer
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (!customer.wishlist) {
      customer.wishlist = [];
    }

    const itemIndex = customer.wishlist.findIndex(
      (id) => id.toString() === productId.toString()
    );

    if (itemIndex !== -1) {
      // Remove from wishlist
      customer.wishlist.splice(itemIndex, 1);
      await customer.save();

      return res.status(200).json({
        success: true,
        message: "Product removed from wishlist",
        saved: false,
        inWishlist: false,
        count: customer.wishlist.length,
        wishlist: customer.wishlist
      });
    } else {
      // Add to wishlist
      customer.wishlist.push(productId);
      await customer.save();

      return res.status(200).json({
        success: true,
        message: "Product added to wishlist",
        saved: true,
        inWishlist: true,
        count: customer.wishlist.length,
        wishlist: customer.wishlist
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error toggling wishlist",
      error: error.message
    });
  }
};

// Bonus Task 24: GET /wishlist/count - Get wishlist count for authenticated user
const getWishlistCount = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select("wishlist");
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const count = Array.isArray(customer.wishlist) ? customer.wishlist.length : 0;
    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching wishlist count",
      error: error.message
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount
};
