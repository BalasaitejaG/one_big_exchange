# One Big Exchange

A consolidated order book system for US equities trading that aggregates data from multiple exchanges.

## Overview

One Big Exchange is a real-time system that:

1. Consumes market data feeds from multiple exchanges (both top-of-book style and order-based book style)
2. Builds a consolidated order book per symbol
3. Serves the top 5 levels of the consolidated book to multiple clients simultaneously
4. Provides a web-based interface to visualize the consolidated book

## Live Demo

The application is deployed and accessible at:
[https://one-big-exchange.onrender.com/](https://one-big-exchange.onrender.com/)

## Features

- Processes two types of market data feeds:
  - **Top of the book**: Messages contain SYMBOL, BEST_BID_PRICE, BEST_BID_SIZE, BEST_OFFER_PRICE, BEST_OFFER_SIZE
  - **Order based book**: Messages for new orders, cancellations, and modifications
- Aggregates liquidity across exchanges at each price level
- Sorts price levels from best to worst (highest bid price, lowest offer price)
- Real-time updates via WebSockets
- Clean, modern UI for visualizing the order book

## Technical Architecture

- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **Frontend**: HTML, CSS, JavaScript
- **Testing**: Jest

## Project Structure

```
one-big-exchange/
├── src/
│   ├── models/
│   │   ├── OrderBook.js           # Single exchange order book
│   │   └── ConsolidatedBook.js    # Multi-exchange consolidated book
│   ├── services/
│   │   └── MarketDataManager.js   # Manages market data processing
│   ├── utils/
│   │   └── MarketDataSimulator.js # Generates sample market data
│   └── server.js                  # Express server and Socket.io setup
├── public/
│   ├── index.html                 # Web interface
│   ├── styles.css                 # Styling
│   └── app.js                     # Client-side JavaScript
├── tests/
│   ├── OrderBook.test.js          # Unit tests for OrderBook
│   └── ConsolidatedBook.test.js   # Unit tests for ConsolidatedBook
├── package.json
└── README.md
```

## Installation

1. Clone the repository:

```
git clone https://github.com/yourusername/one-big-exchange.git
cd one-big-exchange
```

2. Install dependencies:

```
npm install
```

3. Start the server:

```
npm start
```

4. Open your browser to http://localhost:3000

## Testing

Run the test suite:

```
npm test
```

Run tests in watch mode:

```
npm run test:watch
```

The project includes comprehensive test coverage for core components:

1. **OrderBook** - Tests order processing logic for individual exchanges including:

   - Creating and updating books via top-of-book messages
   - Processing new orders, cancellations, and modifications
   - Maintaining accurate price levels for bids and offers
   - Sorting and retrieving best prices correctly

2. **ConsolidatedBook** - Tests the aggregation of orders across exchanges:

   - Consolidating data from multiple exchanges
   - Maintaining proper price level ordering
   - Correctly summing sizes at the same price level
   - Formatting the book with the specified number of levels

3. **MarketDataManager** - Integration tests for the core functionality:

   - Processing different message types
   - Maintaining consolidated books for multiple symbols
   - Handling subscriber notification
   - Routing messages to appropriate order books

4. **MarketDataSimulator** - Tests for the data generation:
   - Generating realistic market data
   - Simulating order creation, modification and cancellation
   - Managing simulation lifecycle (start/stop)

The test suite provides over 95% code coverage, ensuring the reliability of the core functionality.

## Market Data Simulation

The system includes a market data simulator that generates realistic market data for testing purposes. The simulator:

- Creates random top-of-book updates
- Generates new orders at various price levels
- Simulates order modifications and cancellations
- Distributes activity across multiple symbols and exchanges

## API

### REST Endpoints

#### Book and Symbol Information

- `GET /api/symbols` - Get a list of all available symbols
- `GET /api/book/:symbol` - Get the top 5 levels of the consolidated book for a symbol (example: `/api/book/AAPL`)

#### Order Operations

- `POST /api/order` - Create a new order

  - Required body parameters: `symbol`, `exchange`, `side` (BUY/SELL), `price`, `quantity`
  - Returns the created order with a generated `orderId`

- `PUT /api/order/:orderId` - Modify an existing order's quantity

  - Required body parameters: `exchange`, `symbol`, `quantity`
  - Example: `/api/order/ORD1684253627`

- `DELETE /api/order/:orderId` - Cancel an existing order
  - Required body parameters: `exchange`, `symbol`
  - Example: `/api/order/ORD1684253627`

### WebSocket Events

- `connect` - Client connected to the server
- `get_symbols` - Request a list of available symbols
- `symbols` - Server response with available symbols
- `subscribe` - Subscribe to a symbol's order book updates
- `unsubscribe` - Unsubscribe from a symbol's updates
- `book_update` - Server sends updated order book data
- `disconnect` - Client disconnected from the server
