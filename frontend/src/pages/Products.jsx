import React, { useState, useEffect } from "react";
import { getProducts, getWishlist } from "../services/api";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";

function Products({ user, onWishlistCountChange }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");

  // Debounce search input to avoid excessive API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Sync user's wishlist when user changes
  useEffect(() => {
    const fetchUserWishlist = async () => {
      if (user) {
        try {
          const res = await getWishlist();
          if (res.data?.wishlist) {
            const ids = new Set(res.data.wishlist.map((item) => item._id));
            setWishlistIds(ids);
            if (onWishlistCountChange) onWishlistCountChange(ids.size);
          }
        } catch {
          setWishlistIds(new Set());
        }
      } else {
        setWishlistIds(new Set());
      }
    };

    fetchUserWishlist();
  }, [user]);

  // Fetch products from backend API
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (category && category.trim()) {
        params.category = category.trim();
      }
      if (sort && sort.trim()) {
        params.sort = sort.trim();
      }

      const response = await getProducts(params);
      if (response.data && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Something went wrong while loading products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const params = {};
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (category && category.trim()) {
        params.category = category.trim();
      }
      if (sort && sort.trim()) {
        params.sort = sort.trim();
      }

      try {
        const response = await getProducts(params);
        if (!isMounted) return;
        if (response.data && Array.isArray(response.data.products)) {
          setProducts(response.data.products);
        } else if (Array.isArray(response.data)) {
          setProducts(response.data);
        } else {
          setProducts([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching products:", err);
        setError("Something went wrong while loading products.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, category, sort]);

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategory("");
    setSort("");
  };

  return (
    <div className="products-page">
      <div className="products-hero-section">
        <div className="products-hero-content">
          <span className="products-subtitle-badge">Catalogue & Discovery</span>
          <h1 className="products-page-title">Explore Our Products</h1>
          <p className="products-page-desc">
            Discover premium electronics, trendy fashion, captivating books, and essentials for your home.
          </p>
        </div>
      </div>

      <div className="products-container">
        {/* Search & Filter Toolbar */}
        <SearchBar
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          sort={sort}
          setSort={setSort}
          onReset={handleResetFilters}
        />

        {/* Status / Active Filter Bar */}
        <div className="products-toolbar-meta">
          {!loading && !error && (
            <div className="products-count-badge">
              Showing <strong>{products.length}</strong> {products.length === 1 ? "product" : "products"}
              {category && <span> in <em>{category}</em></span>}
              {debouncedSearch && <span> matching "<em>{debouncedSearch}</em>"</span>}
            </div>
          )}
        </div>

        {/* State 1: Loading State */}
        {loading && (
          <div className="state-container loading-state" data-testid="loading-state">
            <div className="spinner"></div>
            <p className="state-message">Loading products...</p>
          </div>
        )}

        {/* State 2: Error State */}
        {!loading && error && (
          <div className="state-container error-state" data-testid="error-state">
            <div className="error-icon-circle">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="error-title">Failed to load</h3>
            <p className="state-message">{error}</p>
            <button className="retry-btn" onClick={fetchProducts}>
              Try Again
            </button>
          </div>
        )}

        {/* State 3: Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="state-container empty-state" data-testid="empty-state">
            <div className="empty-icon-circle">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h3 className="empty-title">No products found.</h3>
            <p className="state-message">
              We couldn't find any products matching your search criteria. Try adjusting your filters or search terms.
            </p>
            <button className="clear-filter-action-btn" onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>
        )}

        {/* State 4: Product Grid (Dynamic List Rendering) */}
        {!loading && !error && products.length > 0 && (
          <div className="products-grid" data-testid="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isWishlisted={wishlistIds.has(product._id)}
                user={user}
                onWishlistChange={(productId, isAdded) => {
                  setWishlistIds((prev) => {
                    const next = new Set(prev);
                    if (isAdded) next.add(productId);
                    else next.delete(productId);
                    if (onWishlistCountChange) onWishlistCountChange(next.size);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;
