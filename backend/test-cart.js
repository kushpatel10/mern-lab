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

const runCartTests = async () => {
  server = app.listen(5003, async () => {
    console.log("Cart Test server running on port 5003");
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
      // 1. Create a dedicated test customer
      const testEmail = `testcart_${Date.now()}@example.com`;
      const testCustomer = await Customer.create({
        fullName: "Cart Tester",
        email: testEmail,
        password: "hashedPassword123",
        phone: "9876543210",
        cart: []
      });

      const authToken = generateToken(testCustomer._id);
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      };

      // 2. Find or create products (in-stock and out-of-stock)
      let sampleProduct = await Product.findOne({ stock: { $gte: 5 } });
      if (!sampleProduct) {
        sampleProduct = await Product.create({
          name: "Test Mechanical Keyboard",
          description: "High quality mechanical keyboard",
          price: 2999,
          category: "Electronics",
          image: "https://example.com/keyboard.jpg",
          stock: 10
        });
      }

      let outOfStockProduct = await Product.findOne({ stock: 0 });
      if (!outOfStockProduct) {
        outOfStockProduct = await Product.create({
          name: "Sold Out Headphones",
          description: "Out of stock test item",
          price: 1999,
          category: "Electronics",
          image: "https://example.com/headphones.jpg",
          stock: 0
        });
      }

      const validProductId = sampleProduct._id.toString();
      const outOfStockId = outOfStockProduct._id.toString();
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      console.log(`\n--- Starting Lab 05 Shopping Cart Test Suite ---`);

      // 1. Unauthenticated requests return 401
      const resUnauthPost = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "POST"
      });
      assert(resUnauthPost.status === 401, "POST /cart/:productId without auth returns 401");

      const resUnauthGet = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: "/cart",
        method: "GET"
      });
      assert(resUnauthGet.status === 401, "GET /cart without auth returns 401");

      const resUnauthPatch = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      }, { quantity: 2 });
      assert(resUnauthPatch.status === 401, "PATCH /cart/:productId without auth returns 401");

      const resUnauthDelete = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "DELETE"
      });
      assert(resUnauthDelete.status === 401, "DELETE /cart/:productId without auth returns 401");

      // 2. Add with invalid ObjectId returns 400
      const resInvalidPost = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: "/cart/invalid-id-xyz",
        method: "POST",
        headers: authHeaders
      });
      assert(resInvalidPost.status === 400, "POST /cart/invalid-id returns 400");

      // 3. Add non-existent product returns 404
      const resNotFoundPost = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${nonExistentId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(resNotFoundPost.status === 404, "POST /cart/:nonExistentId returns 404");

      // 4. Add out-of-stock product returns 400
      const resOutOfStockPost = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${outOfStockId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(resOutOfStockPost.status === 400, "POST /cart/:outOfStockId returns 400 (Stock check)");

      // 5. Test 1 (Postman plan): Add new item (quantity = 1)
      const resAdd1 = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(resAdd1.status === 200 || resAdd1.status === 201, "POST /cart/:productId returns 200/201 Success");
      assert(resAdd1.data.success === true, "Add to cart returned success: true");
      const cartItem1 = resAdd1.data.cart?.find(item => item.product._id === validProductId);
      assert(cartItem1 && cartItem1.quantity === 1, `Cart item 1 has quantity = 1 (got ${cartItem1?.quantity})`);

      // 6. Test 2 (Postman plan): Add same item again (quantity = 2)
      const resAdd2 = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "POST",
        headers: authHeaders
      });
      assert(resAdd2.status === 200, "Second POST /cart/:productId returns 200");
      const cartItem2 = resAdd2.data.cart?.find(item => item.product._id === validProductId);
      assert(cartItem2 && cartItem2.quantity === 2, `Cart item has incremented quantity = 2 (got ${cartItem2?.quantity})`);

      // 7. Test 3 (Postman plan): Get Cart returns populated product data
      const resGetCart = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: "/cart",
        method: "GET",
        headers: authHeaders
      });
      assert(resGetCart.status === 200, "GET /cart returns 200");
      assert(resGetCart.data.success === true, "GET /cart has success: true");
      assert(Array.isArray(resGetCart.data.cart), "GET /cart has cart array");
      const fetchedItem = resGetCart.data.cart[0];
      assert(
        fetchedItem &&
        fetchedItem.product &&
        fetchedItem.product.name === sampleProduct.name &&
        typeof fetchedItem.product.price === "number",
        "GET /cart product references are properly populated with name, price, image"
      );

      // 8. Test 4 (Postman plan): Update quantity PATCH /cart/:productId with quantity = 3
      const resPatchQty = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "PATCH",
        headers: authHeaders
      }, { quantity: 3 });
      assert(resPatchQty.status === 200, "PATCH /cart/:productId with quantity 3 returns 200");
      const patchedItem = resPatchQty.data.cart?.find(item => item.product._id === validProductId);
      assert(patchedItem && patchedItem.quantity === 3, `Quantity successfully updated to 3 (got ${patchedItem?.quantity})`);

      // 9. Quantity validation: quantity < 1 returns 400
      const resPatchZero = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "PATCH",
        headers: authHeaders
      }, { quantity: 0 });
      assert(resPatchZero.status === 400, "PATCH /cart/:productId with quantity < 1 returns 400");

      // 10. Test 5 (Postman plan): Exceed stock returns 400
      const resPatchExceed = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "PATCH",
        headers: authHeaders
      }, { quantity: 99999 });
      assert(resPatchExceed.status === 400, "PATCH /cart/:productId exceeding stock returns 400 Bad Request");

      // 11. Update quantity for product not in cart returns 404
      const resPatchNotInCart = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${nonExistentId}`,
        method: "PATCH",
        headers: authHeaders
      }, { quantity: 2 });
      assert(resPatchNotInCart.status === 404, "PATCH /cart/:productId for item not in cart returns 404");

      // 12. Test 6 (Postman plan): Remove item DELETE /cart/:productId returns 200
      const resDelete = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "DELETE",
        headers: authHeaders
      });
      assert(resDelete.status === 200, "DELETE /cart/:productId returns 200");
      assert(resDelete.data.cart.length === 0, "Cart is now empty after removal");

      // 13. Remove item not in cart returns 404
      const resDeleteNotFound = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: `/cart/${validProductId}`,
        method: "DELETE",
        headers: authHeaders
      });
      assert(resDeleteNotFound.status === 404, "DELETE /cart/:productId when not in cart returns 404");

      // 14. GET /cart on empty cart returns empty array
      const resGetEmpty = await makeRequest({
        hostname: "localhost",
        port: 5003,
        path: "/cart",
        method: "GET",
        headers: authHeaders
      });
      assert(resGetEmpty.status === 200 && resGetEmpty.data.cart.length === 0, "GET /cart on empty cart returns []");

      // Cleanup
      await Customer.findByIdAndDelete(testCustomer._id);

    } catch (err) {
      console.error("Test execution error:", err);
    } finally {
      console.log(`\n=========================================`);
      console.log(`Cart Backend Tests: ${passed} Passed, ${failed} Failed`);
      console.log(`=========================================\n`);
      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    }
  });
};

runCartTests();
