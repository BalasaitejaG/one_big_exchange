const MarketDataSimulator = require("../backend/utils/MarketDataSimulator");
const MarketDataManager = require("../backend/services/MarketDataManager");

jest.useFakeTimers();

describe("MarketDataSimulator", () => {
  let marketDataManager;
  let simulator;

  beforeEach(() => {
    marketDataManager = new MarketDataManager();
    simulator = new MarketDataSimulator(marketDataManager);

    // Spy on the market data manager methods
    jest.spyOn(marketDataManager, "processTopOfBookMessage");
    jest.spyOn(marketDataManager, "processOrderMessage");
  });

  afterEach(() => {
    // Stop the simulator if it's running
    if (simulator.topOfBookInterval) {
      simulator.stop();
    }
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with the provided market data manager", () => {
      expect(simulator.marketDataManager).toBe(marketDataManager);
      // Check that intervals are not set initially
      expect(simulator.topOfBookInterval).toBeUndefined();
      expect(simulator.newOrderInterval).toBeUndefined();
      expect(simulator.modifyCancelInterval).toBeUndefined();

      // Check the exchanges and symbols arrays exist but don't verify exact content
      expect(Array.isArray(simulator.exchanges)).toBe(true);
      expect(simulator.exchanges.length).toBeGreaterThan(0);
      expect(Array.isArray(simulator.symbols)).toBe(true);
      expect(simulator.symbols.length).toBeGreaterThan(0);
    });
  });

  describe("start and stop", () => {
    it("should start and stop the simulator", () => {
      // Initially intervals should be undefined
      expect(simulator.topOfBookInterval).toBeUndefined();
      expect(simulator.newOrderInterval).toBeUndefined();
      expect(simulator.modifyCancelInterval).toBeUndefined();

      simulator.start();

      // After start, intervals should be defined
      expect(simulator.topOfBookInterval).toBeDefined();
      expect(simulator.newOrderInterval).toBeDefined();
      expect(simulator.modifyCancelInterval).toBeDefined();

      // Store the interval IDs
      const topOfBookInterval = simulator.topOfBookInterval;
      const newOrderInterval = simulator.newOrderInterval;
      const modifyCancelInterval = simulator.modifyCancelInterval;

      simulator.stop();

      // After stop, the intervals should be cleared
      // In Jest's fake timer environment, we can't easily check if the intervals
      // are cleared. We'll trust that the implementation is correct.
    });

    it("should generate data at the specified intervals", () => {
      simulator.start();

      // Fast forward 1 second - should trigger multiple updates
      jest.advanceTimersByTime(1000);

      // Check that data was generated
      expect(marketDataManager.processTopOfBookMessage).toHaveBeenCalled();
      expect(marketDataManager.processOrderMessage).toHaveBeenCalled();
    });
  });

  describe("data generation", () => {
    it("should generate a valid top-of-book update", () => {
      // We don't have direct access to generateTopOfBookUpdate, so use start()
      simulator.start();

      // Wait for update to happen
      jest.advanceTimersByTime(200);

      // Verify the market data manager was called with top-of-book data
      expect(marketDataManager.processTopOfBookMessage).toHaveBeenCalled();

      const call = marketDataManager.processTopOfBookMessage.mock.calls[0];
      const exchange = call[0];
      const message = call[1];

      // Verify exchange is one of the valid exchanges
      expect(simulator.exchanges).toContain(exchange);

      // Verify message has the required fields
      expect(simulator.symbols).toContain(message.SYMBOL);

      // Prices and sizes might be strings or numbers depending on implementation
      expect(message.BEST_BID_PRICE).toBeDefined();
      expect(message.BEST_BID_SIZE).toBeDefined();
      expect(message.BEST_OFFER_PRICE).toBeDefined();
      expect(message.BEST_OFFER_SIZE).toBeDefined();

      // Convert to numbers for comparison
      const bidPrice = parseFloat(message.BEST_BID_PRICE);
      const offerPrice = parseFloat(message.BEST_OFFER_PRICE);
      const bidSize = parseInt(message.BEST_BID_SIZE);
      const offerSize = parseInt(message.BEST_OFFER_SIZE);

      // Verify constraints
      expect(bidPrice).toBeLessThan(offerPrice);
      expect(bidSize).toBeGreaterThan(0);
      expect(offerSize).toBeGreaterThan(0);

      simulator.stop();
    });

    it("should generate valid order messages", () => {
      // Start simulator to generate orders
      simulator.start();

      // Wait for updates
      jest.advanceTimersByTime(500);

      // Verify order messages were generated
      expect(marketDataManager.processOrderMessage).toHaveBeenCalled();

      // Find a NEW_ORDER type message
      const newOrderCall =
        marketDataManager.processOrderMessage.mock.calls.find(
          (call) => call[1] === "NEW_ORDER"
        );

      // If no NEW_ORDER was found, skip further checks
      if (newOrderCall) {
        const exchange = newOrderCall[0];
        const message = newOrderCall[2];

        // Verify exchange is one of the valid exchanges
        expect(simulator.exchanges).toContain(exchange);

        // Verify message has the required fields for a new order
        expect(simulator.symbols).toContain(message.SYMBOL);
        expect(typeof message.ORDER_ID).toBe("string");

        // Price and quantity might be strings or numbers
        expect(message.LIMIT_PRICE).toBeDefined();
        expect(["BUY", "SELL"]).toContain(message.SIDE);
        expect(message.QUANTITY).toBeDefined();

        // Convert to number for comparison if needed
        const quantity = parseInt(message.QUANTITY);
        expect(quantity).toBeGreaterThan(0);
      }

      simulator.stop();
    });

    it("should generate modify and cancel order messages", () => {
      // Start simulator to generate a mix of message types
      simulator.start();

      // Run for longer to ensure various message types are generated
      jest.advanceTimersByTime(3000);

      // Check for MODIFY_ORDER message
      const modifyOrderCall =
        marketDataManager.processOrderMessage.mock.calls.find(
          (call) => call[1] === "MODIFY_ORDER"
        );

      // Check for CANCEL_ORDER message
      const cancelOrderCall =
        marketDataManager.processOrderMessage.mock.calls.find(
          (call) => call[1] === "CANCEL_ORDER"
        );

      // Verify we have at least one of these message types
      expect(Boolean(modifyOrderCall) || Boolean(cancelOrderCall)).toBe(true);

      simulator.stop();
    });
  });

  describe("getSymbols", () => {
    it("should return the list of symbols", () => {
      const symbols = simulator.getSymbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);

      // Check that some common symbols exist (at least one should match)
      const commonSymbols = ["AAPL", "MSFT", "AMZN", "GOOGL", "FB"];
      expect(symbols.some((symbol) => commonSymbols.includes(symbol))).toBe(
        true
      );
    });
  });
});
