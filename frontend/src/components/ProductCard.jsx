import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addToWishlist, removeFromWishlist } from "../services/api";
import { useCart } from "../context/CartContext";

function ProductCard({ product, isWishlisted = false, onWishlistChange, user }) {
  if (!product) return null;

  const { _id, name, price, category, image, stock } = product;
  const navigate = useNavigate();
  const { addToCart, actionInProgress, getItemQuantity } = useCart();

  const [saved, setSaved] = useState(isWishlisted);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackType, setFeedbackType] = useState(""); // 'error' | 'success'

  useEffect(() => {
    setSaved(isWishlisted);
  }, [isWishlisted]);

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const isAddingToCart = actionInProgress[_id] === "adding";
  const cartQuantity = getItemQuantity(_id);

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (savingWishlist) return;

    if (!user) {
      navigate("/login", { state: { message: "Please log in to save products to your wishlist." } });
      return;
    }

    setSavingWishlist(true);
    setFeedbackMsg("");

    try {
      if (saved) {
        await removeFromWishlist(_id);
        setSaved(false);
        if (onWishlistChange) onWishlistChange(_id, false);
      } else {
        await addToWishlist(_id);
        setSaved(true);
        if (onWishlistChange) onWishlistChange(_id, true);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        navigate("/login");
        return;
      } else if (status === 409) {
        setSaved(true);
        if (onWishlistChange) onWishlistChange(_id, true);
      } else {
        setFeedbackType("error");
        setFeedbackMsg("Unable to save product. Please try again.");
        setTimeout(() => setFeedbackMsg(""), 3500);
      }
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleAddToCartClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAddingToCart || isOutOfStock) return;

    if (!user) {
      navigate("/login", { state: { message: "Please log in to add items to your cart." } });
      return;
    }

    setFeedbackMsg("");
    const res = await addToCart(_id);
    if (!res.success) {
      setFeedbackType("error");
      setFeedbackMsg(res.message);
      setTimeout(() => setFeedbackMsg(""), 3500);
    } else {
      setFeedbackType("success");
      setFeedbackMsg(cartQuantity > 0 ? `Added another (${cartQuantity + 1} total)` : "Added to cart!");
      setTimeout(() => setFeedbackMsg(""), 2500);
    }
  };

  return (
    <div className="product-card" data-testid={`product-card-${_id}`}>
      <div className="product-card-image-wrap">
        <Link to={`/products/${_id}`}>
          <img
            src={image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"}
            alt={name}
            className="product-card-image"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
            }}
          />
        </Link>
        <span className={`product-category-tag category-${category?.toLowerCase().replace(/\s+/g, "-")}`}>
          {category}
        </span>

        {/* Floating Heart Quick-Action for Wishlist */}
        <button
          type="button"
          className={`floating-wishlist-btn ${saved ? "active" : ""} ${savingWishlist ? "saving" : ""}`}
          onClick={handleWishlistClick}
          disabled={savingWishlist}
          title={saved ? "Remove from Wishlist" : "Add to Wishlist"}
          aria-label={saved ? "Remove from Wishlist" : "Add to Wishlist"}
          id={`floating-wishlist-${_id}`}
        >
          {savingWishlist ? "⏳" : saved ? "♥" : "♡"}
        </button>
      </div>

      <div className="product-card-content">
        <h3 className="product-card-name" title={name}>
          <Link to={`/products/${_id}`}>{name}</Link>
        </h3>

        <div className="product-card-category-sub">{category}</div>

        <div className="product-card-meta">
          <div className="product-card-price">{formattedPrice}</div>
          <div className={`product-card-stock ${isOutOfStock ? "stock-out" : isLowStock ? "stock-low" : "stock-in"}`}>
            {isOutOfStock ? "Out of stock" : `${stock} units left`}
          </div>
        </div>

        {feedbackMsg && (
          <div className={`card-feedback-pill ${feedbackType === "error" ? "feedback-error" : "feedback-success"}`} role="alert">
            {feedbackMsg}
          </div>
        )}

        <div className="product-card-actions">
          <Link
            to={`/products/${_id}`}
            className="view-details-btn"
            id={`view-details-${_id}`}
          >
            Details
          </Link>

          {/* Add to Cart Action (Task 7) */}
          <button
            type="button"
            className={`add-cart-action-btn ${cartQuantity > 0 ? "has-cart-items" : ""}`}
            onClick={handleAddToCartClick}
            disabled={isAddingToCart || isOutOfStock}
            id={`add-to-cart-${_id}`}
          >
            {isOutOfStock ? (
              "Out of Stock"
            ) : isAddingToCart ? (
              <>
                <span className="btn-spinner-inline"></span>
                <span>Adding...</span>
              </>
            ) : cartQuantity > 0 ? (
              <>
                <span>In Cart ({cartQuantity})</span>
                <span className="add-plus-badge">+</span>
              </>
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
