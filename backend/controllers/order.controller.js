const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const { razorpay, verifySignature, generateSignature, RAZORPAY_KEY_ID } = require("../config/razorpay");

// Task 4: POST /orders/create-payment-order
// Validates cart, stock, pricing on server, creates pending ShopKart Order and Razorpay Order
const createPaymentOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    // 1. Validate shipping address fields
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    const { fullName, phone, addressLine1, city, state, pincode } = shippingAddress;

    if (
      !fullName?.trim() ||
      !phone?.trim() ||
      !addressLine1?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !pincode?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All shipping address fields (fullName, phone, addressLine1, city, state, pincode) are required."
      });
    }

    // Phone number format validation (at least 10 digits)
    const cleanedPhone = phone.replace(/[^0-9]/g, "");
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be at least 10 digits"
      });
    }

    // Pincode validation (6 digits)
    const cleanedPincode = pincode.replace(/[^0-9]/g, "");
    if (cleanedPincode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Pincode must contain exactly 6 digits"
      });
    }

    // 2. Load authenticated user & cart
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!customer.cart || customer.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot place order: Cart is empty"
      });
    }

    // 3. Re-verify every cart item against latest Product documents (Task 10)
    let calculatedTotal = 0;
    const orderItemsSnapshot = [];

    for (const item of customer.cart) {
      const productId = item.product?._id || item.product;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are no longer available in the catalogue"
        });
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}.`
        });
      }

      // Snapshot purchase-time details
      orderItemsSnapshot.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image
      });

      calculatedTotal += product.price * item.quantity;
    }

    // 4. Create Pending ShopKart Order
    const shopKartOrder = await Order.create({
      user: customer._id,
      items: orderItemsSnapshot,
      shippingAddress: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim()
      },
      totalAmount: calculatedTotal,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT"
    });

    // 5. Create Razorpay Order in paise (amount * 100)
    const amountInPaise = Math.round(calculatedTotal * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: shopKartOrder._id.toString()
    });

    // 6. Save Razorpay Order ID on ShopKart order
    shopKartOrder.razorpayOrderId = razorpayOrder.id;
    await shopKartOrder.save();

    // 7. Return safe checkout data to frontend
    return res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      shopKartOrderId: shopKartOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      amountInRupees: calculatedTotal,
      currency: "INR",
      key: RAZORPAY_KEY_ID
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error creating payment order",
      error: error.message
    });
  }
};

// Task 12 & 13: POST /orders/verify-payment
// Verifies HMAC-SHA256 signature, marks order PAID and PLACED, clears cart
const verifyPayment = async (req, res) => {
  try {
    const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!shopKartOrderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields (shopKartOrderId, razorpay_payment_id, razorpay_signature)"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(shopKartOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shopKartOrderId format"
      });
    }

    // 1. Load order from DB
    const order = await Order.findById(shopKartOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // 2. Enforce user ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot verify payment for another user's order"
      });
    }

    // 3. Verify HMAC signature using trusted order.razorpayOrderId from DB
    const isSignatureValid = verifySignature(order.razorpayOrderId, razorpay_payment_id, razorpay_signature);

    if (!isSignatureValid) {
      order.paymentStatus = "FAILED";
      await order.save();
      // Cart is NOT cleared
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature. Payment verification failed."
      });
    }

    // 4. Mark order as PAID & PLACED
    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    // 5. Decrement inventory stock for each purchased item
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // 6. Clear user's cart ONLY after payment verification succeeds
    const customer = await Customer.findById(req.user._id);
    if (customer) {
      customer.cart = [];
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and order placed successfully",
      order
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error verifying payment",
      error: error.message
    });
  }
};

// Task 15: GET /orders - Get current user's orders (sorted newest first)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching orders",
      error: error.message
    });
  }
};

// Section 17: GET /orders/:id - Get single order with ownership validation
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Enforce ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access another user's order"
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching order",
      error: error.message
    });
  }
};

// Bonus (+10 Marks): PATCH /orders/:id/status - Update order status progression
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error updating order status",
      error: error.message
    });
  }
};

// Sandbox signature helper for test mode simulation
const getSandboxSignature = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: "Missing razorpayOrderId or razorpayPaymentId"
      });
    }

    const signature = generateSignature(razorpayOrderId, razorpayPaymentId);
    return res.status(200).json({
      success: true,
      signature
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getSandboxSignature
};
