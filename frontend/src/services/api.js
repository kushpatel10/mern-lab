import axios from "axios";

const API = axios.create({
  baseURL: "",
  withCredentials: true,
});

// Customer Authentication Services
export const registerCustomer = (userData) => API.post("/customers/register", userData);
export const loginCustomer = (credentials) => API.post("/customers/login", credentials);
export const getCustomerProfile = () => API.get("/customers/me");
export const logoutCustomer = () => API.post("/customers/logout");

// Product Discovery Services
export const getProducts = (params = {}) => API.get("/products", { params });
export const getProductById = (id) => API.get(`/products/${id}`);
export const createProduct = (productData) => API.post("/products", productData);

// Wishlist Services (Lab 04)
export const addToWishlist = (productId) => API.post(`/wishlist/${productId}`);
export const removeFromWishlist = (productId) => API.delete(`/wishlist/${productId}`);
export const getWishlist = () => API.get("/wishlist");
export const toggleWishlist = (productId) => API.patch(`/wishlist/${productId}/toggle`);
export const getWishlistCount = () => API.get("/wishlist/count");

// Cart Services (Lab 05)
export const addToCart = (productId) => API.post(`/cart/${productId}`);
export const getCart = () => API.get("/cart");
export const updateCartQuantity = (productId, quantity) => API.patch(`/cart/${productId}`, { quantity });
export const removeFromCart = (productId) => API.delete(`/cart/${productId}`);
export const clearCart = () => API.delete("/cart");

// Order & Payment Services (Lab 06)
export const createPaymentOrder = (shippingAddress) => API.post("/orders/create-payment-order", { shippingAddress });
export const verifyPayment = (paymentData) => API.post("/orders/verify-payment", paymentData);
export const getMyOrders = () => API.get("/orders");
export const getOrderById = (id) => API.get(`/orders/${id}`);
export const updateOrderStatus = (id, status) => API.patch(`/orders/${id}/status`, { status });
export const getSandboxSignature = (data) => API.post("/orders/sandbox-signature", data);

export default API;

