import React from "react";

function CheckoutForm({ formData, errors, onChange }) {
  return (
    <div className="checkout-form-container">
      <h2 className="checkout-section-title">Shipping Details</h2>
      <p className="checkout-section-subtitle">
        Enter the delivery address for your ShopKart order.
      </p>

      <div className="form-grid">
        {/* Full Name */}
        <div className="form-group full-width">
          <label htmlFor="fullName" className="form-label">
            Full Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            className={`form-input ${errors.fullName ? "input-error" : ""}`}
            placeholder="e.g. Aarav Sharma"
            value={formData.fullName}
            onChange={onChange}
            autoComplete="name"
          />
          {errors.fullName && (
            <span className="field-error-text" id="fullName-error">
              {errors.fullName}
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            Phone Number <span className="required-star">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className={`form-input ${errors.phone ? "input-error" : ""}`}
            placeholder="e.g. 9876543210 (10 digits)"
            value={formData.phone}
            onChange={onChange}
            maxLength="15"
            autoComplete="tel"
          />
          {errors.phone && (
            <span className="field-error-text" id="phone-error">
              {errors.phone}
            </span>
          )}
        </div>

        {/* Pincode */}
        <div className="form-group">
          <label htmlFor="pincode" className="form-label">
            Pincode <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="pincode"
            name="pincode"
            className={`form-input ${errors.pincode ? "input-error" : ""}`}
            placeholder="e.g. 560001 (6 digits)"
            value={formData.pincode}
            onChange={onChange}
            maxLength="6"
            autoComplete="postal-code"
          />
          {errors.pincode && (
            <span className="field-error-text" id="pincode-error">
              {errors.pincode}
            </span>
          )}
        </div>

        {/* Address Line 1 */}
        <div className="form-group full-width">
          <label htmlFor="addressLine1" className="form-label">
            Address Line <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="addressLine1"
            name="addressLine1"
            className={`form-input ${errors.addressLine1 ? "input-error" : ""}`}
            placeholder="e.g. 22 MG Road, Floor 4, Suite 402"
            value={formData.addressLine1}
            onChange={onChange}
            autoComplete="street-address"
          />
          {errors.addressLine1 && (
            <span className="field-error-text" id="addressLine1-error">
              {errors.addressLine1}
            </span>
          )}
        </div>

        {/* City */}
        <div className="form-group">
          <label htmlFor="city" className="form-label">
            City <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="city"
            name="city"
            className={`form-input ${errors.city ? "input-error" : ""}`}
            placeholder="e.g. Bengaluru"
            value={formData.city}
            onChange={onChange}
            autoComplete="address-level2"
          />
          {errors.city && (
            <span className="field-error-text" id="city-error">
              {errors.city}
            </span>
          )}
        </div>

        {/* State */}
        <div className="form-group">
          <label htmlFor="state" className="form-label">
            State <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="state"
            name="state"
            className={`form-input ${errors.state ? "input-error" : ""}`}
            placeholder="e.g. Karnataka"
            value={formData.state}
            onChange={onChange}
            autoComplete="address-level1"
          />
          {errors.state && (
            <span className="field-error-text" id="state-error">
              {errors.state}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CheckoutForm;
