import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logoutCustomer } from "../services/api";
import { useCart } from "../context/CartContext";

function Navbar({ user, setUser, wishlistCount }) {
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to={user ? "/home" : "/products"} className="nav-brand">
          <span className="brand-icon">🛒</span> ShopKart
        </Link>

        <div className="nav-links">
          <NavLink
            to="/products"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav-link" : "nav-link"
            }
          >
            Products
          </NavLink>

          <NavLink
            to="/wishlist"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav-link" : "nav-link"
            }
            id="nav-wishlist-link"
          >
            Wishlist
            {user && typeof wishlistCount === "number" ? (
              <span className="wishlist-badge" id="wishlist-count-badge">
                ({wishlistCount})
              </span>
            ) : null}
          </NavLink>

          <NavLink
            to="/cart"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav-link" : "nav-link"
            }
            id="nav-cart-link"
          >
            Cart
            {user ? (
              <span className="cart-badge" id="cart-count-badge">
                ({totalItems})
              </span>
            ) : null}
          </NavLink>

          {user ? (
            <>
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  isActive ? "nav-link active-nav-link" : "nav-link"
                }
                id="nav-orders-link"
              >
                Orders
              </NavLink>
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  isActive ? "nav-link active-nav-link" : "nav-link"
                }
              >
                Dashboard
              </NavLink>
              <div className="user-badge">
                <span className="avatar">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </span>
                <span>{user.fullName}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn" id="logout-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive ? "nav-link active-nav-link" : "nav-link"
                }
              >
                Login
              </NavLink>
              <NavLink to="/register" className="nav-link nav-btn-primary">
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
