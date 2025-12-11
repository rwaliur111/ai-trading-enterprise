// src/domains/trading/entities/portfolio.ts
export interface Portfolio {
  id: string;
  name: string;
  cashBalance: number;
  marketValue: number;
  totalValue: number;
  positions: Position[];
  dailyPL: number;
  totalPL: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  portfolioId: string;
  buyingPower: number;
  dayTrades: number;
  marginEnabled: boolean;
  createdAt: Date;
}
