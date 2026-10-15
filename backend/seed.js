const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/product.model");

dotenv.config();

const sampleProducts = [
  {
    name: "Mechanical Keyboard",
    description: "RGB tactile mechanical keyboard with premium blue switches, durable double-shot keycaps, and customizable backlighting profiles.",
    price: 2999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    stock: 10
  },
  {
    name: "Noise Cancelling Headphones",
    description: "Wireless over-ear headphones with industry-leading active noise cancellation, 30-hour battery life, and crystal-clear voice calls.",
    price: 4999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    stock: 25
  },
  {
    name: "Ultra HD 4K Action Camera",
    description: "Compact waterproof action camera with 4K 60fps recording, dual-screen display, and electronic image stabilization.",
    price: 8499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80",
    stock: 15
  },
  {
    name: "Classic Denim Jacket",
    description: "Timeless vintage wash denim jacket made from 100% organic cotton, featuring tailored fit and sturdy brass buttons.",
    price: 1899,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80",
    stock: 30
  },
  {
    name: "Minimalist Leather Watch",
    description: "Elegant quartz timepiece with genuine Italian leather strap, sapphire crystal glass, and 50m water resistance.",
    price: 3499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
    stock: 18
  },
  {
    name: "Urban Canvas Sneakers",
    description: "Breathable and lightweight everyday lifestyle sneakers with cushioned foam insole and non-slip rubber grip.",
    price: 2199,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80",
    stock: 8
  },
  {
    name: "Atomic Habits by James Clear",
    description: "An easy & proven way to build good habits & break bad ones. The definitive guide to personal transformation.",
    price: 499,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    stock: 50
  },
  {
    name: "Designing Data-Intensive Applications",
    description: "The big ideas behind reliable, scalable, and maintainable systems by Martin Kleppmann. Essential for backend engineers.",
    price: 1299,
    category: "Books",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600&auto=format&fit=crop&q=80",
    stock: 22
  },
  {
    name: "Ceramic Pour-Over Coffee Set",
    description: "Artisan handcrafted ceramic dripper and heat-resistant glass carafe for the ultimate pour-over coffee experience at home.",
    price: 1599,
    category: "Home",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    stock: 14
  },
  {
    name: "Aroma Ultrasonic Diffuser",
    description: "Quiet ultrasonic essential oil diffuser with ambient warm LED lighting, auto-shutoff, and whisper-quiet misting.",
    price: 1199,
    category: "Home",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80",
    stock: 12
  },
  {
    name: "Ergonomic Memory Foam Pillow",
    description: "Contour cervical orthopedic pillow with cooling gel layer and breathable bamboo cover for deep restorative sleep.",
    price: 1799,
    category: "Home",
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80",
    stock: 0
  }
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    const count = await Product.countDocuments();
    console.log(`Current product count in DB: ${count}`);

    if (count === 0) {
      await Product.insertMany(sampleProducts);
      console.log(`Successfully seeded ${sampleProducts.length} sample products!`);
    } else {
      console.log(`Products already exist (${count} products). Checking if key items are present...`);
      for (const item of sampleProducts) {
        const exists = await Product.findOne({ name: item.name });
        if (!exists) {
          await Product.create(item);
          console.log(`Added missing product: ${item.name}`);
        }
      }
    }

    console.log("Seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding products:", error);
    process.exit(1);
  }
};

seedProducts();
