export interface IHolding {
  Currency: string;
  CurrencySign: string;
  Value: number;
  DateRequested: string;
  Date: string | null;
}

export interface IAsset {
  ID: string;
  Type: string;
  Description?: string;
  Holdings: IHolding[];
  Denomination: string;
  Category: string;
  Transactions: any[];
}

export interface IAssets {
  [key: string]: IAsset[];
}

export interface IReport {
  AssetsByCategory: IAssets;
}
