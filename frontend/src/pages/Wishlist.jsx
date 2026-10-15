import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWishlist, removeFromWishlist } from "../services/api";
import WishlistCard from "../components/WishlistCard";

function Wishlist({ user, onWishlistCountChange }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchWishlistData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getWishlist();
      if (response.data && Array.isArray(response.data.wishlist)) {
        setWishlist(response.data.wishlist);
        if (onWishlistCountChange) {
          onWishlistCountChange(response.data.count ?? response.data.wishlist.length);
        }
      } else {
        setWishlist([]);
        if (onWishlistCountChange) onWishlistCountChange(0);
      }
    } catch (err) {
      console.error("Error fetching wishlist:", err);
      if (err.response?.status === 401) {
        // User is not authenticated
        setError("unauthorized");
      } else {
        setError("We couldn't load your wishlist.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistData();
  }, []);

  const handleRemove = async (productId) => {
    await removeFromWishlist(productId);
    setWishlist((prev) => {
      const updated = prev.filter((item) => item._id !== productId);
      if (onWishlistCountChange) {
        onWishlistCountChange(updated.length);
      }
      return updated;
    });
  };

  // State: Unauthorized (if user is not logged in)
  if (!loading && error === "unauthorized") {
    return (
      <div className="wishlist-page">
        <div className="wishlist-container">
          <div className="state-container auth-state" data-testid="wishlist-auth-state">
            <div className="empty-icon-heart">🔒</div>
            <h2 className="empty-title">Please Log In</h2>
            <p className="state-message">
              You must be logged in to view and manage your saved wishlist items.
            </p>
            <Link to="/login" className="browse-products-btn" id="wishlist-login-btn">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Loading State (Task 7 & 10)
  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-hero-section">
          <div className="wishlist-hero-content">
            <span className="wishlist-subtitle-badge">Saved For Later</span>
            <h1 className="wishlist-page-title">My Wishlist</h1>
          </div>
        </div>
        <div className="wishlist-container">
          <div className="state-container loading-state" data-testid="wishlist-loading">
            <div className="spinner"></div>
            <p className="state-message">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Error State (Task 7 & 11)
  if (error) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-hero-section">
          <div className="wishlist-hero-content">
            <span className="wishlist-subtitle-badge">Saved For Later</span>
            <h1 className="wishlist-page-title">My Wishlist</h1>
          </div>
        </div>
        <div className="wishlist-container">
          <div className="state-container error-state" data-testid="wishlist-error">
            <div className="error-icon-circle">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="error-title">Something went wrong.</h3>
            <p className="state-message">{error}</p>
            <button
              type="button"
              className="retry-btn"
              onClick={fetchWishlistData}
              id="wishlist-retry-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Empty Wishlist State (Task 7 & 9)
  if (wishlist.length === 0) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-hero-section">
          <div className="wishlist-hero-content">
            <span className="wishlist-subtitle-badge">Saved For Later</span>
            <h1 className="wishlist-page-title">My Wishlist</h1>
            <p className="wishlist-count-text">0 products saved</p>
          </div>
        </div>

        <div className="wishlist-container">
          <div className="state-container empty-state" data-testid="wishlist-empty">
            <div className="empty-icon-heart">❤️</div>
            <h2 className="empty-title">Your wishlist is empty</h2>
            <p className="state-message">
              Save products you love and find them here later.
            </p>
            <Link
              to="/products"
              className="browse-products-btn"
              id="browse-products-btn"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Populated Wishlist Grid (Task 6)
  return (
    <div className="wishlist-page">
      <div className="wishlist-hero-section">
        <div className="wishlist-hero-content">
          <div className="wishlist-header-top">
            <span className="wishlist-subtitle-badge">Saved For Later</span>
            <Link to="/products" className="continue-shopping-link">
              ← Continue Shopping
            </Link>
          </div>
          <h1 className="wishlist-page-title">My Wishlist</h1>
          <p className="wishlist-count-text">
            <strong>{wishlist.length}</strong> {wishlist.length === 1 ? "product" : "products"} saved
          </p>
        </div>
      </div>

      <div className="wishlist-container">
        <div className="wishlist-grid" data-testid="wishlist-grid">
          {wishlist.map((product) => (
            <WishlistCard
              key={product._id}
              product={product}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Wishlist;
