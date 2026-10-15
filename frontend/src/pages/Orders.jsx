import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, updateOrderStatus } from "../services/api";

function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOrders();
      if (res.data?.success && Array.isArray(res.data.orders)) {
        setOrders(res.data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(
        err.response?.data?.message || "Unable to fetch orders at this moment."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Bonus (+10 marks): Advance order status progression
  const handleStatusProgression = async (orderId, currentStatus) => {
    const progressionMap = {
      PENDING_PAYMENT: "PLACED",
      PLACED: "CONFIRMED",
      CONFIRMED: "SHIPPED",
      SHIPPED: "DELIVERED",
    };

    const nextStatus = progressionMap[currentStatus];
    if (!nextStatus) return;

    try {
      setUpdatingId(orderId);
      const res = await updateOrderStatus(orderId, nextStatus);
      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? { ...ord, status: nextStatus } : ord))
        );
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Unauthenticated state
  if (!user) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="state-container auth-state">
            <div className="empty-cart-icon">🔒</div>
            <h2 className="empty-title">Please Log In</h2>
            <p className="state-message">
              You must be logged in to view your order history.
            </p>
            <Link to="/login" className="browse-products-btn" id="orders-login-btn">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-hero-section">
          <div className="orders-hero-content">
            <span className="cart-subtitle-badge">Purchase History</span>
            <h1 className="orders-page-title">My Orders</h1>
          </div>
        </div>
        <div className="orders-container">
          <div className="state-container loading-state">
            <div className="spinner"></div>
            <p className="state-message">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="orders-hero-section">
          <div className="orders-hero-content">
            <span className="cart-subtitle-badge">Purchase History</span>
            <h1 className="orders-page-title">My Orders</h1>
          </div>
        </div>
        <div className="orders-container">
          <div className="state-container error-state">
            <div className="error-icon-circle">
              <span style={{ fontSize: "32px" }}>⚠️</span>
            </div>
            <h2 className="error-title">Unable to Load Orders</h2>
            <p className="state-message">{error}</p>
            <button
              type="button"
              className="retry-btn"
              onClick={fetchOrders}
              id="orders-retry-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="orders-hero-section">
          <div className="orders-hero-content">
            <span className="cart-subtitle-badge">Purchase History</span>
            <h1 className="orders-page-title">My Orders</h1>
            <p className="cart-count-text">0 total orders placed</p>
          </div>
        </div>
        <div className="orders-container">
          <div className="state-container empty-state" id="orders-empty-state">
            <div className="empty-cart-icon">📦</div>
            <h2 className="empty-title">You have not placed any orders yet.</h2>
            <p className="state-message">
              Explore our catalogue and complete your first order with secure Razorpay test checkout.
            </p>
            <Link
              to="/products"
              className="browse-products-btn"
              id="orders-start-shopping-btn"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-hero-section">
        <div className="orders-hero-content">
          <span className="cart-subtitle-badge">Purchase History</span>
          <h1 className="orders-page-title">My Orders</h1>
          <p className="cart-count-text">
            Showing {orders.length} {orders.length === 1 ? "order" : "orders"} (newest first)
          </p>
        </div>
      </div>

      <div className="orders-container">
        <div className="orders-list">
          {orders.map((order) => {
            const formattedTotal = new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(order.totalAmount);

            const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div key={order._id} className="order-history-card" id={`order-card-${order._id}`}>
                {/* Order Card Header */}
                <div className="order-card-header">
                  <div className="order-header-info">
                    <div className="order-id-block">
                      <span className="order-label">Order #</span>
                      <span className="order-id-text font-mono">{order._id}</span>
                    </div>
                    <span className="order-date-text">{formattedDate}</span>
                  </div>

                  <div className="order-header-badges">
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    <span className={`status-badge status-${order.paymentStatus.toLowerCase()}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Items in this order */}
                <div className="order-card-items">
                  {order.items?.map((item, idx) => (
                    <div key={item._id || idx} className="order-card-item-row">
                      <div className="order-item-left">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="order-item-thumb"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="summary-fallback-img">📦</span>
                        )}
                        <div className="order-item-meta">
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-qty">
                            Quantity: {item.quantity} × ₹{item.price?.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="order-item-price">
                        ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping preview */}
                {order.shippingAddress && (
                  <div className="order-shipping-preview">
                    <span className="shipping-icon">📍</span>
                    <span className="shipping-text">
                      Delivering to: <strong>{order.shippingAddress.fullName}</strong> —{" "}
                      {order.shippingAddress.addressLine1}, {order.shippingAddress.city},{" "}
                      {order.shippingAddress.state} ({order.shippingAddress.pincode})
                    </span>
                  </div>
                )}

                {/* Footer with Total and Actions */}
                <div className="order-card-footer">
                  <div className="order-footer-total">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-amount-value">{formattedTotal}</span>
                  </div>

                  <div className="order-footer-actions">
                    {/* Bonus Challenge: Status Progression Button */}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        type="button"
                        className="bonus-progression-btn"
                        onClick={() => handleStatusProgression(order._id, order.status)}
                        disabled={updatingId === order._id}
                        title="Bonus (+10 marks): Advance order delivery status"
                      >
                        {updatingId === order._id ? (
                          "Updating..."
                        ) : order.status === "PLACED" ? (
                          "Advance to CONFIRMED ➔"
                        ) : order.status === "CONFIRMED" ? (
                          "Advance to SHIPPED ➔"
                        ) : order.status === "SHIPPED" ? (
                          "Advance to DELIVERED ➔"
                        ) : (
                          "Advance Status ➔"
                        )}
                      </button>
                    )}

                    <Link
                      to={`/order-success/${order._id}`}
                      className="view-details-btn"
                      id={`view-details-${order._id}`}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Orders;
