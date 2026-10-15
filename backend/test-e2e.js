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

const runE2E = async () => {
  console.log("=== Running ShopKart Lab 04 End-to-End Integration Test ===\n");
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
      fullName: "Lab4 Tester",
      email: `lab4_${timestamp}@shopkart.com`,
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

    // 3. Get Products from Catalog
    const productsRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/products",
      method: "GET"
    });
    assert(productsRes.status === 200, "Catalogue loaded successfully (200)");
    const products = productsRes.data.products;
    assert(products.length >= 2, `Catalogue has at least 2 products (found ${products.length})`);

    const product1 = products[0];
    const product2 = products[1];

    // 4. Initial Wishlist Count should be 0
    const countInitial = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/wishlist/count",
      method: "GET",
      headers: authHeaders
    });
    assert(countInitial.status === 200 && countInitial.data.count === 0, "Initial wishlist count is 0");

    // 5. Add Product 1 to Wishlist
    const add1Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product1._id}`,
      method: "POST",
      headers: authHeaders
    });
    assert(add1Res.status === 201, `Added product 1 (${product1.name}) to wishlist (201)`);
    assert(add1Res.data.success === true, "Add product 1 returned success: true");

    // 6. Duplicate Add Product 1 should return 409
    const dupRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product1._id}`,
      method: "POST",
      headers: authHeaders
    });
    assert(dupRes.status === 409, "Duplicate add returns 409 Conflict");

    // 7. Add Product 2 to Wishlist
    const add2Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product2._id}`,
      method: "POST",
      headers: authHeaders
    });
    assert(add2Res.status === 201, `Added product 2 (${product2.name}) to wishlist (201)`);

    // 8. Wishlist Count should now be 2
    const countAfterTwo = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/wishlist/count",
      method: "GET",
      headers: authHeaders
    });
    assert(countAfterTwo.status === 200 && countAfterTwo.data.count === 2, "Wishlist count updated to 2");

    // 9. Fetch Populated Wishlist (Task 3)
    const wishlistRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/wishlist",
      method: "GET",
      headers: authHeaders
    });
    assert(wishlistRes.status === 200, "GET /wishlist returned 200");
    assert(wishlistRes.data.count === 2, `Wishlist count is 2 (got ${wishlistRes.data.count})`);
    assert(Array.isArray(wishlistRes.data.wishlist), "Wishlist is an array");

    const item1 = wishlistRes.data.wishlist.find((p) => p._id === product1._id);
    const item2 = wishlistRes.data.wishlist.find((p) => p._id === product2._id);
    assert(Boolean(item1 && item1.name && item1.price), "Item 1 has populated name, price, stock, category");
    assert(Boolean(item2 && item2.name && item2.price), "Item 2 has populated name, price, stock, category");

    // 10. Bonus: Toggle Endpoint
    const toggleOff = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product1._id}/toggle`,
      method: "PATCH",
      headers: authHeaders
    });
    assert(toggleOff.status === 200 && toggleOff.data.saved === false, "Toggle off product 1 returns saved: false");

    const toggleOn = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product1._id}/toggle`,
      method: "PATCH",
      headers: authHeaders
    });
    assert(toggleOn.status === 200 && toggleOn.data.saved === true, "Toggle on product 1 returns saved: true");

    // 11. Remove Product 1 (Task 4)
    const remove1Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product1._id}`,
      method: "DELETE",
      headers: authHeaders
    });
    assert(remove1Res.status === 200, "Removed product 1 from wishlist (200)");

    // 12. Check Wishlist has only Product 2
    const wishlistMid = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/wishlist",
      method: "GET",
      headers: authHeaders
    });
    assert(wishlistMid.status === 200 && wishlistMid.data.count === 1, "Wishlist count decremented to 1");
    assert(wishlistMid.data.wishlist[0]._id === product2._id, "Remaining item is product 2");

    // 13. Remove Product 2 (Emptying Wishlist)
    const remove2Res = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product2._id}`,
      method: "DELETE",
      headers: authHeaders
    });
    assert(remove2Res.status === 200, "Removed product 2 from wishlist (200)");

    // 14. Check Empty Wishlist (Task 7)
    const wishlistEmpty = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/wishlist",
      method: "GET",
      headers: authHeaders
    });
    assert(wishlistEmpty.status === 200 && wishlistEmpty.data.count === 0, "Wishlist count is 0 on empty wishlist");
    assert(wishlistEmpty.data.wishlist.length === 0, "Wishlist array is empty []");

    // 15. Attempting to remove non-wishlisted product returns 404
    const removeNonExistent = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/wishlist/${product1._id}`,
      method: "DELETE",
      headers: authHeaders
    });
    assert(removeNonExistent.status === 404, "Removing product not in wishlist returns 404");

    // 16. Test without Cookie/Auth -> 401
    const unauthRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/wishlist",
      method: "GET"
    });
    assert(unauthRes.status === 401, "Unauthenticated GET /wishlist returns 401");

  } catch (err) {
    console.error("E2E Test Error:", err);
  } finally {
    console.log(`\n======================================================`);
    console.log(`E2E Integration Results: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runE2E();
