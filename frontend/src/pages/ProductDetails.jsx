import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getProductById,
  addToWishlist,
  removeFromWishlist,
  getWishlist
} from "../services/api";
import { useCart } from "../context/CartContext";

function ProductDetails({ user, onWishlistCountChange }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, getItemQuantity, actionInProgress } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [cartFeedback, setCartFeedback] = useState("");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [wishlistFeedback, setWishlistFeedback] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getProductById(id);
        const data = response.data.product || response.data;
        if (data && data._id) {
          setProduct(data);
        } else {
          setError("Product not found");
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        if (err.response?.status === 404) {
          setError("Product not found.");
        } else if (err.response?.status === 400) {
          setError("Invalid product ID.");
        } else {
          setError("Something went wrong while loading the product details.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (user && id) {
        try {
          const res = await getWishlist();
          if (res.data?.wishlist) {
            const found = res.data.wishlist.some((item) => item._id === id);
            setIsWishlisted(found);
          }
        } catch {
          setIsWishlisted(false);
        }
      } else {
        setIsWishlisted(false);
      }
    };

    checkWishlistStatus();
  }, [user, id]);

  const handleToggleWishlist = async () => {
    if (savingWishlist) return;

    if (!user) {
      navigate("/login", { state: { message: "Please log in to save products to your wishlist." } });
      return;
    }

    setSavingWishlist(true);
    setWishlistFeedback("");

    try {
      if (isWishlisted) {
        await removeFromWishlist(id);
        setIsWishlisted(false);
        setWishlistFeedback("Removed from wishlist");
        if (onWishlistCountChange) {
          const countRes = await getWishlist();
          onWishlistCountChange(countRes.data?.wishlist?.length ?? 0);
        }
      } else {
        await addToWishlist(id);
        setIsWishlisted(true);
        setWishlistFeedback("Saved to wishlist!");
        if (onWishlistCountChange) {
          const countRes = await getWishlist();
          onWishlistCountChange(countRes.data?.wishlist?.length ?? 1);
        }
      }
      setTimeout(() => setWishlistFeedback(""), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else if (err.response?.status === 409) {
        setIsWishlisted(true);
        setWishlistFeedback("Already in wishlist");
        setTimeout(() => setWishlistFeedback(""), 3000);
      } else {
        setWishlistFeedback("Unable to save product. Please try again.");
        setTimeout(() => setWishlistFeedback(""), 3500);
      }
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { message: "Please log in to add items to your cart." } });
      return;
    }

    if (!product || product.stock <= 0) return;

    const currentInCart = getItemQuantity(id);
    const targetQty = currentInCart > 0 ? currentInCart + quantity : quantity;
    if (targetQty > product.stock) {
      setCartFeedback(`Cannot add ${quantity} more. Maximum stock (${product.stock}) reached.`);
      setTimeout(() => setCartFeedback(""), 4000);
      return;
    }

    setCartFeedback("");
    if (currentInCart > 0) {
      const res = await updateQuantity(id, targetQty);
      if (res.success) {
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 3000);
      } else {
        setCartFeedback(res.message);
        setTimeout(() => setCartFeedback(""), 4000);
      }
    } else {
      const res = await addToCart(id);
      if (res.success) {
        if (quantity > 1) {
          await updateQuantity(id, quantity);
        }
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 3000);
      } else {
        setCartFeedback(res.message);
        setTimeout(() => setCartFeedback(""), 4000);
      }
    }
  };

  const handleQuantityChange = (delta) => {
    if (!product) return;
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (product.stock > 0 && next > product.stock) return product.stock;
      return next;
    });
  };

  // State 1: Loading
  if (loading) {
    return (
      <div className="product-details-page">
        <div className="state-container loading-state" data-testid="details-loading">
          <div className="spinner"></div>
          <p className="state-message">Loading product details...</p>
        </div>
      </div>
    );
  }

  // State 2: Error
  if (error || !product) {
    return (
      <div className="product-details-page">
        <div className="details-container">
          <div className="state-container error-state" data-testid="details-error">
            <div className="error-icon-circle">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="error-title">{error || "Product Not Found"}</h3>
            <p className="state-message">
              We couldn't retrieve the details for this product. It might have been removed or the link is incorrect.
            </p>
            <div className="error-actions">
              <button className="retry-btn" onClick={() => navigate("/products")}>
                Back to All Products
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="product-details-page">
      <div className="details-container">
        {/* Navigation Breadcrumbs */}
        <nav className="details-breadcrumbs">
          <Link to="/products" className="breadcrumb-link">
            ← Back to Products
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-category">{product.category}</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{product.name}</span>
        </nav>

        {/* Product Details Layout */}
        <div className="product-details-grid">
          {/* Left Column: Large Product Image */}
          <div className="details-image-card">
            <div className="large-image-wrapper">
              <img
                src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"}
                alt={product.name}
                className="large-product-image"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";
                }}
              />
            </div>
            <div className="image-badges-row">
              <span className={`product-category-tag category-${product.category?.toLowerCase().replace(/\s+/g, "-")}`}>
                {product.category}
              </span>
              <span className={`stock-status-badge ${isOutOfStock ? "badge-out" : product.stock <= 5 ? "badge-low" : "badge-in"}`}>
                {isOutOfStock ? "Out of Stock" : `${product.stock} units available`}
              </span>
            </div>
          </div>

          {/* Right Column: Product Information & Purchase Action */}
          <div className="details-info-card">
            <div className="details-header">
              <span className="details-category-label">{product.category}</span>
              <h1 className="details-title">{product.name}</h1>
              <div className="details-price-row">
                <span className="details-price">{formattedPrice}</span>
                <span className="details-tax-note">Inclusive of all taxes</span>
              </div>
            </div>

            <div className="details-divider"></div>

            <div className="details-section">
              <h3 className="section-heading">Description</h3>
              <p className="details-description">{product.description}</p>
            </div>

            <div className="details-divider"></div>

            <div className="details-section">
              <h3 className="section-heading">Availability</h3>
              <div className="stock-info-box">
                <span className={`stock-indicator-dot ${isOutOfStock ? "dot-out" : product.stock <= 5 ? "dot-low" : "dot-in"}`}></span>
                <span className="stock-text">
                  {isOutOfStock
                    ? "Currently Unavailable"
                    : product.stock <= 5
                    ? `Only ${product.stock} left in stock - order soon!`
                    : `In Stock (${product.stock} units left)`}
                </span>
              </div>
            </div>

            {!isOutOfStock && (
              <div className="quantity-selector-section">
                <label className="quantity-label">Quantity</label>
                <div className="quantity-counter">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="details-action-buttons">
              <button
                type="button"
                className={`add-to-cart-btn ${isOutOfStock ? "disabled" : ""} ${addedToast ? "added-active" : ""}`}
                id="add-to-cart-button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {addedToast ? (
                  <>
                    <span className="toast-icon">✓</span>
                    <span>Added {quantity} to Cart!</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`details-wishlist-btn ${isWishlisted ? "saved-active" : ""}`}
                id="details-wishlist-button"
                onClick={handleToggleWishlist}
                disabled={savingWishlist}
              >
                {savingWishlist ? (
                  <span>⏳ Saving...</span>
                ) : isWishlisted ? (
                  <>
                    <span className="heart-icon-filled">♥</span>
                    <span>Saved to Wishlist</span>
                  </>
                ) : (
                  <>
                    <span className="heart-icon-outline">♡</span>
                    <span>Add to Wishlist</span>
                  </>
                )}
              </button>
            </div>

            {wishlistFeedback && (
              <div className="wishlist-toast-feedback" role="status">
                {wishlistFeedback}
              </div>
            )}

            {cartFeedback && (
              <div className="cart-item-error-alert" role="alert" style={{ marginTop: "0.85rem" }}>
                {cartFeedback}
              </div>
            )}

            {/* Toast feedback for Add to Cart */}
            {addedToast && (
              <div className="cart-toast-alert" role="status">
                <span className="toast-icon">✓</span>
                <span>
                  Added {quantity} x <strong>{product.name}</strong> to your cart!
                </span>
              </div>
            )}

            {/* Trust and quality guarantees */}
            <div className="product-perks-grid">
              <div className="perk-item">
                <span className="perk-icon">🚚</span>
                <div>
                  <strong>Free Express Delivery</strong>
                  <p>On all orders above ₹499</p>
                </div>
              </div>
              <div className="perk-item">
                <span className="perk-icon">🛡️</span>
                <div>
                  <strong>Genuine Product</strong>
                  <p>100% authentic with warranty</p>
                </div>
              </div>
              <div className="perk-item">
                <span className="perk-icon">🔄</span>
                <div>
                  <strong>7 Days Replacement</strong>
                  <p>Hassle-free replacement policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
