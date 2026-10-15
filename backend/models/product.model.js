const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "Product description is required"],
    trim: true
  },
  price: {
    type: Number,
    required: [true, "Product price is required"],
    validate: {
      validator: function (v) {
        return typeof v === "number" && !isNaN(v) && v > 0;
      },
      message: "Price must be greater than 0"
    }
  },
  category: {
    type: String,
    required: [true, "Product category is required"],
    trim: true
  },
  image: {
    type: String,
    required: [true, "Product image is required"],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, "Product stock is required"],
    min: [0, "Stock cannot be negative"],
    validate: {
      validator: function (v) {
        return typeof v === "number" && !isNaN(v) && v >= 0;
      },
      message: "Stock cannot be negative"
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Product", productSchema);
