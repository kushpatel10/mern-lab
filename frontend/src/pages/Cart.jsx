import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";

function Cart({ user }) {
  const { cartItems, loading, error, totalItems, subtotal, fetchCart } = useCart();
  const [checkoutNotice, setCheckoutNotice] = useState(false);
  const navigate = useNavigate();

  const formattedSubtotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(subtotal);

  const handleCheckoutClick = () => {
    navigate("/checkout");
  };

  // State: Unauthenticated user
  if (!user) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="state-container auth-state" data-testid="cart-auth-state">
            <div className="empty-icon-heart">🛒</div>
            <h2 className="empty-title">Please Log In</h2>
            <p className="state-message">
              You must be logged in to view your shopping cart and complete purchases.
            </p>
            <Link to="/login" className="browse-products-btn" id="cart-login-btn">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Loading (Section 17)
  if (loading && cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-hero-section">
          <div className="cart-hero-content">
            <span className="cart-subtitle-badge">Checkout Readiness</span>
            <h1 className="cart-page-title">My Cart</h1>
          </div>
        </div>
        <div className="cart-container">
          <div className="state-container loading-state" data-testid="cart-loading">
            <div className="spinner"></div>
            <p className="state-message">Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Error (Section 17)
  if (error && cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-hero-section">
          <div className="cart-hero-content">
            <span className="cart-subtitle-badge">Checkout Readiness</span>
            <h1 className="cart-page-title">My Cart</h1>
          </div>
        </div>
        <div className="cart-container">
          <div className="state-container error-state" data-testid="cart-error">
            <div className="error-icon-circle">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="error-title">Unable to load your cart.</h3>
            <p className="state-message">{error}</p>
            <button
              type="button"
              className="retry-btn"
              onClick={fetchCart}
              id="cart-retry-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Empty Cart (Section 17)
  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-hero-section">
          <div className="cart-hero-content">
            <span className="cart-subtitle-badge">Checkout Readiness</span>
            <h1 className="cart-page-title">My Cart</h1>
            <p className="cart-count-text">0 items in your cart</p>
          </div>
        </div>

        <div className="cart-container">
          <div className="state-container empty-state" data-testid="cart-empty">
            <div className="empty-cart-icon">🛒</div>
            <h2 className="empty-title">Your cart is empty</h2>
            <p className="state-message">
              Looks like you haven't added anything yet. Explore our products and add what you love.
            </p>
            <Link
              to="/products"
              className="browse-products-btn"
              id="cart-browse-products-btn"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Populated Cart with Items and Order Summary (Section 13)
  return (
    <div className="cart-page">
      <div className="cart-hero-section">
        <div className="cart-hero-content">
          <div className="cart-header-top">
            <span className="cart-subtitle-badge">Checkout Readiness</span>
            <Link to="/products" className="continue-shopping-link">
              ← Continue Shopping
            </Link>
          </div>
          <h1 className="cart-page-title">My Cart</h1>
          <p className="cart-count-text">
            <strong>{totalItems}</strong> {totalItems === 1 ? "item" : "items"} ({cartItems.length} unique {cartItems.length === 1 ? "product" : "products"})
          </p>
        </div>
      </div>

      <div className="cart-container">
        <div className="cart-layout-grid">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-column" data-testid="cart-items-list">
            <div className="cart-items-header-bar">
              <span className="col-hdr-product">Product</span>
              <span className="col-hdr-total">Total</span>
            </div>

            <div className="cart-items-list">
              {cartItems.map((item) => (
                <CartItem key={item.product?._id || item._id} item={item} />
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary (Section 13 & 15) */}
          <div className="cart-summary-column">
            <div className="order-summary-card" data-testid="order-summary-card">
              <h2 className="summary-card-title">Order Summary</h2>

              <div className="summary-line-item">
                <span className="summary-label">Items ({totalItems}):</span>
                <span className="summary-value" id="summary-subtotal-items">{formattedSubtotal}</span>
              </div>

              <div className="summary-line-item">
                <span className="summary-label">Delivery:</span>
                <span className="summary-value text-green">FREE</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total-line">
                <span className="summary-total-label">Subtotal:</span>
                <span className="summary-total-value" id="summary-total-subtotal">{formattedSubtotal}</span>
              </div>

              <button
                type="button"
                className="checkout-action-btn"
                onClick={handleCheckoutClick}
                id="checkout-action-button"
              >
                Proceed to Checkout
              </button>

              {checkoutNotice && (
                <div className="checkout-notice-alert" role="status">
                  <span className="notice-icon">✓</span>
                  <span>Order ready! Checkout & Payment integration starts in Lab-06.</span>
                </div>
              )}

              <div className="summary-guarantees">
                <div className="guarantee-item">
                  <span className="guarantee-icon">🛡️</span>
                  <span>Safe and secure payments</span>
                </div>
                <div className="guarantee-item">
                  <span className="guarantee-icon">🚚</span>
                  <span>Free express delivery on all orders</span>
                </div>
                <div className="guarantee-item">
                  <span className="guarantee-icon">🔄</span>
                  <span>7-day hassle-free return policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
