import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomerProfile } from "../services/api";

function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await getCustomerProfile();
        setProfile(response.data);
        if (setUser) {
          setUser(response.data);
        }
      } catch {
        if (setUser) {
          setUser(null);
        }
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate, setUser]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="home-page">
      <div className="welcome-banner">
        <span className="welcome-badge">Customer Account</span>
        <h1>Welcome, {profile.fullName}</h1>
        <p>You are logged into your ShopKart account.</p>
        <div style={{ marginTop: "1.2rem" }}>
          <button
            onClick={() => navigate("/products")}
            className="home-shop-btn"
          >
            Browse Products Catalogue 🛒
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2 className="card-title">Customer Profile</h2>
          <ul className="profile-list">
            <li className="profile-item">
              <span className="profile-label">Full Name</span>
              <span className="profile-value">{profile.fullName}</span>
            </li>
            <li className="profile-item">
              <span className="profile-label">Email Address</span>
              <span className="profile-value">{profile.email}</span>
            </li>
            <li className="profile-item">
              <span className="profile-label">Phone Number</span>
              <span className="profile-value">{profile.phone}</span>
            </li>
          </ul>
        </div>

        <div className="dashboard-card">
          <h2 className="card-title">Account Details</h2>
          <ul className="profile-list">
            <li className="profile-item">
              <span className="profile-label">Account Status</span>
              <span className="profile-value">Active</span>
            </li>
            <li className="profile-item">
              <span className="profile-label">Customer ID</span>
              <span className="profile-value" style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {profile._id || "N/A"}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
