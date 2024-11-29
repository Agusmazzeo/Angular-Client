export interface IHolding {
  Currency: string;
  CurrencySign: string;
  Value: number;
  DateRequested: string;
  Date: string | null;
}

export interface IVoucher {
  ID: string;
  Type: string;
  Description?: string;
  Holdings: IHolding[];
  Denomination: string;
  Category: string;
  Transactions: any[];
}

export interface IVoucherReturn {
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

export interface IVouchers {
  [key: string]: IVoucher[];
}

export interface IVouchersReturn {
  [key: string]: IVoucherReturn[];
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
  ReferenceVariables: IReferences[];
  VouchersByCategory: IVouchers;
  VouchersReturnByCategory: IVouchersReturn;
}
