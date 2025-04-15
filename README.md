# One Big Exchange

A consolidated order book system for US equities trading that aggregates data from multiple exchanges.

## Overview

One Big Exchange is a real-time system that:

1. Consumes market data feeds from multiple exchanges (both top-of-book style and order-based book style)
2. Builds a consolidated order book per symbol
3. Serves the top 5 levels of the consolidated book to multiple clients simultaneously
4. Provides a web-based interface to visualize the consolidated book

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

## Market Data Simulation

The system includes a market data simulator that generates realistic market data for testing purposes. The simulator:

- Creates random top-of-book updates
- Generates new orders at various price levels
- Simulates order modifications and cancellations
- Distributes activity across multiple symbols and exchanges

## API

### REST Endpoints

- `GET /api/symbols` - Get a list of all available symbols
- `GET /api/book/:symbol` - Get the top 5 levels of the consolidated book for a symbol

### WebSocket Events

- `connect` - Client connected to the server
- `get_symbols` - Request a list of available symbols
- `symbols` - Server response with available symbols
- `subscribe` - Subscribe to a symbol's order book updates
- `unsubscribe` - Unsubscribe from a symbol's updates
- `book_update` - Server sends updated order book data
- `disconnect` - Client disconnected from the server

## Future Enhancements

- Add authentication for secure access
- Implement historical data storage and retrieval
- Add more sophisticated market data simulation
- Expand test coverage
- Support for additional order types
- Containerization with Docker

## License

ISC
