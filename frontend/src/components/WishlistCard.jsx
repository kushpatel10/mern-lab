import React, { useState } from "react";
import { Link } from "react-router-dom";

function WishlistCard({ product, onRemove }) {
  const [removing, setRemoving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!product) return null;

  const { _id, name, price, category, image, stock } = product;

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;

  const handleRemoveClick = async (e) => {
    e.preventDefault();
    if (removing) return;

    setRemoving(true);
    setErrorMsg("");

    try {
      await onRemove(_id);
    } catch (err) {
      console.error("Error removing item:", err);
      setErrorMsg("Failed to remove item. Please try again.");
      setRemoving(false);
    }
  };

  return (
    <div className={`wishlist-card ${removing ? "card-removing" : ""}`} data-testid={`wishlist-card-${_id}`}>
      <div className="wishlist-card-image-wrap">
        <img
          src={image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"}
          alt={name}
          className="wishlist-card-image"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
          }}
        />
        <span className={`product-category-tag category-${category?.toLowerCase().replace(/\s+/g, "-")}`}>
          {category}
        </span>
      </div>

      <div className="wishlist-card-content">
        <h3 className="wishlist-card-name" title={name}>
          {name}
        </h3>

        <div className="wishlist-card-category-sub">{category}</div>

        <div className="wishlist-card-meta">
          <div className="wishlist-card-price">{formattedPrice}</div>
          <div className={`wishlist-card-stock ${isOutOfStock ? "stock-out" : isLowStock ? "stock-low" : "stock-in"}`}>
            {isOutOfStock ? "Out of stock" : `${stock} units left`}
          </div>
        </div>

        {errorMsg && (
          <div className="card-error-feedback" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="wishlist-card-actions">
          <Link
            to={`/products/${_id}`}
            className="view-details-btn"
            id={`wishlist-view-${_id}`}
          >
            View Details
          </Link>

          <button
            type="button"
            className="wishlist-remove-btn"
            onClick={handleRemoveClick}
            disabled={removing}
            id={`wishlist-remove-${_id}`}
          >
            {removing ? (
              <>
                <span className="btn-spinner"></span>
                <span>Removing...</span>
              </>
            ) : (
              <>
                <span>Remove</span>
                <span className="heart-icon-remove">♥</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WishlistCard;
