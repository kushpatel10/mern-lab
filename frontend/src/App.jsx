import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderConfirmation from "./pages/OrderConfirmation";
import { CartProvider } from "./context/CartContext";
import { getCustomerProfile, getWishlistCount } from "./services/api";

function App() {
  const [user, setUser] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await getCustomerProfile();
        setUser(response.data);
      } catch {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Fetch Wishlist count whenever user session changes
  useEffect(() => {
    const fetchCount = async () => {
      if (user) {
        try {
          const res = await getWishlistCount();
          if (typeof res.data.count === "number") {
            setWishlistCount(res.data.count);
          }
        } catch {
          setWishlistCount(0);
        }
      } else {
        setWishlistCount(0);
      }
    };

    fetchCount();
  }, [user]);

  if (initializing) {
    return (
      <div className="loading-container" style={{ minHeight: "100vh" }}>
        <div className="spinner"></div>
        <p>Loading ShopKart...</p>
      </div>
    );
  }

  return (
    <Router>
      <CartProvider user={user}>
        <Navbar user={user} setUser={setUser} wishlistCount={wishlistCount} />
        <main>
          <Routes>
            <Route
              path="/register"
              element={user ? <Navigate to="/home" replace /> : <Register />}
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/home" replace /> : <Login setUser={setUser} />}
            />
            <Route
              path="/home"
              element={<Home user={user} setUser={setUser} />}
            />
            <Route
              path="/products"
              element={
                <Products
                  user={user}
                  onWishlistCountChange={setWishlistCount}
                />
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProductDetails
                  user={user}
                  onWishlistCountChange={setWishlistCount}
                />
              }
            />
            <Route
              path="/wishlist"
              element={
                <Wishlist
                  user={user}
                  onWishlistCountChange={setWishlistCount}
                />
              }
            />
            <Route
              path="/cart"
              element={<Cart user={user} />}
            />
            <Route
              path="/checkout"
              element={<Checkout user={user} />}
            />
            <Route
              path="/orders"
              element={<Orders user={user} />}
            />
            <Route
              path="/order-success/:id"
              element={<OrderConfirmation />}
            />
            <Route
              path="/"
              element={<Navigate to={user ? "/home" : "/products"} replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/products" replace />}
            />
          </Routes>
        </main>
      </CartProvider>
    </Router>
  );
}

export default App;
