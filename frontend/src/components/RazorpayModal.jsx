import React, { useState } from "react";
import { getSandboxSignature } from "../services/api";

function RazorpayModal({
  isOpen,
  onClose,
  checkoutData,
  onPaymentSuccess,
  onPaymentFailure,
}) {
  const [method, setMethod] = useState("card");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !checkoutData) return null;

  const { shopKartOrderId, razorpayOrderId, amountInRupees, key } = checkoutData;

  const handleSimulateSuccess = async () => {
    try {
      setLoading(true);
      // Generate a valid mock payment ID
      const mockPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Obtain authentic HMAC SHA256 signature from sandbox endpoint
      const sigRes = await getSandboxSignature({
        razorpayOrderId,
        razorpayPaymentId: mockPaymentId,
      });

      if (sigRes.data?.signature) {
        onPaymentSuccess({
          shopKartOrderId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: sigRes.data.signature,
        });
      } else {
        throw new Error("Unable to obtain sandbox signature");
      }
    } catch (err) {
      console.error("Sandbox payment simulation error:", err);
      onPaymentFailure(err.response?.data?.message || "Payment simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFailure = () => {
    onPaymentFailure(
      "Payment failed or declined by issuing bank. Your cart has not been cleared. Please try again."
    );
  };

  return (
    <div className="modal-backdrop" id="razorpay-sandbox-modal" role="dialog" aria-modal="true">
      <div className="rzp-modal-card">
        {/* Razorpay Sandbox Header */}
        <div className="rzp-header">
          <div className="rzp-header-top">
            <div className="rzp-logo-badge">
              <span className="rzp-icon">💳</span>
              <span className="rzp-title">Razorpay Test Checkout</span>
            </div>
            <button
              type="button"
              className="rzp-close-btn"
              onClick={onClose}
              disabled={loading}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="rzp-badge-mode">SANDBOX / TEST MODE</div>
          <div className="rzp-merchant-info">
            <span className="rzp-merchant-name">ShopKart Technologies</span>
            <span className="rzp-order-num">Order: {razorpayOrderId}</span>
          </div>
          <div className="rzp-amount-display">
            ₹{amountInRupees?.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Modal Body */}
        <div className="rzp-body">
          <div className="rzp-method-tabs">
            <button
              type="button"
              className={`rzp-tab ${method === "card" ? "active" : ""}`}
              onClick={() => setMethod("card")}
            >
              💳 Card
            </button>
            <button
              type="button"
              className={`rzp-tab ${method === "upi" ? "active" : ""}`}
              onClick={() => setMethod("upi")}
            >
              📱 UPI
            </button>
            <button
              type="button"
              className={`rzp-tab ${method === "netbanking" ? "active" : ""}`}
              onClick={() => setMethod("netbanking")}
            >
              🏦 NetBanking
            </button>
          </div>

          <div className="rzp-tab-content">
            {method === "card" && (
              <div className="rzp-dummy-form">
                <div className="rzp-input-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    readOnly
                    value="4111 •••• •••• 4111 (Test Visa)"
                    className="rzp-readonly-input"
                  />
                </div>
                <div className="rzp-input-row">
                  <div className="rzp-input-group">
                    <label>Expiry</label>
                    <input type="text" readOnly value="12/28" className="rzp-readonly-input" />
                  </div>
                  <div className="rzp-input-group">
                    <label>CVV</label>
                    <input type="text" readOnly value="123" className="rzp-readonly-input" />
                  </div>
                </div>
              </div>
            )}

            {method === "upi" && (
              <div className="rzp-dummy-form">
                <div className="rzp-input-group">
                  <label>Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    readOnly
                    value="success@razorpay"
                    className="rzp-readonly-input"
                  />
                </div>
                <p className="rzp-hint">Test UPI handle automatically approves payment in sandbox.</p>
              </div>
            )}

            {method === "netbanking" && (
              <div className="rzp-dummy-form">
                <div className="rzp-input-group">
                  <label>Select Test Bank</label>
                  <select className="rzp-readonly-input" defaultValue="HDFC">
                    <option value="HDFC">HDFC Bank (Test Simulator)</option>
                    <option value="ICICI">ICICI Bank (Test Simulator)</option>
                    <option value="SBI">State Bank of India (Test Simulator)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="rzp-test-instruction">
            <span className="info-icon">ℹ️</span>
            <span>
              This sandbox simulates Razorpay Standard Checkout with server-side HMAC-SHA256 signature verification.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="rzp-footer">
          <button
            type="button"
            className="rzp-btn rzp-btn-success"
            id="rzp-simulate-success-btn"
            onClick={handleSimulateSuccess}
            disabled={loading}
          >
            {loading ? "Verifying with Server..." : `Pay ₹${amountInRupees?.toLocaleString("en-IN")}`}
          </button>
          <button
            type="button"
            className="rzp-btn rzp-btn-failure"
            id="rzp-simulate-failure-btn"
            onClick={handleSimulateFailure}
            disabled={loading}
          >
            Simulate Payment Failure
          </button>
        </div>
      </div>
    </div>
  );
}

export default RazorpayModal;
