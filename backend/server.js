const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const cors = require("cors");

const MarketDataManager = require("./services/MarketDataManager");
const MarketDataSimulator = require("./utils/MarketDataSimulator");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Apply CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'frontend/dist' directory when in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
} else {
  // In development, serve the frontend Vite dev server
  console.log(
    "Running in development mode - frontend served by Vite at http://localhost:5173"
  );
}

// Initialize market data manager
const marketDataManager = new MarketDataManager();

// Initialize and start market data simulator
const simulator = new MarketDataSimulator(marketDataManager);
simulator.start();

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Client connected");

  let activeSubscriptions = [];

  // Handle symbol subscription requests
  socket.on("subscribe", (symbol) => {
    console.log(`Client subscribing to ${symbol}`);

    // Create subscription
    const unsubscribe = marketDataManager.subscribeToSymbol(symbol, (data) => {
      console.log(`Sending data update for ${symbol}: ${data.length} levels`);
      socket.emit("book_update", { symbol, data });
    });

    // Store unsubscribe function
    activeSubscriptions.push(unsubscribe);

    // Send initial data for the symbol
    const initialData = marketDataManager.getTopLevelsForSymbol(symbol);
    if (initialData && initialData.length > 0) {
      console.log(
        `Sending initial data for ${symbol}: ${initialData.length} levels`
      );
      socket.emit("book_update", { symbol, data: initialData });
    }
  });

  // Handle unsubscribe requests
  socket.on("unsubscribe", (symbol) => {
    console.log(`Client unsubscribing from ${symbol}`);

    // Clean up subscriptions for this symbol
    activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    activeSubscriptions = [];
  });

  // Handle available symbols request
  socket.on("get_symbols", () => {
    const symbols = simulator.getSymbols();
    console.log("Sending symbols to client:", symbols);
    socket.emit("symbols", symbols);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");

    // Clean up all subscriptions
    activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    activeSubscriptions = [];
  });
});

// API routes
app.get("/api/symbols", (req, res) => {
  const symbols = marketDataManager.getAvailableSymbols();
  res.json(symbols);
});

app.get("/api/book/:symbol", (req, res) => {
  const symbol = req.params.symbol;
  const book = marketDataManager.getTopLevelsForSymbol(symbol);
  res.json(book);
});

// NEW API ENDPOINTS FOR ORDER OPERATIONS

// Create a new order
app.post("/api/order", (req, res) => {
  const { symbol, exchange, side, price, quantity } = req.body;

  // Validate required fields
  if (!symbol || !exchange || !side || !price || !quantity) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["symbol", "exchange", "side", "price", "quantity"],
    });
  }

  // Validate side value
  if (side !== "BUY" && side !== "SELL") {
    return res.status(400).json({ error: "Side must be either BUY or SELL" });
  }

  // Generate a unique order ID
  const orderId = `ORD${Date.now()}`;

  // Create the order message
  const newOrder = {
    SYMBOL: symbol,
    LIMIT_PRICE: price.toString(),
    SIDE: side,
    QUANTITY: parseInt(quantity),
    ORDER_ID: orderId,
  };

  // Process the new order
  marketDataManager.processOrderMessage(exchange, "NEW_ORDER", newOrder);

  res.status(201).json({
    message: "Order created successfully",
    orderId: orderId,
    details: newOrder,
  });
});

// Modify an existing order
app.put("/api/order/:orderId", (req, res) => {
  const orderId = req.params.orderId;
  const { exchange, symbol, quantity } = req.body;

  // Validate required fields
  if (!exchange || !quantity || !symbol) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["exchange", "quantity", "symbol"],
    });
  }

  // Create the modify order message
  const modifyOrder = {
    ORDER_ID: orderId,
    NEW_QUANTITY: parseInt(quantity),
    SYMBOL: symbol,
  };

  // Process the modify order
  marketDataManager.processOrderMessage(exchange, "MODIFY_ORDER", modifyOrder);

  res.json({
    message: "Order modified successfully",
    orderId: orderId,
    newQuantity: parseInt(quantity),
  });
});

// Cancel an existing order
app.delete("/api/order/:orderId", (req, res) => {
  const orderId = req.params.orderId;
  const { exchange, symbol } = req.body;

  // Validate required fields
  if (!exchange || !symbol) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["exchange", "symbol"],
    });
  }

  // Create the cancel order message
  const cancelOrder = {
    ORDER_ID: orderId,
    SYMBOL: symbol,
  };

  // Process the cancel order
  marketDataManager.processOrderMessage(exchange, "CANCEL_ORDER", cancelOrder);

  res.json({
    message: "Order canceled successfully",
    orderId: orderId,
  });
});

// Serve the React app for any other route in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  simulator.stop();
  server.close(() => {
    console.log("Server shut down");
    process.exit(0);
  });
});
