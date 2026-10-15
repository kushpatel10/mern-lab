const http = require("http");
const crypto = require("crypto");
require("dotenv").config();

const PORT = 5000;
let cookie = "";

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: PORT,
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(options.headers || {})
        }
      },
      (res) => {
        let body = "";
        if (res.headers["set-cookie"]) {
          cookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        }
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runE2E() {
  console.log("=== ShopKart Lab 06 End-to-End Validation Suite ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Verify "Test Gaming Mouse" is NOT in products catalogue
    const resProducts = await request({ path: "/products", method: "GET" });
    assert(resProducts.status === 200, "GET /products returns 200");
    const products = resProducts.data.products || resProducts.data;
    const testMouseFound = products.some((p) => /Test Gaming Mouse/i.test(p.name));
    assert(!testMouseFound, "NO products named 'Test Gaming Mouse' exist in catalogue");

    // 2. Register/Login test customer
    const email = `test_e2e_${Date.now()}@shopkart.com`;
    const password = "Pass@12345";
    const resRegister = await request(
      { path: "/customers/register", method: "POST" },
      {
        fullName: "Aarav Sharma",
        email,
        password,
        phone: "9876543210"
      }
    );
    assert(resRegister.status === 201, `Customer registered successfully (${email})`);

    const resLogin = await request(
      { path: "/customers/login", method: "POST" },
      { email, password }
    );
    assert(resLogin.status === 200, "Customer logged in and received auth cookie");

    // 3. Pick a product from catalogue with stock > 0
    const inStockProduct = products.find((p) => p.stock > 0);
    assert(!!inStockProduct, `Found in-stock product: "${inStockProduct.name}" (Stock: ${inStockProduct.stock})`);

    // 4. Add product to cart
    const resAddCart = await request({ path: `/cart/${inStockProduct._id}`, method: "POST" });
    assert(resAddCart.status === 200, `POST /cart/:id adds product to cart`);

    // 5. Verify cart contains the product
    const resGetCart = await request({ path: "/cart", method: "GET" });
    assert(resGetCart.status === 200 && resGetCart.data.cart.length === 1, "GET /cart shows 1 item in cart");

    // 6. Test client validation rules against POST /orders/create-payment-order
    const resEmptyAddr = await request({ path: "/orders/create-payment-order", method: "POST" }, {});
    assert(resEmptyAddr.status === 400, "POST /orders/create-payment-order rejects empty address with 400");

    const resInvalidPincode = await request(
      { path: "/orders/create-payment-order", method: "POST" },
      {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "123" // Invalid: not 6 digits
        }
      }
    );
    assert(resInvalidPincode.status === 400, "POST /orders/create-payment-order rejects invalid pincode with 400");

    // 7. Create payment order with valid shipping address
    const shippingAddress = {
      fullName: "Aarav Sharma",
      phone: "9876543210",
      addressLine1: "22 MG Road, Floor 4",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001"
    };
    const resCreateOrder = await request(
      { path: "/orders/create-payment-order", method: "POST" },
      { shippingAddress }
    );
    assert(resCreateOrder.status === 201, "POST /orders/create-payment-order succeeds with 201");
    assert(resCreateOrder.data.success === true, "Response has success: true");
    assert(!!resCreateOrder.data.shopKartOrderId, `ShopKart Order ID generated: ${resCreateOrder.data.shopKartOrderId}`);
    assert(!!resCreateOrder.data.razorpayOrderId, `Razorpay Order ID generated: ${resCreateOrder.data.razorpayOrderId}`);
    assert(resCreateOrder.data.currency === "INR", "Currency is INR");
    assert(resCreateOrder.data.amount === Math.round(inStockProduct.price * 100), `Amount is in paise (${resCreateOrder.data.amount})`);

    const { shopKartOrderId, razorpayOrderId } = resCreateOrder.data;

    // 8. Verify Cart is NOT cleared before payment verification
    const resCartBeforeVerify = await request({ path: "/cart", method: "GET" });
    assert(resCartBeforeVerify.data.cart.length === 1, "Cart is preserved before payment verification (length = 1)");

    // 9. Test Invalid Signature rejection
    const resInvalidSig = await request(
      { path: "/orders/verify-payment", method: "POST" },
      {
        shopKartOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: "pay_test_invalid",
        razorpay_signature: "bad_signature_12345"
      }
    );
    assert(resInvalidSig.status === 400, "POST /orders/verify-payment with invalid signature returns 400 Bad Request");

    // 10. Generate authentic HMAC-SHA256 signature using secret
    const testPaymentId = `pay_e2e_${Date.now()}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || "shopkart_secret_key";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${testPaymentId}`)
      .digest("hex");

    // 11. Verify payment with valid signature
    const resVerifySuccess = await request(
      { path: "/orders/verify-payment", method: "POST" },
      {
        shopKartOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: expectedSignature
      }
    );
    assert(resVerifySuccess.status === 200, "POST /orders/verify-payment returns 200 OK");
    assert(resVerifySuccess.data.order.paymentStatus === "PAID", "Order paymentStatus marked PAID");
    assert(resVerifySuccess.data.order.status === "PLACED", "Order status marked PLACED");
    assert(resVerifySuccess.data.order.razorpayPaymentId === testPaymentId, "razorpayPaymentId persisted on Order");

    // 12. Verify Cart is now cleared after verified payment
    const resCartAfterVerify = await request({ path: "/cart", method: "GET" });
    assert(resCartAfterVerify.data.cart.length === 0, "Cart is cleared after payment verification (length = 0)");

    // 13. Verify GET /orders returns user's orders list (Task 7)
    const resMyOrders = await request({ path: "/orders", method: "GET" });
    assert(resMyOrders.status === 200, "GET /orders returns 200");
    assert(Array.isArray(resMyOrders.data.orders) && resMyOrders.data.orders.length > 0, "GET /orders returns placed orders array");
    const placedOrder = resMyOrders.data.orders.find((o) => o._id === shopKartOrderId);
    assert(!!placedOrder, "Newly placed order found in user's order history");
    assert(placedOrder.items[0].name === inStockProduct.name, "Order snapshot has product name snapshot");
    assert(placedOrder.items[0].price === inStockProduct.price, "Order snapshot has purchase-time price snapshot");

    // 14. Verify GET /orders/:id (Section 17)
    const resSingleOrder = await request({ path: `/orders/${shopKartOrderId}`, method: "GET" });
    assert(resSingleOrder.status === 200, "GET /orders/:id returns 200 for owner");
    assert(resSingleOrder.data.order._id === shopKartOrderId, "Single order ID matches");

    // 15. Bonus (+10 marks): Status Progression (PATCH /orders/:id/status)
    const resProgression = await request(
      { path: `/orders/${shopKartOrderId}/status`, method: "PATCH" },
      { status: "CONFIRMED" }
    );
    assert(resProgression.status === 200, "PATCH /orders/:id/status advances status to CONFIRMED");
    assert(resProgression.data.order.status === "CONFIRMED", "Order status successfully updated to CONFIRMED");

    console.log(`\n=========================================`);
    console.log(`E2E Validation Suite: ${passed} Passed, ${failed} Failed`);
    console.log(`=========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("E2E Test execution error:", err);
    process.exit(1);
  }
}

runE2E();
