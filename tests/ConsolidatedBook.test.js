const ConsolidatedBook = require("../src/models/ConsolidatedBook");
const OrderBook = require("../src/models/OrderBook");

describe("ConsolidatedBook", () => {
  let consolidatedBook;
  let nyseOrderBook;
  let nasdaqOrderBook;

  beforeEach(() => {
    consolidatedBook = new ConsolidatedBook("AAPL");

    // Create order books for different exchanges
    nyseOrderBook = new OrderBook("NYSE", "AAPL");
    nasdaqOrderBook = new OrderBook("NASDAQ", "AAPL");

    // Add some orders to NYSE order book
    nyseOrderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "149.50",
      SIDE: "BUY",
      QUANTITY: 200,
    });

    nyseOrderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD2",
      LIMIT_PRICE: "150.00",
      SIDE: "BUY",
      QUANTITY: 300,
    });

    nyseOrderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD3",
      LIMIT_PRICE: "150.50",
      SIDE: "SELL",
      QUANTITY: 250,
    });

    // Add some orders to NASDAQ order book
    nasdaqOrderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD4",
      LIMIT_PRICE: "149.80",
      SIDE: "BUY",
      QUANTITY: 150,
    });

    nasdaqOrderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD5",
      LIMIT_PRICE: "150.00",
      SIDE: "BUY",
      QUANTITY: 200,
    });

    nasdaqOrderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD6",
      LIMIT_PRICE: "150.20",
      SIDE: "SELL",
      QUANTITY: 300,
    });
  });

  test("should initialize correctly", () => {
    expect(consolidatedBook.symbol).toBe("AAPL");
    expect(consolidatedBook.exchangeBooks.size).toBe(0);
  });

  test("should register exchange order books", () => {
    consolidatedBook.registerExchangeBook("NYSE", nyseOrderBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqOrderBook);

    expect(consolidatedBook.exchangeBooks.size).toBe(2);
    expect(consolidatedBook.exchangeBooks.get("NYSE")).toBe(nyseOrderBook);
    expect(consolidatedBook.exchangeBooks.get("NASDAQ")).toBe(nasdaqOrderBook);
  });

  test("should unregister exchange order books", () => {
    consolidatedBook.registerExchangeBook("NYSE", nyseOrderBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqOrderBook);

    consolidatedBook.unregisterExchangeBook("NYSE");

    expect(consolidatedBook.exchangeBooks.size).toBe(1);
    expect(consolidatedBook.exchangeBooks.has("NYSE")).toBe(false);
    expect(consolidatedBook.exchangeBooks.has("NASDAQ")).toBe(true);
  });

  test("should consolidate bids from multiple exchanges", () => {
    consolidatedBook.registerExchangeBook("NYSE", nyseOrderBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqOrderBook);

    const topLevels = consolidatedBook.getTopLevels();
    const bids = topLevels.bids;

    expect(bids.length).toBe(3);

    // First level should be 150.00 with combined size of 500 (300 from NYSE + 200 from NASDAQ)
    expect(bids[0].price).toBe(150);
    expect(bids[0].size).toBe(500);

    // Second level should be 149.80 with size 150 from NASDAQ
    expect(bids[1].price).toBe(149.8);
    expect(bids[1].size).toBe(150);

    // Third level should be 149.50 with size 200 from NYSE
    expect(bids[2].price).toBe(149.5);
    expect(bids[2].size).toBe(200);
  });

  test("should consolidate offers from multiple exchanges", () => {
    consolidatedBook.registerExchangeBook("NYSE", nyseOrderBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqOrderBook);

    const topLevels = consolidatedBook.getTopLevels();
    const offers = topLevels.offers;

    expect(offers.length).toBe(2);

    // First level should be 150.20 with size 300 from NASDAQ
    expect(offers[0].price).toBe(150.2);
    expect(offers[0].size).toBe(300);

    // Second level should be 150.50 with size 250 from NYSE
    expect(offers[1].price).toBe(150.5);
    expect(offers[1].size).toBe(250);
  });

  test("should limit the number of levels returned", () => {
    consolidatedBook.registerExchangeBook("NYSE", nyseOrderBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqOrderBook);

    // Get only the top 1 level
    const topLevels = consolidatedBook.getTopLevels(1);

    expect(topLevels.bids.length).toBe(1);
    expect(topLevels.offers.length).toBe(1);

    // The top level bid should be at price 150.00
    expect(topLevels.bids[0].price).toBe(150);

    // The top level offer should be at price 150.20
    expect(topLevels.offers[0].price).toBe(150.2);
  });

  test("should format the book correctly", () => {
    consolidatedBook.registerExchangeBook("NYSE", nyseOrderBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqOrderBook);

    const formattedBook = consolidatedBook.formatBook(3);

    expect(formattedBook.length).toBe(3);

    // Level 0 should have the best prices
    expect(formattedBook[0].level).toBe(0);
    expect(formattedBook[0].bidPrice).toBe(150);
    expect(formattedBook[0].bidSize).toBe(500);
    expect(formattedBook[0].offerPrice).toBe(150.2);
    expect(formattedBook[0].offerSize).toBe(300);

    // Level 1 should have the next best prices
    expect(formattedBook[1].level).toBe(1);
    expect(formattedBook[1].bidPrice).toBe(149.8);
    expect(formattedBook[1].bidSize).toBe(150);
    expect(formattedBook[1].offerPrice).toBe(150.5);
    expect(formattedBook[1].offerSize).toBe(250);

    // Level 2 should have the next best prices (or null if none)
    expect(formattedBook[2].level).toBe(2);
    expect(formattedBook[2].bidPrice).toBe(149.5);
    expect(formattedBook[2].bidSize).toBe(200);
    expect(formattedBook[2].offerPrice).toBe(null);
    expect(formattedBook[2].offerSize).toBe(null);
  });
});
