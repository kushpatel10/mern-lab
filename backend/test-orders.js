const http = require("http");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const app = require("./index");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const Order = require("./models/order.model");
const generateToken = require("./utils/generateToken");
const { generateSignature } = require("./config/razorpay");

let server;

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runOrderTests = async () => {
  server = app.listen(5004, async () => {
    console.log("Order Test server running on port 5004");
    let passed = 0;
    let failed = 0;

    const assert = (condition, testName, details = "") => {
      if (condition) {
        console.log(`✅ PASS: ${testName}`);
        passed++;
      } else {
        console.error(`❌ FAIL: ${testName} - ${details}`);
        failed++;
      }
    };

    try {
      // 1. Create User 1 (Primary Tester)
      const timestamp = Date.now();
      const testCustomer1 = await Customer.create({
        fullName: "Aarav OrderTester",
        email: `testorder1_${timestamp}@example.com`,
        password: "hashedPassword123",
        phone: "9876543210",
        cart: []
      });

      const token1 = generateToken(testCustomer1._id);
      const authHeaders1 = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      };

      // 2. Create User 2 (For ownership & authorization testing)
      const testCustomer2 = await Customer.create({
        fullName: "Sneha Unauthorized",
        email: `testorder2_${timestamp}@example.com`,
        password: "hashedPassword123",
        phone: "9876543211",
        cart: []
      });

      const token2 = generateToken(testCustomer2._id);
      const authHeaders2 = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}`
      };

      // 3. Find test products
      let testProduct1 = await Product.findOne({ stock: { $gte: 5 } });
      if (!testProduct1) {
        testProduct1 = await Product.create({
          name: "Order Test Headphones",
          description: "High fidelity audio",
          price: 2499,
          category: "Electronics",
          image: "https://example.com/headphones.jpg",
          stock: 10
        });
      }

      console.log(`\n--- Starting Lab 06 Orders & Checkout Test Suite ---`);

      // Test 1: Unauthenticated checkout request returns 401
      const resUnauth = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/create-payment-order",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }, { shippingAddress: { fullName: "Aarav" } });
      assert(resUnauth.status === 401, "POST /orders/create-payment-order without auth returns 401");

      // Test 2: Empty cart checkout returns 400
      const resEmptyCart = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/create-payment-order",
        method: "POST",
        headers: authHeaders1
      }, {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "123 Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038"
        }
      });
      assert(resEmptyCart.status === 400, "POST /orders/create-payment-order with empty cart returns 400");

      // Test 3: Add product to user 1 cart
      await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: `/cart/${testProduct1._id}`,
        method: "POST",
        headers: authHeaders1
      });

      // Test 4: Missing shipping fields returns 400
      const resMissingShipping = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/create-payment-order",
        method: "POST",
        headers: authHeaders1
      }, {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210"
          // missing addressLine1, city, state, pincode
        }
      });
      assert(resMissingShipping.status === 400, "POST /orders/create-payment-order missing required shipping fields returns 400");

      // Test 5: Invalid pincode (not 6 digits) returns 400
      const resInvalidPincode = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/create-payment-order",
        method: "POST",
        headers: authHeaders1
      }, {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "123 Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "123" // Invalid
        }
      });
      assert(resInvalidPincode.status === 400, "POST /orders/create-payment-order with invalid pincode returns 400");

      // Test 6: Create Payment Order with fake frontend total (Task 9 & 11)
      const validShipping = {
        fullName: "Aarav Sharma",
        phone: "9876543210",
        addressLine1: "123 Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038"
      };

      const resCreatePayment = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/create-payment-order",
        method: "POST",
        headers: authHeaders1
      }, {
        shippingAddress: validShipping,
        totalAmount: 1 // Attempt to send manipulated fake total
      });

      assert(resCreatePayment.status === 201 || resCreatePayment.status === 200, "POST /orders/create-payment-order returns 201/200 Success");
      assert(resCreatePayment.data.success === true, "Create payment order response has success: true");
      assert(Boolean(resCreatePayment.data.shopKartOrderId), "Response includes shopKartOrderId");
      assert(Boolean(resCreatePayment.data.razorpayOrderId), "Response includes razorpayOrderId");
      assert(resCreatePayment.data.amountInRupees === testProduct1.price, `Server calculated real total (₹${testProduct1.price}), ignored fake frontend total (₹1)`);
      assert(resCreatePayment.data.amount === testProduct1.price * 100, `Razorpay amount is in paise (${testProduct1.price * 100})`);
      assert(resCreatePayment.data.currency === "INR", "Currency is INR");

      const shopKartOrderId = resCreatePayment.data.shopKartOrderId;
      const razorpayOrderId = resCreatePayment.data.razorpayOrderId;

      // Test 7: Verify Cart before payment verification STILL HAS ITEMS (Task 13)
      const resCartBeforePay = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/cart",
        method: "GET",
        headers: authHeaders1
      });
      assert(resCartBeforePay.data.cart.length > 0, "Cart is NOT cleared before payment verification");

      // Test 8: Verify payment with FAKE signature fails (Task 12)
      const resFakeSig = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/verify-payment",
        method: "POST",
        headers: authHeaders1
      }, {
        shopKartOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: "pay_test12345",
        razorpay_signature: "invalid_fake_signature_hex"
      });
      assert(resFakeSig.status === 400, "POST /orders/verify-payment with invalid signature returns 400");

      // Test 9: Cart is STILL NOT cleared after failed signature
      const resCartAfterFail = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/cart",
        method: "GET",
        headers: authHeaders1
      });
      assert(resCartAfterFail.data.cart.length > 0, "Cart is preserved after failed payment verification");

      // Test 10: Verify payment with VALID HMAC signature (Task 12 & 13)
      const testPaymentId = "pay_test_valid_998877";
      const validSignature = generateSignature(razorpayOrderId, testPaymentId);

      const resVerifyValid = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders/verify-payment",
        method: "POST",
        headers: authHeaders1
      }, {
        shopKartOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature
      });

      assert(resVerifyValid.status === 200, "POST /orders/verify-payment with valid signature returns 200");
      assert(resVerifyValid.data.order.paymentStatus === "PAID", "Order paymentStatus is now PAID");
      assert(resVerifyValid.data.order.status === "PLACED", "Order status is now PLACED");
      assert(resVerifyValid.data.order.razorpayPaymentId === testPaymentId, "razorpayPaymentId is stored on Order");

      // Test 11: Confirm Cart IS NOW CLEARED (Task 13)
      const resCartAfterSuccess = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/cart",
        method: "GET",
        headers: authHeaders1
      });
      assert(resCartAfterSuccess.data.cart.length === 0, "Cart is cleared after successful payment verification");

      // Test 12: GET /orders returns user 1 orders (Task 15)
      const resGetOrders = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: "/orders",
        method: "GET",
        headers: authHeaders1
      });
      assert(resGetOrders.status === 200, "GET /orders returns 200");
      assert(resGetOrders.data.count >= 1, `GET /orders has orders (found ${resGetOrders.data.count})`);
      const placedOrder = resGetOrders.data.orders.find(o => o._id === shopKartOrderId);
      assert(Boolean(placedOrder), "Newly placed order exists in user's orders list");
      assert(placedOrder.items[0].name === testProduct1.name, "Order items snapshot preserves product name");
      assert(placedOrder.items[0].price === testProduct1.price, "Order items snapshot preserves purchase-time price");

      // Test 13: GET /orders/:id for own order
      const resGetSingle = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: `/orders/${shopKartOrderId}`,
        method: "GET",
        headers: authHeaders1
      });
      assert(resGetSingle.status === 200, "GET /orders/:id returns 200 for order owner");

      // Test 14: User 2 attempting to access User 1 order returns 403 (Section 17 & 18)
      const resUnauthorizedAccess = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: `/orders/${shopKartOrderId}`,
        method: "GET",
        headers: authHeaders2
      });
      assert(resUnauthorizedAccess.status === 403, "Accessing another user's order returns 403 Forbidden");

      // Test 15: Bonus - Update order status progression
      const resUpdateStatus = await makeRequest({
        hostname: "localhost",
        port: 5004,
        path: `/orders/${shopKartOrderId}/status`,
        method: "PATCH",
        headers: authHeaders1
      }, { status: "CONFIRMED" });
      assert(resUpdateStatus.status === 200 && resUpdateStatus.data.order.status === "CONFIRMED", "PATCH /orders/:id/status updates status to CONFIRMED");

      // Cleanup
      await Customer.findByIdAndDelete(testCustomer1._id);
      await Customer.findByIdAndDelete(testCustomer2._id);
      await Order.findByIdAndDelete(shopKartOrderId);

    } catch (err) {
      console.error("Orders test execution error:", err);
    } finally {
      console.log(`\n=========================================`);
      console.log(`Order Backend Tests: ${passed} Passed, ${failed} Failed`);
      console.log(`=========================================\n`);
      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    }
  });
};

runOrderTests();
