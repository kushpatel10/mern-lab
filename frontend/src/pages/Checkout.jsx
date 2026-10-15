import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CheckoutForm from "../components/CheckoutForm";
import RazorpayModal from "../components/RazorpayModal";
import { createPaymentOrder, verifyPayment } from "../services/api";

function Checkout({ user }) {
  const { cartItems, totalItems, subtotal, resetCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);

  // Razorpay states
  const [checkoutData, setCheckoutData] = useState(null);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [useSandboxFallback, setUseSandboxFallback] = useState(false);

  // Form input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setServerError(null);
  };

  // Task 3: Client-side validation rules
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone Number is required";
    } else if (cleanPhone.length < 10) {
      newErrors.phone = "Phone must contain at least 10 digits";
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = "Address Line is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    const cleanPincode = formData.pincode.replace(/[^0-9]/g, "");
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (cleanPincode.length !== 6) {
      newErrors.pincode = "Pincode must contain 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Load Razorpay checkout.js script helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Payment Verification Handler (invoked by either Real Razorpay or Sandbox Modal)
  const handlePaymentVerification = async ({
    shopKartOrderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }) => {
    setSubmitting(true);
    setServerError(null);
    setPaymentNotice("Verifying payment signature with server...");

    try {
      const response = await verifyPayment({
        shopKartOrderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (response.data?.success) {
        // Task 5: Clear global cart state only after verified payment
        resetCart();
        setIsSandboxModalOpen(false);
        // Task 6: Navigate to order confirmation page
        navigate(`/order-success/${shopKartOrderId}`);
      } else {
        throw new Error(response.data?.message || "Payment verification failed");
      }
    } catch (err) {
      console.error("Payment verification failed:", err);
      const msg =
        err.response?.data?.message ||
        "Payment signature verification failed. Your cart has not been cleared.";
      setServerError(msg);
      setPaymentNotice(null);
      setIsSandboxModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentFailure = (errorMessage) => {
    setServerError(errorMessage);
    setPaymentNotice(null);
    setIsSandboxModalOpen(false);
    setSubmitting(false);
  };

  // Task 4: Submit Checkout Form -> Call /orders/create-payment-order
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setServerError(null);
    setPaymentNotice(null);

    // 1. Client-side form validation
    const isValid = validateForm();
    if (!isValid) {
      return; // Do not call backend if basic client validation fails
    }

    if (cartItems.length === 0) {
      setServerError("Your cart is empty. Please add items before checking out.");
      return;
    }

    setSubmitting(true);

    try {
      // 2. Call backend to validate stock, recalculate server total, and generate Razorpay Order
      const res = await createPaymentOrder({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      });

      const data = res.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to create payment order");
      }

      setCheckoutData(data);

      // Check if user requested sandbox or standard Razorpay
      if (useSandboxFallback) {
        setIsSandboxModalOpen(true);
        setSubmitting(false);
        return;
      }

      // Try loading standard Razorpay Checkout
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        // Fallback to sandbox modal if CDN is unavailable or offline
        setIsSandboxModalOpen(true);
        setSubmitting(false);
        return;
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "ShopKart",
        description: `ShopKart Order #${data.shopKartOrderId}`,
        order_id: data.razorpayOrderId,
        handler: async function (response) {
          await handlePaymentVerification({
            shopKartOrderId: data.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: formData.fullName,
          contact: formData.phone,
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", function (response) {
        console.error("Razorpay Payment Failed:", response.error);
        handlePaymentFailure(
          response.error?.description ||
            "Payment failed. Your cart has not been cleared. Please try again."
        );
      });

      paymentObject.open();
      setSubmitting(false);
    } catch (err) {
      console.error("Error creating payment order:", err);
      const msg = err.response?.data?.message || err.message || "Failed to process checkout.";
      setServerError(msg);
      setSubmitting(false);
    }
  };

  // Unauthenticated view
  if (!user) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="state-container auth-state">
            <div className="empty-cart-icon">🔒</div>
            <h2 className="empty-title">Authentication Required</h2>
            <p className="state-message">
              Please log in to your ShopKart account to proceed with checkout.
            </p>
            <Link to="/login" className="browse-products-btn" id="checkout-login-btn">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart view
  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="state-container empty-state">
            <div className="empty-cart-icon">🛒</div>
            <h2 className="empty-title">Your Cart is Empty</h2>
            <p className="state-message">
              You don't have any items to checkout. Explore our catalog and add items to your cart.
            </p>
            <Link to="/products" className="browse-products-btn" id="checkout-browse-btn">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedSubtotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(subtotal);

  return (
    <div className="checkout-page">
      <div className="checkout-hero-section">
        <div className="checkout-hero-content">
          <div className="checkout-breadcrumb">
            <Link to="/cart" className="breadcrumb-back-link">
              ← Return to Cart
            </Link>
            <span className="breadcrumb-separator">•</span>
            <span className="breadcrumb-current">Secure Checkout</span>
          </div>
          <h1 className="checkout-page-title">Complete Your Order</h1>
        </div>
      </div>

      <div className="checkout-container">
        {serverError && (
          <div className="checkout-error-banner" id="checkout-error-alert" role="alert">
            <span className="error-banner-icon">⚠️</span>
            <div className="error-banner-content">
              <strong>Order Checkout Failed</strong>
              <p>{serverError}</p>
            </div>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setServerError(null)}
            >
              ×
            </button>
          </div>
        )}

        {paymentNotice && (
          <div className="checkout-info-banner" role="status">
            <div className="spinner-small"></div>
            <span>{paymentNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} noValidate>
          <div className="checkout-layout-grid">
            {/* Left Column: Shipping Form */}
            <div className="checkout-main-column">
              <CheckoutForm
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
              />

              {/* Payment Mode Preference Box */}
              <div className="payment-mode-box">
                <div className="payment-mode-header">
                  <span className="mode-icon">🛡️</span>
                  <div>
                    <strong>Payment Gateway Mode</strong>
                    <p className="text-muted">
                      Razorpay Test Mode integration is active. No real currency will be charged.
                    </p>
                  </div>
                </div>
                <div className="payment-toggle-group">
                  <label className="mode-toggle-label">
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={!useSandboxFallback}
                      onChange={() => setUseSandboxFallback(false)}
                    />
                    <span>Real Razorpay Checkout API (checkout.razorpay.com Test Mode popup)</span>
                  </label>
                  <label className="mode-toggle-label">
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={useSandboxFallback}
                      onChange={() => setUseSandboxFallback(true)}
                    />
                    <span>Sandbox Test Simulator (Offline fallback)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="checkout-sidebar-column">
              <div className="order-summary-card" id="order-summary-container">
                <h2 className="summary-card-title">Order Summary</h2>

                {/* Items snapshot list */}
                <div className="summary-items-list">
                  {cartItems.map((item) => {
                    const product = item.product || {};
                    const unitPrice = Number(product.price) || 0;
                    const itemTotal = unitPrice * (item.quantity || 1);

                    return (
                      <div key={product._id || item._id} className="summary-order-item">
                        <div className="summary-item-img-wrap">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="summary-item-img"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="summary-fallback-img">📦</span>
                          )}
                          <span className="summary-item-badge">{item.quantity}</span>
                        </div>
                        <div className="summary-item-details">
                          <span className="summary-item-name">{product.name}</span>
                          <span className="summary-item-qty-calc">
                            {item.quantity} × ₹{unitPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span className="summary-item-price">
                          ₹{itemTotal.toLocaleString("en-IN")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="summary-divider"></div>

                <div className="summary-line-item">
                  <span className="summary-label">Items ({totalItems}):</span>
                  <span className="summary-value">{formattedSubtotal}</span>
                </div>

                <div className="summary-line-item">
                  <span className="summary-label">Delivery Fee:</span>
                  <span className="summary-value text-green">FREE</span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-total-line">
                  <span className="summary-total-label">Total to Pay:</span>
                  <span className="summary-total-value" id="checkout-total-amount">
                    {formattedSubtotal}
                  </span>
                </div>

                <button
                  type="submit"
                  className="checkout-action-btn"
                  id="place-order-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-btn"></span>
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <span>Place Order (Pay ₹{subtotal.toLocaleString("en-IN")})</span>
                  )}
                </button>

                <div className="checkout-trust-badges">
                  <div className="trust-item">
                    <span>🔒</span>
                    <span>256-Bit SSL Encrypted Payment</span>
                  </div>
                  <div className="trust-item">
                    <span>⚡</span>
                    <span>Instant Order Confirmation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Razorpay Interactive Sandbox Simulation Modal */}
      <RazorpayModal
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
        checkoutData={checkoutData}
        onPaymentSuccess={handlePaymentVerification}
        onPaymentFailure={handlePaymentFailure}
      />
    </div>
  );
}

export default Checkout;
