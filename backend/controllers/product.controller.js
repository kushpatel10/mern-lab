const mongoose = require("mongoose");
const Product = require("../models/product.model");

// POST /products - Create a new product
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    // Check for missing required fields
    if (
      name === undefined || name === null || String(name).trim() === "" ||
      description === undefined || description === null || String(description).trim() === "" ||
      category === undefined || category === null || String(category).trim() === "" ||
      image === undefined || image === null || String(image).trim() === "" ||
      price === undefined || price === null || String(price).trim?.() === "" ||
      stock === undefined || stock === null || String(stock).trim?.() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required field. 'name', 'description', 'price', 'category', 'image', and 'stock' are mandatory."
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price. Price must be a number greater than 0."
      });
    }

    const numericStock = Number(stock);
    if (isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock. Stock must be a non-negative number."
      });
    }

    const newProduct = await Product.create({
      name: String(name).trim(),
      description: String(description).trim(),
      price: numericPrice,
      category: String(category).trim(),
      image: String(image).trim(),
      stock: numericStock
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
      ...newProduct.toObject()
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error creating product",
      error: error.message
    });
  }
};

// GET /products - Get all products with search, category filter, and sorting
const getProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const query = {};

    // Task 5: Search products by name (case-insensitive)
    if (search && search.trim() !== "") {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    // Task 5: Category filtering
    if (
      category &&
      category.trim() !== "" &&
      category.toLowerCase() !== "all" &&
      category.toLowerCase() !== "all categories"
    ) {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    // Bonus Challenge: Sorting by price ascending / descending
    let sortOption = { createdAt: -1 };
    if (sort === "price_asc" || sort === "asc") {
      sortOption = { price: 1 };
    } else if (sort === "price_desc" || sort === "desc") {
      sortOption = { price: -1 };
    } else if (sort === "newest") {
      sortOption = { createdAt: -1 };
    }

    const products = await Product.find(query)
      .select("-__v")
      .sort(sortOption);

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching products",
      error: error.message
    });
  }
};

// GET /products/:id - Get a single product by MongoDB ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findById(id).select("-__v");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product,
      ...product.toObject()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching product",
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById
};
