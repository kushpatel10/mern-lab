import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartQuantity as apiUpdateCartQuantity,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from "../services/api";

const CartContext = createContext(null);

export const CartProvider = ({ children, user }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState({}); // { [productId]: 'adding' | 'updating' | 'removing' }

  // Fetch cart from backend
  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCart();
      if (response.data && Array.isArray(response.data.cart)) {
        setCartItems(response.data.cart);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
      if (err.response?.status === 401) {
        setCartItems([]);
      } else {
        setError("Unable to load your cart.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load cart on user change / login
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // 1. Add to Cart (Task 2)
  const addToCart = useCallback(async (productId) => {
    setActionInProgress((prev) => ({ ...prev, [productId]: "adding" }));
    setError(null);
    try {
      const response = await apiAddToCart(productId);
      if (response.data && Array.isArray(response.data.cart)) {
        setCartItems(response.data.cart);
      } else {
        await fetchCart();
      }
      return { success: true, message: response.data.message || "Added to cart" };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to add to cart";
      return { success: false, message, status: err.response?.status };
    } finally {
      setActionInProgress((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  }, [fetchCart]);

  // 2. Update Quantity (Task 4 & 14)
  const updateQuantity = useCallback(async (productId, quantity) => {
    setActionInProgress((prev) => ({ ...prev, [productId]: "updating" }));
    setError(null);
    try {
      const response = await apiUpdateCartQuantity(productId, quantity);
      if (response.data && Array.isArray(response.data.cart)) {
        setCartItems(response.data.cart);
      } else {
        await fetchCart();
      }
      return { success: true, message: "Quantity updated" };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update quantity";
      return { success: false, message, status: err.response?.status };
    } finally {
      setActionInProgress((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  }, [fetchCart]);

  // 3. Remove from Cart (Task 5)
  const removeFromCart = useCallback(async (productId) => {
    setActionInProgress((prev) => ({ ...prev, [productId]: "removing" }));
    setError(null);
    try {
      const response = await apiRemoveFromCart(productId);
      if (response.data && Array.isArray(response.data.cart)) {
        setCartItems(response.data.cart);
      } else {
        setCartItems((prev) => prev.filter((item) => (item.product?._id || item.product) !== productId));
      }
      return { success: true, message: "Item removed" };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to remove item";
      return { success: false, message, status: err.response?.status };
    } finally {
      setActionInProgress((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  }, [fetchCart]);

  // 4. Clear Cart
  const clearCart = useCallback(async () => {
    try {
      await apiClearCart();
      setCartItems([]);
      return { success: true };
    } catch (err) {
      console.error("Error clearing cart:", err);
      return { success: false };
    }
  }, []);

  // 5. Reset local cart state immediately (e.g. after verified order placement)
  const resetCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Derived Values (Task 15)
  // Total units for Navbar e.g. Keyboard x 2 + Mouse x 1 = 3
  const totalItems = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  // Subtotal in Rupees
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = Number(item.product?.price) || 0;
      const qty = Number(item.quantity) || 0;
      return acc + (price * qty);
    }, 0);
  }, [cartItems]);

  const getItemQuantity = useCallback((productId) => {
    const found = cartItems.find((item) => (item.product?._id || item.product) === productId);
    return found ? found.quantity : 0;
  }, [cartItems]);

  const isItemInCart = useCallback((productId) => {
    return cartItems.some((item) => (item.product?._id || item.product) === productId);
  }, [cartItems]);

  const value = {
    cartItems,
    loading,
    error,
    actionInProgress,
    totalItems,
    subtotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    resetCart,
    fetchCart,
    getItemQuantity,
    isItemInCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default CartContext;
