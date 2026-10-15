import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function CartItem({ item }) {
  const { updateQuantity, removeFromCart, actionInProgress } = useCart();
  const [localError, setLocalError] = useState("");

  if (!item || !item.product) return null;

  const { product, quantity } = item;
  const productId = product._id;
  const isUpdating = actionInProgress[productId] === "updating";
  const isRemoving = actionInProgress[productId] === "removing";

  const formattedUnitPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  const lineTotal = product.price * quantity;
  const formattedLineTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(lineTotal);

  const handleDecrease = async () => {
    if (quantity <= 1 || isUpdating || isRemoving) return;
    setLocalError("");
    const res = await updateQuantity(productId, quantity - 1);
    if (!res.success) {
      setLocalError(res.message);
      setTimeout(() => setLocalError(""), 3500);
    }
  };

  const handleIncrease = async () => {
    if (quantity >= product.stock || isUpdating || isRemoving) return;
    setLocalError("");
    const res = await updateQuantity(productId, quantity + 1);
    if (!res.success) {
      setLocalError(res.message);
      setTimeout(() => setLocalError(""), 3500);
    }
  };

  const handleRemove = async () => {
    if (isRemoving || isUpdating) return;
    setLocalError("");
    const res = await removeFromCart(productId);
    if (!res.success) {
      setLocalError(res.message);
      setTimeout(() => setLocalError(""), 3500);
    }
  };

  return (
    <div
      className={`cart-item-card ${isRemoving ? "item-removing" : ""}`}
      data-testid={`cart-item-${productId}`}
    >
      <div className="cart-item-image-wrapper">
        <Link to={`/products/${productId}`}>
          <img
            src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"}
            alt={product.name}
            className="cart-item-image"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
            }}
          />
        </Link>
      </div>

      <div className="cart-item-details">
        <div className="cart-item-header">
          <div>
            <span className="cart-item-category">{product.category}</span>
            <h3 className="cart-item-title">
              <Link to={`/products/${productId}`}>{product.name}</Link>
            </h3>
          </div>
          <div className="cart-item-total-price" id={`item-total-${productId}`}>
            {formattedLineTotal}
          </div>
        </div>

        <div className="cart-item-unit-price">
          {formattedUnitPrice} per unit
          {product.stock <= 5 && (
            <span className="stock-alert-pill">
              Only {product.stock} available
            </span>
          )}
        </div>

        {localError && (
          <div className="cart-item-error-alert" role="alert">
            {localError}
          </div>
        )}

        <div className="cart-item-bottom-row">
          {/* Quantity Controls (Section 14) */}
          <div className="cart-quantity-controls" data-testid={`qty-controls-${productId}`}>
            <button
              type="button"
              className="qty-ctrl-btn qty-decrease"
              onClick={handleDecrease}
              disabled={quantity <= 1 || isUpdating || isRemoving}
              title="Decrease quantity"
              id={`decrease-qty-${productId}`}
            >
              -
            </button>
            <span className="qty-ctrl-display" id={`qty-value-${productId}`}>
              {isUpdating ? <span className="mini-spinner"></span> : quantity}
            </span>
            <button
              type="button"
              className="qty-ctrl-btn qty-increase"
              onClick={handleIncrease}
              disabled={quantity >= product.stock || isUpdating || isRemoving}
              title={quantity >= product.stock ? "Maximum stock reached" : "Increase quantity"}
              id={`increase-qty-${productId}`}
            >
              +
            </button>
          </div>

          {/* Remove Button (Task 5) */}
          <button
            type="button"
            className="cart-item-remove-btn"
            onClick={handleRemove}
            disabled={isRemoving || isUpdating}
            id={`remove-cart-item-${productId}`}
          >
            {isRemoving ? (
              <>
                <span className="mini-spinner"></span>
                <span>Removing...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Remove</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CartItem;
