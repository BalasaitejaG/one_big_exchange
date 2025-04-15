document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const symbolSelect = document.getElementById("symbol-select");
  const orderBookTable = document.getElementById("order-book-table");
  const connectionStatus = document.getElementById("connection-status");
  const lastUpdate = document.getElementById("last-update");

  // Variables
  let socket = null;
  let currentSymbol = null;
  let previousBookData = null;

  // Initialize socket connection
  initSocketConnection();

  // Initialize event listeners
  symbolSelect.addEventListener("change", handleSymbolChange);

  /**
   * Initialize socket.io connection
   */
  function initSocketConnection() {
    // Connect to the server
    socket = io();

    // Handle connection events
    socket.on("connect", () => {
      connectionStatus.textContent = "Connected";
      connectionStatus.className = "connected";

      // Request available symbols
      socket.emit("get_symbols");
    });

    socket.on("disconnect", () => {
      connectionStatus.textContent = "Disconnected";
      connectionStatus.className = "disconnected";
    });

    // Handle server messages
    socket.on("symbols", handleSymbolsResponse);
    socket.on("book_update", handleBookUpdate);
  }

  /**
   * Handle symbols list from server
   */
  function handleSymbolsResponse(symbols) {
    // Clear the select options
    symbolSelect.innerHTML = "";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a symbol...";
    symbolSelect.appendChild(defaultOption);

    // Add options for each symbol
    symbols.forEach((symbol) => {
      const option = document.createElement("option");
      option.value = symbol;
      option.textContent = symbol;
      symbolSelect.appendChild(option);
    });
  }

  /**
   * Handle symbol selection change
   */
  function handleSymbolChange() {
    const newSymbol = symbolSelect.value;

    // Unsubscribe from previous symbol
    if (currentSymbol) {
      socket.emit("unsubscribe", currentSymbol);
    }

    // Clear the table
    clearOrderBook();

    // If a symbol is selected, subscribe to it
    if (newSymbol) {
      currentSymbol = newSymbol;
      socket.emit("subscribe", newSymbol);
    } else {
      currentSymbol = null;
    }
  }

  /**
   * Handle book update from server
   */
  function handleBookUpdate(data) {
    if (data.symbol !== currentSymbol) return;

    // Update the order book table
    updateOrderBook(data.data);

    // Update last update timestamp
    lastUpdate.textContent = new Date().toLocaleTimeString();
  }

  /**
   * Update the order book table with new data
   */
  function updateOrderBook(bookData) {
    const tbody = orderBookTable.querySelector("tbody");

    // Clear the table body
    clearOrderBook();

    // Add rows for each level
    bookData.forEach((level) => {
      const row = document.createElement("tr");

      // Create cells
      const levelCell = document.createElement("td");
      levelCell.textContent = level.level;

      const bidSizeCell = document.createElement("td");
      bidSizeCell.textContent = level.bidSize || "-";

      const bidPriceCell = document.createElement("td");
      bidPriceCell.textContent = level.bidPrice
        ? level.bidPrice.toFixed(2)
        : "-";

      const offerPriceCell = document.createElement("td");
      offerPriceCell.textContent = level.offerPrice
        ? level.offerPrice.toFixed(2)
        : "-";

      const offerSizeCell = document.createElement("td");
      offerSizeCell.textContent = level.offerSize || "-";

      // Highlight changes if we have previous data
      if (previousBookData) {
        const previousLevel = previousBookData.find(
          (prev) => prev.level === level.level
        );

        if (previousLevel) {
          // Check if bid price changed
          if (previousLevel.bidPrice !== level.bidPrice) {
            const direction =
              level.bidPrice > previousLevel.bidPrice ? "green" : "red";
            bidPriceCell.classList.add(`flash-${direction}`);
          }

          // Check if bid size changed
          if (previousLevel.bidSize !== level.bidSize) {
            const direction =
              level.bidSize > previousLevel.bidSize ? "green" : "red";
            bidSizeCell.classList.add(`flash-${direction}`);
          }

          // Check if offer price changed
          if (previousLevel.offerPrice !== level.offerPrice) {
            const direction =
              level.offerPrice < previousLevel.offerPrice ? "green" : "red";
            offerPriceCell.classList.add(`flash-${direction}`);
          }

          // Check if offer size changed
          if (previousLevel.offerSize !== level.offerSize) {
            const direction =
              level.offerSize > previousLevel.offerSize ? "green" : "red";
            offerSizeCell.classList.add(`flash-${direction}`);
          }
        }
      }

      // Add cells to row
      row.appendChild(levelCell);
      row.appendChild(bidSizeCell);
      row.appendChild(bidPriceCell);
      row.appendChild(offerPriceCell);
      row.appendChild(offerSizeCell);

      // Add row to table
      tbody.appendChild(row);
    });

    // Store current data for next comparison
    previousBookData = bookData;
  }

  /**
   * Clear the order book table
   */
  function clearOrderBook() {
    const tbody = orderBookTable.querySelector("tbody");
    tbody.innerHTML = "";
  }
});
