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

export interface IAssetReturn {
  ID: string;
  Type: string;
  Description?: string;
  Denomination: string;
  Category: string;
  ReturnsByDateRange: IReturn[] | null;
}

export interface IReturn {
  StartDate: string;
  EndDate: string;
  ReturnPercentage: number;
}

export interface IAssets {
  [key: string]: IAsset[];
}

export interface IAssetsReturn {
  [key: string]: IAssetReturn[];
}

export interface IValuation {
  Date: string;
  Value: number;
}

export interface IReferences {
  ID: string;
  Description?: string;
  Valuations: IValuation[];
}

export interface IReportV2 {
  ReferenceVariables: Record<string, IReferences>;
  AssetsByCategory: IAssets;
  AssetsReturnByCategory: IAssetsReturn;
  TotalHoldingsByDate?: any[];
  TotalReturns?: any[];
}
