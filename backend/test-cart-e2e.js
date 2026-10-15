const http = require("http");

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          cookies: res.headers["set-cookie"]
        });
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runE2ETest = async () => {
  console.log("=== Running ShopKart Lab 05 Cart E2E Integration Suite ===\n");
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
    const timestamp = Date.now();
    const testUser = {
      fullName: "Lab5 Cart Tester",
      email: `lab5_${timestamp}@shopkart.com`,
      password: "password123",
      phone: "9876543210"
    };

    // 1. Register User
    const regRes = await makeRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/customers/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      testUser
    );
    assert(regRes.status === 201, "User registered successfully (201)");

    // 2. Login User
    const loginRes = await makeRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/customers/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { email: testUser.email, password: testUser.password }
    );
    assert(loginRes.status === 200, "User logged in successfully (200)");
    const cookies = loginRes.cookies || [];
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
    assert(cookieHeader.includes("token="), "JWT token cookie received upon login");

    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: cookieHeader
    };

    // 3. Get Products
    const productsRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/products",
      method: "GET"
    });
    assert(productsRes.status === 200, "Catalog loaded successfully (200)");
    const products = productsRes.data.products.filter(p => p.stock >= 5);
    assert(products.length >= 2, `Found at least 2 suitable in-stock products (${products.length})`);

    const p1 = products[0];
    const p2 = products[1];

    // 4. Initial Cart should be empty
    const initCartRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/cart",
      method: "GET",
      headers: authHeaders
    });
    assert(initCartRes.status === 200 && initCartRes.data.cart.length === 0, "Initial cart is empty []");

    // 5. Add Product 1 to Cart (New item -> qty = 1)
    const add1Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "POST",
      headers: authHeaders
    });
    assert(add1Res.status === 200, "POST /cart/:p1 returns 200");
    const item1 = add1Res.data.cart.find(i => i.product._id === p1._id);
    assert(item1 && item1.quantity === 1, `Product 1 added with quantity = 1 (got ${item1?.quantity})`);

    // 6. Add Product 1 again (Existing item -> qty incremented to 2)
    const add1AgainRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "POST",
      headers: authHeaders
    });
    assert(add1AgainRes.status === 200, "Second POST /cart/:p1 returns 200");
    const item1Again = add1AgainRes.data.cart.find(i => i.product._id === p1._id);
    assert(item1Again && item1Again.quantity === 2, `Product 1 quantity incremented to 2 (got ${item1Again?.quantity})`);

    // 7. Add Product 2 to Cart
    const add2Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p2._id}`,
      method: "POST",
      headers: authHeaders
    });
    assert(add2Res.status === 200, "POST /cart/:p2 returns 200");
    assert(add2Res.data.cart.length === 2, "Cart now contains 2 distinct products");

    // 8. Derived Totals calculation
    const cartRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/cart",
      method: "GET",
      headers: authHeaders
    });
    const totalUnits = cartRes.data.cart.reduce((sum, item) => sum + item.quantity, 0);
    const expectedSubtotal = (p1.price * 2) + (p2.price * 1);
    const actualSubtotal = cartRes.data.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    assert(totalUnits === 3, `Derived total units = 3 (got ${totalUnits})`);
    assert(actualSubtotal === expectedSubtotal, `Derived subtotal = ₹${expectedSubtotal} (got ₹${actualSubtotal})`);

    // 9. Update quantity of Product 1 to 3
    const updateRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "PATCH",
      headers: authHeaders
    }, { quantity: 3 });
    assert(updateRes.status === 200, "PATCH /cart/:p1 returns 200");
    const item1Updated = updateRes.data.cart.find(i => i.product._id === p1._id);
    assert(item1Updated && item1Updated.quantity === 3, `Product 1 quantity updated to 3 (got ${item1Updated?.quantity})`);

    // 10. Update quantity exceeding stock rejected with 400
    const exceedRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "PATCH",
      headers: authHeaders
    }, { quantity: 99999 });
    assert(exceedRes.status === 400, "PATCH /cart/:p1 with quantity > stock returns 400 Bad Request");

    // 11. Update quantity < 1 rejected with 400
    const zeroRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "PATCH",
      headers: authHeaders
    }, { quantity: 0 });
    assert(zeroRes.status === 400, "PATCH /cart/:p1 with quantity < 1 returns 400 Bad Request");

    // 12. Remove Product 1 from cart
    const del1Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "DELETE",
      headers: authHeaders
    });
    assert(del1Res.status === 200, "DELETE /cart/:p1 returns 200");
    assert(del1Res.data.cart.length === 1, "Only Product 2 remains in cart");
    assert(del1Res.data.cart[0].product._id === p2._id, "Remaining item is Product 2");

    // 13. Remove Product 2 from cart (now empty)
    const del2Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p2._id}`,
      method: "DELETE",
      headers: authHeaders
    });
    assert(del2Res.status === 200, "DELETE /cart/:p2 returns 200");
    assert(del2Res.data.cart.length === 0, "Cart is completely empty []");

    // 14. Removing non-existent item returns 404
    const delNonExistent = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/cart/${p1._id}`,
      method: "DELETE",
      headers: authHeaders
    });
    assert(delNonExistent.status === 404, "DELETE /cart/:productId when not in cart returns 404");

    // 15. Unauthenticated request returns 401
    const unauthRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/cart",
      method: "GET"
    });
    assert(unauthRes.status === 401, "Unauthenticated request returns 401");

  } catch (err) {
    console.error("Cart E2E Test execution error:", err);
  } finally {
    console.log(`\n======================================================`);
    console.log(`Cart E2E Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runE2ETest();
