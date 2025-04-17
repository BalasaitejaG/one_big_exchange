import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./OrderBook.css";

// Default symbols to display if server doesn't send any
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "AMZN", "GOOGL", "FB"];

function OrderBook() {
  const [socket, setSocket] = useState(null);
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [currentSymbol, setCurrentSymbol] = useState("AAPL"); // Default to AAPL
  const [bookData, setBookData] = useState([]);
  const [previousBookData, setPreviousBookData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [lastUpdate, setLastUpdate] = useState("Never");
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const hasInitializedRef = useRef(false);
  const dropdownRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Handle connection events
    newSocket.on("connect", () => {
      setConnectionStatus("Connected");
      console.log("Socket connected, requesting symbols...");
      // Request available symbols
      newSocket.emit("get_symbols");
    });

    newSocket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
    });

    // Handle server messages
    newSocket.on("symbols", (symbolsData) => {
      console.log("Received symbols:", symbolsData);
      if (symbolsData && symbolsData.length > 0) {
        setSymbols(symbolsData);
      }
      setIsLoadingSymbols(false);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initial subscription to default symbol
  useEffect(() => {
    if (!socket || hasInitializedRef.current) return;

    if (currentSymbol) {
      console.log("Initial subscription to:", currentSymbol);
      socket.emit("subscribe", currentSymbol);
      hasInitializedRef.current = true;
    }
  }, [socket, currentSymbol]);

  // Handle book updates separately to respond to symbol changes
  useEffect(() => {
    if (!socket) return;

    const handleBookUpdate = (data) => {
      if (data.symbol === currentSymbol) {
        console.log(`Received update for ${currentSymbol}:`, data.data);
        setPreviousBookData(bookData);
        setBookData(data.data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    };

    socket.on("book_update", handleBookUpdate);

    return () => {
      socket.off("book_update", handleBookUpdate);
    };
  }, [socket, currentSymbol, bookData]);

  // Subscribe to a symbol when selected
  useEffect(() => {
    if (!socket || !hasInitializedRef.current) return;

    console.log("Subscribing to symbol:", currentSymbol);

    // First unsubscribe from any previous symbol
    socket.emit("unsubscribe", currentSymbol);

    // Then subscribe to the new one
    socket.emit("subscribe", currentSymbol);
  }, [socket, currentSymbol]);

  // Handle symbol selection change
  const handleSymbolChange = (symbol) => {
    console.log("Symbol selected:", symbol);

    // Clear the table when changing symbols
    setBookData([]);
    setPreviousBookData(null);
    setLastUpdate("Never");
    setCurrentSymbol(symbol);
    setIsDropdownOpen(false); // Close dropdown after selection
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Determine CSS class for flashing effect based on value changes
  const getFlashClass = (currentValue, previousValue, isPrice = false) => {
    if (!previousBookData) return "";

    if (currentValue === undefined || previousValue === undefined) return "";

    if (isPrice) {
      if (currentValue > previousValue) return "flash-green";
      if (currentValue < previousValue) return "flash-red";
    } else {
      if (currentValue > previousValue) return "flash-green";
      if (currentValue < previousValue) return "flash-red";
    }

    return "";
  };

  // Generate empty placeholder rows when no data is available
  const renderEmptyRows = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <tr key={`empty-${index}`} className="empty-row">
          <td>{index + 1}</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
        </tr>
      ));
  };

  return (
    <div className="container">
      <header>
        <h1>One Big Exchange</h1>
        <p>Consolidated Order Book</p>
      </header>

      <div className="controls">
        <label htmlFor="symbol-dropdown">Select Symbol:</label>
        <div className="custom-dropdown" ref={dropdownRef}>
          <div
            className="dropdown-selected"
            onClick={toggleDropdown}
            id="symbol-dropdown"
          >
            {currentSymbol || "Select a symbol..."}
            <span className="dropdown-arrow">▼</span>
          </div>
          {isDropdownOpen && (
            <div className="dropdown-options">
              {symbols.map((symbol) => (
                <div
                  key={symbol}
                  className={`dropdown-option ${
                    symbol === currentSymbol ? "selected" : ""
                  }`}
                  onClick={() => handleSymbolChange(symbol)}
                >
                  {symbol}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {currentSymbol && (
        <div className="selected-symbol">
          Currently viewing: <span>{currentSymbol}</span>
        </div>
      )}

      <div className="order-book">
        <table id="order-book-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Bid Size</th>
              <th>Bid Price</th>
              <th>Offer Price</th>
              <th>Offer Size</th>
            </tr>
          </thead>
          <tbody>
            {bookData.length > 0
              ? bookData.map((level) => {
                  const previousLevel = previousBookData?.find(
                    (prev) => prev.level === level.level
                  );

                  return (
                    <tr key={level.level}>
                      <td>{level.level}</td>
                      <td
                        className={getFlashClass(
                          level.bidSize,
                          previousLevel?.bidSize
                        )}
                      >
                        {level.bidSize || "-"}
                      </td>
                      <td
                        className={getFlashClass(
                          level.bidPrice,
                          previousLevel?.bidPrice,
                          true
                        )}
                      >
                        {level.bidPrice ? level.bidPrice.toFixed(2) : "-"}
                      </td>
                      <td
                        className={getFlashClass(
                          level.offerPrice,
                          previousLevel?.offerPrice,
                          true
                        )}
                      >
                        {level.offerPrice ? level.offerPrice.toFixed(2) : "-"}
                      </td>
                      <td
                        className={getFlashClass(
                          level.offerSize,
                          previousLevel?.offerSize
                        )}
                      >
                        {level.offerSize || "-"}
                      </td>
                    </tr>
                  );
                })
              : renderEmptyRows()}
          </tbody>
        </table>
      </div>

      <div className="status">
        <p>
          Status:{" "}
          <span
            className={
              connectionStatus === "Connected" ? "connected" : "disconnected"
            }
          >
            {connectionStatus}
          </span>
        </p>
        <p>
          Last update: <span>{lastUpdate}</span>
        </p>
      </div>
    </div>
  );
}

export default OrderBook;
