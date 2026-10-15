import React from "react";

function SearchBar({
  search,
  setSearch,
  category,
  setCategory,
  sort,
  setSort,
  onReset
}) {
  const categories = ["All Categories", "Electronics", "Fashion", "Books", "Home"];

  return (
    <div className="search-filter-container">
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          id="product-search-input"
          className="search-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => setSearch("")}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-controls-group">
        <div className="select-wrapper">
          <label htmlFor="category-select" className="visually-hidden">Category</label>
          <select
            id="category-select"
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat === "All Categories" ? "" : cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="select-wrapper">
          <label htmlFor="sort-select" className="visually-hidden">Sort By</label>
          <select
            id="sort-select"
            className="filter-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {(search || category || sort) && (
          <button
            type="button"
            className="reset-filters-btn"
            onClick={onReset}
            title="Reset all filters"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
