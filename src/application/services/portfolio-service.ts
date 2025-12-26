async getMockPortfolio(): Promise<any> {
  // Mock portfolio for development
  return {
    account_value: 100000,
    buying_power: 50000,
    cash: 20000,
    positions: [
      {
        symbol: 'AAPL',
        qty: 50,
        avg_entry_price: 170.25,
        current_price: 175.50,
        market_value: 8775,
        unrealized_pl: 262.50
      },
      {
        symbol: 'MSFT',
        qty: 30,
        avg_entry_price: 415.80,
        current_price: 420.75,
        market_value: 12622.50,
        unrealized_pl: 148.50
      },
      {
        symbol: 'TSLA',
        qty: 20,
        avg_entry_price: 240.30,
        current_price: 235.40,
        market_value: 4708,
        unrealized_pl: -98
      }
    ],
    total_market_value: 26105.50,
    total_unrealized_pl: 313,
    timestamp: new Date().toISOString()
  };
}

// Update the getPortfolio method to use mock data initially:
async getPortfolio(): Promise<any> {
  try {
    // For development, return mock data
    // In production, you would call: return await this.alpacaService.getPortfolio();
    return await this.getMockPortfolio();
  } catch (error) {
    console.error('Error in PortfolioService.getPortfolio:', error);
    return await this.getMockPortfolio();
  }
}