const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

// Helper function to return populated cart with valid referenced products
const getPopulatedCart = async (userId) => {
  const customer = await Customer.findById(userId).populate({
    path: "cart.product",
    select: "name price description category image stock createdAt"
  });

  if (!customer) return [];

  // Filter out any entries where the referenced product is null/deleted
  return (customer.cart || []).filter(
    (item) => item.product !== null && item.product !== undefined && item.product._id
  );
};

// Task 2: POST /cart/:productId - Add product to cart or increment quantity if already in cart
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate productId ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // 2. Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 3. Check base stock
    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock"
      });
    }

    // 4. Find customer
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!customer.cart) {
      customer.cart = [];
    }

    // 5. Check if product already exists in cart
    const existingIndex = customer.cart.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (existingIndex > -1) {
      // Increase existing quantity by 1
      const newQuantity = customer.cart[existingIndex].quantity + 1;

      // Validate against stock
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more than available stock (${product.stock} available)`
        });
      }

      customer.cart[existingIndex].quantity = newQuantity;
    } else {
      // Add product with quantity = 1
      if (1 > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock (${product.stock} available)`
        });
      }

      customer.cart.push({
        product: productId,
        quantity: 1
      });
    }

    // 6. Save customer
    await customer.save();

    // 7. Return populated cart
    const populatedCart = await getPopulatedCart(customer._id);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: populatedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error adding product to cart",
      error: error.message
    });
  }
};

// Task 3: GET /cart - Get current authenticated user's cart populated with product details
const getCart = async (req, res) => {
  try {
    const populatedCart = await getPopulatedCart(req.user._id);

    return res.status(200).json({
      success: true,
      cart: populatedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching cart",
      error: error.message
    });
  }
};

// Task 4: PATCH /cart/:productId - Update product quantity
const updateCartQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // 1. Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // 2. Validate quantity type & value
    if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number"
      });
    }

    const numQty = parseInt(quantity, 10);

    if (numQty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1"
      });
    }

    // 3. Find product to verify stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (numQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock} available)`
      });
    }

    // 4. Find customer
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!customer.cart) {
      customer.cart = [];
    }

    // 5. Find item in cart
    const itemIndex = customer.cart.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart"
      });
    }

    // 6. Update quantity & save
    customer.cart[itemIndex].quantity = numQty;
    await customer.save();

    // 7. Return updated populated cart
    const populatedCart = await getPopulatedCart(customer._id);

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      cart: populatedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error updating cart quantity",
      error: error.message
    });
  }
};

// Task 5: DELETE /cart/:productId - Remove product from cart
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // 2. Find customer
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!customer.cart) {
      customer.cart = [];
    }

    // 3. Find item in cart
    const itemIndex = customer.cart.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart"
      });
    }

    // 4. Remove item & save
    customer.cart.splice(itemIndex, 1);
    await customer.save();

    // 5. Return updated populated cart
    const populatedCart = await getPopulatedCart(customer._id);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: populatedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error removing product from cart",
      error: error.message
    });
  }
};

// Optional: DELETE /cart - Clear all items in cart
const clearCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    customer.cart = [];
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart: []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error clearing cart",
      error: error.message
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart
};
