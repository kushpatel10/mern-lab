# ShopKart - MERN Stack E-Commerce Platform

A full-stack MERN (MongoDB, Express.js, React, Node.js) e-commerce application featuring customer authentication, product catalog, wishlist management, cart operations, order processing, and payment integration.

---

## 📁 Project Architecture

```
mern-lab/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controller logic
│   ├── middlewares/     # JWT authentication and validation middleware
│   ├── models/          # Mongoose database models (Customer, Product, Cart, Wishlist, Order)
│   ├── routes/          # Express API route definitions
│   ├── utils/           # Utility functions
│   ├── index.js         # Backend server entry point
│   ├── seed.js          # Product seeding script
│   ├── package.json     # Backend dependencies and scripts
│   └── .env.example     # Environment variable template
├── frontend/
│   ├── public/          # Static assets & SVG icons
│   ├── src/
│   │   ├── assets/      # Visual assets
│   │   ├── components/  # Reusable UI components (Navbar, Footer, ProductCard, etc.)
│   │   ├── context/     # React Context for global state (Auth, Cart, Wishlist)
│   │   ├── pages/       # Route views (Home, Products, Cart, Wishlist, Orders, Login, Signup)
│   │   ├── services/    # Axios API service handlers
│   │   ├── App.jsx      # Main application router
│   │   └── main.jsx     # Frontend entry point
│   ├── package.json     # Frontend dependencies and scripts
│   └── vite.config.js   # Vite configuration
├── package.json         # Root scripts to run both apps
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, React Router v7, Axios, CSS3
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, Bcrypt, Razorpay SDK
- **Database**: MongoDB Atlas

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Atlas cluster or local MongoDB instance

### 2. Environment Setup

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopkart?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Installation

From the root directory:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Seed Data (Optional)

Populate sample products in your database:

```bash
cd backend
node seed.js
```

### 5. Running the Application

You can run both or either service from the root:

```bash
# Start backend server
npm run dev:backend

# Start frontend development server
npm run dev:frontend
```

Alternatively:
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`

---

## 🧪 Tests

The backend includes test scripts for verifying endpoints and e-2e user flows:

```bash
cd backend
npm run test:products
npm run test:cart
npm run test:wishlist
npm run test:orders
npm run test:e2e
```
