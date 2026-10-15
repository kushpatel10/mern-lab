import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderById } from "../services/api";

function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getOrderById(id);
        if (res.data?.success && res.data.order) {
          setOrder(res.data.order);
        } else {
          setError("Order not found");
        }
      } catch (err) {
        console.error("Error fetching order confirmation:", err);
        setError(
          err.response?.data?.message || "Unable to load order details."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-container">
          <div className="state-container loading-state">
            <div className="spinner"></div>
            <p className="state-message">Loading your order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-container">
          <div className="state-container error-state">
            <div className="error-icon-circle">
              <span style={{ fontSize: "32px" }}>⚠️</span>
            </div>
            <h2 className="error-title">Order Lookup Failed</h2>
            <p className="state-message">{error || "Could not find the requested order."}</p>
            <div className="confirmation-actions">
              <Link to="/orders" className="btn-secondary">
                View My Orders
              </Link>
              <Link to="/products" className="browse-products-btn">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formattedTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(order.totalAmount);

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        {/* Success Card Header */}
        <div className="confirmation-card">
          <div className="confirmation-header">
            <div className="success-icon-badge">✅</div>
            <h1 className="confirmation-title">Order Placed Successfully!</h1>
            <p className="confirmation-subtitle">
              Your order has been saved successfully and is now being processed.
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="order-meta-grid">
            <div className="meta-block">
              <span className="meta-label">Order ID</span>
              <span className="meta-value font-mono" id="confirmation-order-id">
                {order._id}
              </span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Placed On</span>
              <span className="meta-value">{formattedDate}</span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Order Status</span>
              <span className={`status-badge status-${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Payment Status</span>
              <span className={`status-badge status-paid`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="summary-divider"></div>

          {/* Purchased Items Snapshot */}
          <div className="confirmation-section">
            <h3 className="section-heading">Purchased Items Snapshot</h3>
            <div className="purchased-items-list">
              {order.items?.map((item, idx) => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                return (
                  <div key={item._id || idx} className="purchased-item-row">
                    <div className="purchased-item-info">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="purchased-item-thumb"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="summary-fallback-img">📦</span>
                      )}
                      <div>
                        <h4 className="purchased-item-title">{item.name}</h4>
                        <span className="purchased-item-meta">
                          Qty: {item.quantity} × ₹{item.price?.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="purchased-item-total">
                      ₹{itemTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="summary-divider"></div>

          {/* Delivery & Payment Details */}
          <div className="confirmation-details-columns">
            <div className="details-col">
              <h3 className="section-heading">Shipping Address</h3>
              {order.shippingAddress ? (
                <div className="address-display-box">
                  <p className="address-name">
                    <strong>{order.shippingAddress.fullName}</strong>
                  </p>
                  <p className="address-phone">📞 {order.shippingAddress.phone}</p>
                  <p className="address-line">{order.shippingAddress.addressLine1}</p>
                  <p className="address-line">
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                </div>
              ) : (
                <p>No address recorded</p>
              )}
            </div>

            <div className="details-col">
              <h3 className="section-heading">Payment Information</h3>
              <div className="payment-display-box">
                <div className="payment-line">
                  <span>Total Amount Paid:</span>
                  <strong className="text-primary-color" id="confirmation-total-amount">
                    {formattedTotal}
                  </strong>
                </div>
                {order.razorpayOrderId && (
                  <div className="payment-line">
                    <span>Razorpay Order ID:</span>
                    <span className="font-mono text-xs">{order.razorpayOrderId}</span>
                  </div>
                )}
                {order.razorpayPaymentId && (
                  <div className="payment-line">
                    <span>Razorpay Payment ID:</span>
                    <span className="font-mono text-xs">{order.razorpayPaymentId}</span>
                  </div>
                )}
                <div className="payment-line">
                  <span>Method:</span>
                  <span>Razorpay Standard Checkout (Test Mode)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="summary-divider"></div>

          {/* Primary Action Buttons */}
          <div className="confirmation-actions">
            <Link to="/orders" className="browse-products-btn" id="view-my-orders-btn">
              View My Orders
            </Link>
            <Link to="/products" className="btn-secondary" id="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
