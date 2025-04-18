# Executive Summary - One Big Exchange

## Project Overview

One Big Exchange is a consolidated order book system for US equities trading that aggregates real-time market data from multiple exchanges. The system builds a unified view of the market for each traded symbol, providing traders with a comprehensive picture of available liquidity across all connected venues.

## Business Value

- **Enhanced Market Visibility**: Traders gain access to a consolidated view of orders across multiple exchanges, enabling more informed trading decisions
- **Real-time Data Processing**: The system processes live market data feeds and displays updates instantly, critical for time-sensitive trading opportunities
- **Simplified Trading Interface**: Complex market data is presented in an intuitive, easy-to-understand format suitable for both professional and retail traders
- **Exchange-agnostic Trading**: Users can see the best available prices regardless of which exchange offers them

## Technical Architecture

### High-Level Design

One Big Exchange employs a modern, scalable architecture consisting of:

1. **Backend System**:

   - Node.js with Express.js server
   - Market data processing engine
   - WebSocket integration for real-time communication

2. **Frontend Application**:

   - React-based single-page application
   - Real-time order book visualization
   - Responsive design for desktop and mobile access

3. **Data Flow**:
   - Market data feeds from multiple exchanges → Processing engine → Consolidated book → Client interface

### Low-Level Components

#### User Interface Components

- **Order Book Display**: Visualizes the top 5 levels of bids and offers
- **Symbol Selector**: Allows users to choose which equity symbol to view
- **Real-time Updates**: Visual indicators highlight changes in price and quantity
- **Trade Information**: Displays recent trade data and market statistics

#### Web Service Components

- **REST API Endpoints**:

  - `/api/symbols`: Returns list of available trading symbols
  - `/api/book/:symbol`: Retrieves consolidated order book for a specific symbol
  - `/api/order`: Creates, modifies, and cancels orders

- **WebSocket Services**:
  - Real-time book updates
  - Market data feed integration
  - Client subscription management

#### Database & Storage Layer

- In-memory data structures for high-performance market data processing
- Maps and collections for efficient price-level organization
- Order tracking system with unique identifiers

## Implementation Details

### Market Data Processing

The system processes two types of market data:

1. **Top-of-Book Messages** containing best bid/offer information
2. **Order-Based Messages** for granular order creation, modification, and cancellation

### Order Aggregation Logic

- Orders are aggregated by price level across all exchanges
- Liquidity is consolidated to show total available size at each price point
- Price levels are sorted from best to worst (highest bids, lowest offers)

### Real-time Communication

- Socket.io enables bidirectional, event-based communication
- Clients subscribe to specific symbols of interest
- Updates are pushed instantly when order book changes occur

## Screenshots & API Examples

### UI Components

- Order book display showing price levels, sizes, and exchange information
- Symbol selector interface with search functionality
- Market statistics dashboard with daily volume and price movement

### API Request/Response Examples

- GET `/api/symbols` response: `["AAPL", "MSFT", "AMZN", "GOOGL", "META"]`
- GET `/api/book/AAPL` response:
  ```json
  {
    "symbol": "AAPL",
    "bids": [
      { "price": 190.25, "size": 1500, "exchanges": ["NYSE", "NASDAQ"] },
      { "price": 190.2, "size": 3000, "exchanges": ["NYSE", "BATS"] }
    ],
    "offers": [
      { "price": 190.3, "size": 2200, "exchanges": ["NASDAQ", "ARCA"] },
      { "price": 190.35, "size": 1800, "exchanges": ["NYSE"] }
    ]
  }
  ```

## Assumptions

- Market data feeds are available and accessible
- Latency requirements are in the millisecond range (not microsecond)
- System focuses on US equities (not options, futures, or other asset classes)
- User authentication and order execution are handled by external systems
- System is designed for information display, not direct trade execution

## Future Enhancements

- Historical data storage and analytics
- Integration with additional asset classes beyond equities
- Direct order routing capabilities
- Advanced charting and technical analysis tools
- Mobile application development
