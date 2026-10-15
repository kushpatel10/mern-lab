const http = require("http");
const dotenv = require("dotenv");
dotenv.config();

const app = require("./index");
const Product = require("./models/product.model");
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
  server = app.listen(5001, async () => {
    console.log("Test server running on port 5001");
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
      // 1. POST /products - Success
      const testProduct = {
        name: "Automated Test Probe Item",
        description: "Temporary probe sensor item for unit tests",
        price: 1499,
        category: "Electronics",
        image: "https://example.com/item.jpg",
        stock: 12
      };
      const resPostSuccess = await makeRequest(
        {
          hostname: "localhost",
          port: 5001,
          path: "/products",
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        testProduct
      );
      assert(resPostSuccess.status === 201, "POST /products returns 201", `Status: ${resPostSuccess.status}`);
      const createdId = resPostSuccess.data.product?._id || resPostSuccess.data._id;
      assert(Boolean(createdId), "POST /products returns created product with _id");

      // 2. POST /products - Missing required field (price missing)
      const resPostMissing = await makeRequest(
        {
          hostname: "localhost",
          port: 5001,
          path: "/products",
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        { name: "Incomplete Product", category: "Electronics" }
      );
      assert(resPostMissing.status === 400, "POST /products missing field returns 400", `Status: ${resPostMissing.status}`);

      // 3. POST /products - Invalid price (price = 0 or -10)
      const resPostInvalidPrice = await makeRequest(
        {
          hostname: "localhost",
          port: 5001,
          path: "/products",
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        { ...testProduct, name: "Zero Price Item", price: 0 }
      );
      assert(resPostInvalidPrice.status === 400, "POST /products invalid price (0) returns 400", `Status: ${resPostInvalidPrice.status}`);

      // 4. POST /products - Invalid stock (negative stock)
      const resPostInvalidStock = await makeRequest(
        {
          hostname: "localhost",
          port: 5001,
          path: "/products",
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        { ...testProduct, name: "Negative Stock Item", stock: -5 }
      );
      assert(resPostInvalidStock.status === 400, "POST /products invalid stock (-5) returns 400", `Status: ${resPostInvalidStock.status}`);

      // 5. GET /products - Get all products
      const resGetAll = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products",
        method: "GET"
      });
      assert(resGetAll.status === 200, "GET /products returns 200", `Status: ${resGetAll.status}`);
      assert(resGetAll.data.success === true, "GET /products response has success: true");
      assert(Array.isArray(resGetAll.data.products), "GET /products response has products array");
      assert(typeof resGetAll.data.count === "number", "GET /products response has count number");

      // 6. GET /products?search=keyboard - Search
      const resSearch = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products?search=keyboard",
        method: "GET"
      });
      assert(resSearch.status === 200, "GET /products?search=keyboard returns 200");
      const allKeyboards = resSearch.data.products.every(p => p.name.toLowerCase().includes("keyboard"));
      assert(allKeyboards && resSearch.data.products.length > 0, "GET /products?search filters by name case-insensitively");

      // 7. GET /products?category=Electronics - Category filter
      const resCat = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products?category=Electronics",
        method: "GET"
      });
      assert(resCat.status === 200, "GET /products?category=Electronics returns 200");
      const allElectronics = resCat.data.products.every(p => p.category.toLowerCase() === "electronics");
      assert(allElectronics && resCat.data.products.length > 0, "GET /products?category filters by category");

      // 8. GET /products?search=keyboard&category=Electronics - Combined search & category
      const resCombined = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products?search=keyboard&category=Electronics",
        method: "GET"
      });
      assert(resCombined.status === 200, "GET /products?search=keyboard&category=Electronics returns 200");
      const combinedMatches = resCombined.data.products.every(
        p => p.name.toLowerCase().includes("keyboard") && p.category.toLowerCase() === "electronics"
      );
      assert(combinedMatches && resCombined.data.products.length > 0, "GET combined search & category filter matches");

      // 9. GET /products?sort=price_asc & sort=price_desc - Bonus sorting
      const resSortAsc = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products?sort=price_asc",
        method: "GET"
      });
      const ascProducts = resSortAsc.data.products;
      let isAsc = true;
      for (let i = 0; i < ascProducts.length - 1; i++) {
        if (ascProducts[i].price > ascProducts[i + 1].price) isAsc = false;
      }
      assert(isAsc, "Bonus: GET /products?sort=price_asc correctly sorts by price ascending");

      const resSortDesc = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products?sort=price_desc",
        method: "GET"
      });
      const descProducts = resSortDesc.data.products;
      let isDesc = true;
      for (let i = 0; i < descProducts.length - 1; i++) {
        if (descProducts[i].price < descProducts[i + 1].price) isDesc = false;
      }
      assert(isDesc, "Bonus: GET /products?sort=price_desc correctly sorts by price descending");

      // 10. GET /products/:id - Single product success
      const resGetById = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: `/products/${createdId}`,
        method: "GET"
      });
      assert(resGetById.status === 200, "GET /products/:id returns 200", `Status: ${resGetById.status}`);
      const fetchedProduct = resGetById.data.product || resGetById.data;
      assert(fetchedProduct.name === testProduct.name, "GET /products/:id returns correct product details");

      // 11. GET /products/:id - Invalid ObjectId
      const resInvalidId = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: "/products/invalid-id-12345",
        method: "GET"
      });
      assert(resInvalidId.status === 400, "GET /products/:id with invalid ID returns 400", `Status: ${resInvalidId.status}`);

      // 12. GET /products/:id - Not found (valid ObjectId but not in DB)
      const nonExistentId = "507f1f77bcf86cd799439011";
      const resNotFound = await makeRequest({
        hostname: "localhost",
        port: 5001,
        path: `/products/${nonExistentId}`,
        method: "GET"
      });
      assert(resNotFound.status === 404, "GET /products/:id not found returns 404", `Status: ${resNotFound.status}`);

    } catch (err) {
      console.error("Test execution error:", err);
    } finally {
      // Clean up any test products created during the test run
      try {
        await Product.deleteMany({
          name: { $in: ["Automated Test Probe Item", "Test Gaming Mouse"] }
        });
      } catch (e) {
        // ignore cleanup error
      }
      console.log(`\n=============================`);
      console.log(`Backend Tests Completed: ${passed} Passed, ${failed} Failed`);
      console.log(`=============================\n`);
      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    }
  });
};

runTests();
