export interface Position {
  id?: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  unrealized_pl: number;
  realized_pl: number;
  created_at?: Date;
  updated_at?: Date;
}
