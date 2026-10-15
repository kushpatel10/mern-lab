const http = require("http");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const app = require("./index");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const generateToken = require("./utils/generateToken");

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

const runTests = async () => {
  server = app.listen(5002, async () => {
    console.log("Wishlist Test server running on port 5002");
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
      // Setup test user & test product in MongoDB
      const testEmail = `testwishlist_${Date.now()}@example.com`;
      const testCustomer = await Customer.create({
        fullName: "Wishlist Tester",
        email: testEmail,
        password: "hashedPassword123",
        phone: "9876543210",
        wishlist: []
      });

      const authToken = generateToken(testCustomer._id);
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      };

      // Find or create a test product
      let sampleProduct = await Product.findOne();
      if (!sampleProduct) {
        sampleProduct = await Product.create({
          name: "Wishlist Sample Item",
          description: "High quality item for wishlist test",
          price: 1999,
          category: "Electronics",
          image: "https://example.com/item.jpg",
          stock: 15
        });
      }
      const validProductId = sampleProduct._id.toString();
      const nonExistentProductId = new mongoose.Types.ObjectId().toString();

      console.log(`\n--- Starting Lab 04 Wishlist Test Suite ---`);

      // 1. Unauthenticated requests should return 401
      const resUnauthPost = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}`,
        method: "POST"
      });
      assert(resUnauthPost.status === 401, "POST /wishlist/:productId without auth returns 401", `Got ${resUnauthPost.status}`);

      const resUnauthGet = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: "/wishlist",
        method: "GET"
      });
      assert(resUnauthGet.status === 401, "GET /wishlist without auth returns 401", `Got ${resUnauthGet.status}`);

      const resUnauthDelete = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}`,
        method: "DELETE"
      });
      assert(resUnauthDelete.status === 401, "DELETE /wishlist/:productId without auth returns 401", `Got ${resUnauthDelete.status}`);

      // 2. Add with invalid ObjectId returns 400
      const resInvalidPost = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: "/wishlist/invalid-product-id",
        method: "POST",
        headers: authHeaders
      });
      assert(resInvalidPost.status === 400, "POST /wishlist/invalid-id returns 400", `Got ${resInvalidPost.status}`);

      // 3. Add non-existent product returns 404
      const resNotFoundPost = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${nonExistentProductId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(resNotFoundPost.status === 404, "POST /wishlist/:nonExistentId returns 404", `Got ${resNotFoundPost.status}`);

      // 4. Add product to wishlist returns 201 (or 200) Success
      const resAddSuccess = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(
        resAddSuccess.status === 201 || resAddSuccess.status === 200,
        "POST /wishlist/:productId returns 201/200 Success",
        `Got ${resAddSuccess.status}`
      );
      assert(resAddSuccess.data.success === true, "POST /wishlist returns success: true");

      // 5. Duplicate Add returns 409 Conflict
      const resAddDuplicate = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(resAddDuplicate.status === 409, "Duplicate POST /wishlist/:productId returns 409 Conflict", `Got ${resAddDuplicate.status}`);

      // 6. GET /wishlist returns populated product details
      const resGetWishlist = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: "/wishlist",
        method: "GET",
        headers: authHeaders
      });
      assert(resGetWishlist.status === 200, "GET /wishlist returns 200", `Got ${resGetWishlist.status}`);
      assert(resGetWishlist.data.success === true, "GET /wishlist response has success: true");
      assert(resGetWishlist.data.count === 1, `GET /wishlist count is 1, got ${resGetWishlist.data.count}`);
      assert(Array.isArray(resGetWishlist.data.wishlist), "GET /wishlist returns wishlist array");
      const populatedItem = resGetWishlist.data.wishlist[0];
      assert(
        populatedItem._id.toString() === validProductId && Boolean(populatedItem.name) && Boolean(populatedItem.price),
        "GET /wishlist returns correctly populated product object (name, price, etc.)",
        `Got: ${JSON.stringify(populatedItem)}`
      );

      // 7. GET /wishlist/count (Bonus)
      const resCount = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: "/wishlist/count",
        method: "GET",
        headers: authHeaders
      });
      assert(resCount.status === 200 && resCount.data.count === 1, "GET /wishlist/count returns 200 with count 1");

      // 8. PATCH /wishlist/:productId/toggle (Bonus) - toggle off
      const resToggleOff = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}/toggle`,
        method: "PATCH",
        headers: authHeaders
      });
      assert(resToggleOff.status === 200, "PATCH /wishlist/:id/toggle returns 200");
      assert(resToggleOff.data.saved === false, "PATCH /wishlist/:id/toggle returns saved: false when removing");

      // 9. PATCH /wishlist/:productId/toggle (Bonus) - toggle on
      const resToggleOn = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}/toggle`,
        method: "PATCH",
        headers: authHeaders
      });
      assert(resToggleOn.status === 200, "PATCH /wishlist/:id/toggle returns 200");
      assert(resToggleOn.data.saved === true, "PATCH /wishlist/:id/toggle returns saved: true when adding");

      // 10. DELETE /wishlist/:productId - Success
      const resDeleteSuccess = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}`,
        method: "DELETE",
        headers: authHeaders
      });
      assert(resDeleteSuccess.status === 200, "DELETE /wishlist/:productId returns 200", `Got ${resDeleteSuccess.status}`);
      assert(resDeleteSuccess.data.success === true, "DELETE /wishlist returns success: true");

      // 11. DELETE /wishlist/:productId again (not in wishlist) returns 404
      const resDeleteNotInWishlist = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: `/wishlist/${validProductId}`,
        method: "DELETE",
        headers: authHeaders
      });
      assert(resDeleteNotInWishlist.status === 404, "DELETE /wishlist/:productId when not in wishlist returns 404", `Got ${resDeleteNotInWishlist.status}`);

      // 12. DELETE /wishlist/invalid-id returns 400
      const resDeleteInvalid = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: "/wishlist/invalid-product-id",
        method: "DELETE",
        headers: authHeaders
      });
      assert(resDeleteInvalid.status === 400, "DELETE /wishlist/invalid-id returns 400", `Got ${resDeleteInvalid.status}`);

      // 13. Clean empty GET /wishlist returns count 0
      const resGetEmpty = await makeRequest({
        hostname: "localhost",
        port: 5002,
        path: "/wishlist",
        method: "GET",
        headers: authHeaders
      });
      assert(resGetEmpty.status === 200 && resGetEmpty.data.count === 0, "GET /wishlist on empty wishlist returns count 0 and empty array");

      // Clean up test customer
      await Customer.findByIdAndDelete(testCustomer._id);

    } catch (err) {
      console.error("Test execution error:", err);
    } finally {
      console.log(`\n=========================================`);
      console.log(`Wishlist Backend Tests: ${passed} Passed, ${failed} Failed`);
      console.log(`=========================================\n`);
      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    }
  });
};

runTests();
