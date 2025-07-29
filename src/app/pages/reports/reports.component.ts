import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, model, OnInit } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
    MatFormFieldModule,
    MatHint,
    MatLabel
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarModule,
    MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import {
    ActivatedRoute,
    ActivatedRouteSnapshot,
    Router
} from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import * as html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { forkJoin } from 'rxjs';

import { LoaderService } from '../../services/loader.service';
import { ReportsService } from '../../services/reports.service';
import { A3500_NAME, INFLATION_NAME } from '../constants';
import { EDateType } from '../enums';
import { IAssets, IReport } from './interfaces';
import {
    IAssetsReturn,
    IReferences,
    IReportV2,
    IValuation
} from './interfacesv2';
import { reportsMock } from './reports-mock';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    MatTableModule,
    MatDatepickerModule,
    MatHint,
    MatLabel,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    CurrencyPipe,
    MatTabsModule,
    NgxChartsModule,
    MatButtonModule,
    MatCardModule,
  ],
  providers: [provideNativeDateAdapter(), ReportsService],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  // Holdings data sources
  displayedColumns: string[] = [];
  dataSource: any[] = [];
  categoryDisplayedColumns: string[] = [];
  categoryDataSource: any[] = [];

  // Returns data sources
  returnsColumns: string[] = [];
  returnsDataSource: any[] = [];
  categoryReturnsColumns: string[] = [];
  categoryReturnsDataSource: any[] = [];

  // References data
  referencesColumns: string[] = ['date', 'value_dolar', 'value_inflation'];
  referencesDataSource: any[] = [];

  // Legacy data sources (keeping for compatibility)
  dates: any[] = [];
  differenceColumns: string[] = [];
  differenceDataSource: any[] = [];
  percentageWeeklyColumns: string[] = [];
  percentageWeeklyDataSource: any[] = [];
  percentageAcumColumns: string[] = [];
  percentageAcumDataSource: any[] = [];

  showRangeDatepicker: boolean = false;
  currencySigns: Record<string, string> = {};
  dateTypeOptions = [
    { name: 'Día', value: EDateType.DAY },
    { name: 'Rango', value: EDateType.RANGE },
  ];
  reportsFormGroup = new FormGroup({
    dateType: new FormControl(EDateType.DAY),
    startDate: new FormControl(),
    endDate: new FormControl(),
    date: new FormControl(),
    daysInterval: new FormControl(1),
    weeksInterval: new FormControl(0),
  });
  readonly labelPosition = model<EDateType.DAY | EDateType.RANGE>(
    EDateType.RANGE
  );

  viewPC: [number, number] = [700, 400];
  animationPC = true;
  colorSchemePC = 'vivid';
  labelsPC = true;
  doughnut = true;
  charData: any[] = [];
  accountId!: string;
  inflationData?: IReferences;
  dolarData?: IReferences;

  percentageFormatterPC(data: any): string {
    return data.value + '%';
  }
  constructor(
    private readonly reportService: ReportsService,
    private readonly loaderService: LoaderService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.accountId = this.route.snapshot.params['accountId'];
  }

  getCurrencySymbol(currency: string): string {
    return this.currencySigns[currency] || '';
  }

  changeDatetype(radioData: MatRadioChange) {
    this.reportsFormGroup.updateValueAndValidity();
    this.showRangeDatepicker = radioData.value === EDateType.RANGE;
  }

  calculateData(reportData: any) {
    // Transform AssetsByCategory if needed
    const transformedData = this.transformAssetsData(reportData);
    const report: IReportV2 = transformedData;
    const assets: IAssets = report.AssetsByCategory;

    // Get total holdings data
    const totalHoldings = reportData.TotalHoldingsByDate;

    // Check if assets data is available
    if (!assets || Object.keys(assets).length === 0) {
      this.displayedColumns = ['date', 'message'];
      this.dataSource = [
        {
          date: 'No disponible',
          message:
            'Los datos de tenencia no están disponibles en este momento.',
        },
      ];
      return;
    }

    const dates = new Set<string>();
    const columns = new Set<string>();
    const rowsMap: { [key: string]: { [key: string]: number | string } } = {};
    const idValuesMap: { [key: string]: number } = {};

    // Process each category and extract individual asset IDs
    for (const category in assets) {
      if (assets.hasOwnProperty(category)) {
        const categoryAssets = assets[category];
        // Process each asset in the category
        for (const asset of categoryAssets) {
          const assetId = asset.ID;
          const holdings = asset.Holdings || [];
          let hasValidDate = false;

          for (const holding of holdings) {
            const date = holding.Date
              ? new Date(holding.DateRequested).toISOString().split('T')[0]
              : '-';
            if (holding.Date) {
              hasValidDate = true;
              dates.add(date);
            }
            if (!rowsMap[date]) {
              rowsMap[date] = {};
            }
            rowsMap[date][assetId] =
              holding.Value !== null && holding.Value !== undefined
                ? holding.Value
                : '-';
          }
          if (!hasValidDate) {
            idValuesMap[assetId] = idValuesMap[assetId] || 0;
          } else {
            columns.add(assetId);
          }
        }
      }
    }

    this.displayedColumns = ['date', ...Array.from(columns), 'total'];
    const sortedDates = Array.from(dates).sort();

    // Create a map for total holdings by date
    const totalHoldingsMap: { [key: string]: number } = {};
    if (totalHoldings) {
      for (const totalHolding of totalHoldings) {
        const date = totalHolding.Date
          ? new Date(totalHolding.DateRequested).toISOString().split('T')[0]
          : '-';
        if (totalHolding.Date) {
          totalHoldingsMap[date] = totalHolding.Value;
        }
      }
    }

    this.dataSource = sortedDates.map((date) => {
      const row: any = { date };
      for (const id of columns) {
        const value = rowsMap[date][id];
        row[id] = value !== undefined ? value : '-';
      }
      // Use TotalHoldingsByDate value for the total column
      row['total'] =
        totalHoldingsMap[date] !== undefined ? totalHoldingsMap[date] : '-';
      return row;
    });

    for (const id in idValuesMap) {
      if (idValuesMap.hasOwnProperty(id)) {
        const row: any = { date: '-' };
        let total = 0;
        for (const columnId of columns) {
          if (columnId === id) {
            row[columnId] = idValuesMap[id];
            total += idValuesMap[id];
          } else {
            row[columnId] = '-';
          }
        }
        row['total'] = total > 0 ? total : '-';
        if (Object.values(row).filter((item) => item !== '-')?.length) {
          this.dataSource.push(row);
        }
      }
    }
    this.calculateReturn(reportData);
    this.calculateCategoryData(reportData);
    this.calculateCategoryReturns(reportData);
  }

  private transformAssetsData(data: any): IReportV2 {
    console.log('Original data structure:', Object.keys(data));

    // If the data already has the expected structure, return it as is
    if (data.AssetsByCategory) {
      console.log('Data already has AssetsByCategory structure');
      // Ensure we preserve the total data
      return {
        AssetsByCategory: data.AssetsByCategory,
        AssetsReturnByCategory: data.AssetsReturnByCategory || {},
        ReferenceVariables: data.ReferenceVariables || {},
        TotalHoldingsByDate: data.TotalHoldingsByDate,
        TotalReturns: data.TotalReturns,
      };
    }

    // Process AssetsByCategory
    const transformed: IReportV2 = {
      AssetsByCategory: {},
      AssetsReturnByCategory: {},
      ReferenceVariables: data.ReferenceVariables || {},
      TotalHoldingsByDate: data.TotalHoldingsByDate,
      TotalReturns: data.TotalReturns,
    };

    if (data.AssetsByCategory) {
      console.log('Processing AssetsByCategory');
      // Process each category
      for (const category in data.AssetsByCategory) {
        if (data.AssetsByCategory.hasOwnProperty(category)) {
          const assets = data.AssetsByCategory[category];
          transformed.AssetsByCategory[category] = assets.map((asset: any) => ({
            ID: asset.ID,
            Type: asset.Type,
            Denomination: asset.Denomination,
            Category: asset.Category,
            Holdings: asset.Holdings || [],
            Transactions: asset.Transactions || [],
          }));
        }
      }
      console.log(
        'Processed categories:',
        Object.keys(transformed.AssetsByCategory)
      );
    }

    // Process AssetsReturnByCategory
    if (data.AssetsReturnByCategory) {
      console.log('Processing AssetsReturnByCategory');
      console.log(
        'AssetsReturnByCategory keys:',
        Object.keys(data.AssetsReturnByCategory)
      );
      console.log(
        'AssetsReturnByCategory sample:',
        data.AssetsReturnByCategory
      );
      transformed.AssetsReturnByCategory = data.AssetsReturnByCategory;
      console.log(
        'Processed AssetsReturnByCategory:',
        transformed.AssetsReturnByCategory
      );
    }

    return transformed;
  }

  calculateReturn(reportData: any) {
    // Try to get returns data from different possible sources
    let assets: any = null;
    let totalReturns: any = null;

    if (reportData.AssetsReturnByCategory) {
      assets = reportData.AssetsReturnByCategory;
    }

    // Get total returns data
    if (reportData.TotalReturns) {
      totalReturns = reportData.TotalReturns;
    }

    // If no return data is available, create empty arrays
    if (!assets || Object.keys(assets).length === 0) {
      console.log('No return data available, showing message');
      this.returnsColumns = ['date', 'message'];
      this.returnsDataSource = [
        {
          date: 'No disponible',
          message:
            'Los datos de rendimiento no están disponibles en este momento.',
        },
      ];
      return;
    }

    const dates = new Set<string>();
    const columns = new Set<string>();
    const rowsMap: { [key: string]: { [key: string]: number | string } } = {};
    const idValuesMap: { [key: string]: number } = {};

    // Process each category and extract individual asset IDs
    for (const category in assets) {
      if (assets.hasOwnProperty(category)) {
        const categoryAssets = assets[category];
        // Process each asset in the category
        for (const asset of categoryAssets) {
          const assetId = asset.ID;
          const returns = asset.ReturnsByDateRange || [];
          let hasValidDate = false;

          for (const returnData of returns) {
            const date = returnData.StartDate
              ? new Date(returnData.StartDate).toISOString().split('T')[0]
              : '-';
            if (returnData.StartDate) {
              hasValidDate = true;
              dates.add(date);
            }
            if (!rowsMap[date]) {
              rowsMap[date] = {};
            }
            rowsMap[date][assetId] =
              returnData.ReturnPercentage !== null &&
              returnData.ReturnPercentage !== undefined
                ? returnData.ReturnPercentage
                : '-';
          }
          if (!hasValidDate) {
            idValuesMap[assetId] = idValuesMap[assetId] || 0;
          } else {
            columns.add(assetId);
          }
        }
      }
    }

    this.returnsColumns = ['date', ...Array.from(columns), 'total'];
    const sortedDates = Array.from(dates).sort();

    // Create a map for total returns by date
    const totalReturnsMap: { [key: string]: number } = {};
    if (totalReturns) {
      for (const totalReturn of totalReturns) {
        const date = totalReturn.StartDate
          ? new Date(totalReturn.StartDate).toISOString().split('T')[0]
          : '-';
        if (totalReturn.StartDate) {
          totalReturnsMap[date] = totalReturn.ReturnPercentage;
        }
      }
    }

    this.returnsDataSource = sortedDates.map((date) => {
      const row: any = { date };
      for (const id of columns) {
        const value = rowsMap[date][id];
        row[id] = value !== undefined ? value : '-';
      }
      // Use TotalReturns value for the total column
      row['total'] =
        totalReturnsMap[date] !== undefined ? totalReturnsMap[date] : '-';
      return row;
    });

    for (const id in idValuesMap) {
      if (idValuesMap.hasOwnProperty(id)) {
        const row: any = { date: '-' };
        let total = 0;
        for (const columnId of columns) {
          if (columnId === id) {
            row[columnId] = idValuesMap[id];
            total += idValuesMap[id];
          } else {
            row[columnId] = '-';
          }
        }
        row['total'] = total > 0 ? total : '-';
        if (Object.values(row).filter((item) => item !== '-')?.length) {
          this.returnsDataSource.push(row);
        }
      }
    }
  }

  calculateCategoryData(reportData: any) {
    const categoryAssets = reportData.CategoryAssets;
    const totalHoldings = reportData.TotalHoldingsByDate;

    // Check if category assets data is available
    if (!categoryAssets || Object.keys(categoryAssets).length === 0) {
      this.categoryDisplayedColumns = ['date', 'message'];
      this.categoryDataSource = [
        {
          date: 'No disponible',
          message:
            'Los datos de tenencia por categoría no están disponibles en este momento.',
        },
      ];
      return;
    }

    const dates = new Set<string>();
    const columns = new Set<string>();
    const rowsMap: { [key: string]: { [key: string]: number | string } } = {};

    for (const category in categoryAssets) {
      if (categoryAssets.hasOwnProperty(category)) {
        const holdings = categoryAssets[category].Holdings || [];
        let hasValidDate = false;
        for (const holding of holdings) {
          const date = holding.Date
            ? new Date(holding.DateRequested).toISOString().split('T')[0]
            : '-';
          if (holding.Date) {
            hasValidDate = true;
            dates.add(date);
          }
          if (!rowsMap[date]) {
            rowsMap[date] = {};
          }
          rowsMap[date][category] =
            holding.Value !== null && holding.Value !== undefined
              ? holding.Value
              : '-';
        }
        if (hasValidDate) {
          columns.add(category);
        }
      }
    }

    this.categoryDisplayedColumns = ['date', ...Array.from(columns), 'total'];
    const sortedDates = Array.from(dates).sort();

    // Create a map for total holdings by date
    const totalHoldingsMap: { [key: string]: number } = {};
    if (totalHoldings) {
      for (const totalHolding of totalHoldings) {
        const date = totalHolding.Date
          ? new Date(totalHolding.DateRequested).toISOString().split('T')[0]
          : '-';
        if (totalHolding.Date) {
          totalHoldingsMap[date] = totalHolding.Value;
        }
      }
    }

    this.categoryDataSource = sortedDates.map((date) => {
      const row: any = { date };
      for (const category of columns) {
        const value = rowsMap[date][category];
        row[category] = value !== undefined ? value : '-';
      }
      // Use TotalHoldingsByDate value for the total column
      row['total'] =
        totalHoldingsMap[date] !== undefined ? totalHoldingsMap[date] : '-';
      return row;
    });
  }

  calculateCategoryReturns(reportData: any) {
    const categoryAssetsReturn = reportData.CategoryAssetsReturn;
    const totalReturns = reportData.TotalReturns;

    // Check if category returns data is available
    if (
      !categoryAssetsReturn ||
      Object.keys(categoryAssetsReturn).length === 0
    ) {
      this.categoryReturnsColumns = ['date', 'message'];
      this.categoryReturnsDataSource = [
        {
          date: 'No disponible',
          message:
            'Los datos de rendimiento por categoría no están disponibles en este momento.',
        },
      ];
      return;
    }

    const dates = new Set<string>();
    const columns = new Set<string>();
    const rowsMap: { [key: string]: { [key: string]: number | string } } = {};

    for (const category in categoryAssetsReturn) {
      if (categoryAssetsReturn.hasOwnProperty(category)) {
        const returns = categoryAssetsReturn[category].ReturnsByDateRange || [];
        let hasValidDate = false;
        for (const returnData of returns) {
          const date = returnData.StartDate
            ? new Date(returnData.StartDate).toISOString().split('T')[0]
            : '-';
          if (returnData.StartDate) {
            hasValidDate = true;
            dates.add(date);
          }
          if (!rowsMap[date]) {
            rowsMap[date] = {};
          }
          rowsMap[date][category] =
            returnData.ReturnPercentage !== null &&
            returnData.ReturnPercentage !== undefined
              ? returnData.ReturnPercentage
              : '-';
        }
        if (hasValidDate) {
          columns.add(category);
        }
      }
    }

    this.categoryReturnsColumns = ['date', ...Array.from(columns), 'total'];
    const sortedDates = Array.from(dates).sort();

    // Create a map for total returns by date
    const totalReturnsMap: { [key: string]: number } = {};
    if (totalReturns) {
      for (const totalReturn of totalReturns) {
        const date = totalReturn.StartDate
          ? new Date(totalReturn.StartDate).toISOString().split('T')[0]
          : '-';
        if (totalReturn.StartDate) {
          totalReturnsMap[date] = totalReturn.ReturnPercentage;
        }
      }
    }

    this.categoryReturnsDataSource = sortedDates.map((date) => {
      const row: any = { date };
      for (const category of columns) {
        const value = rowsMap[date][category];
        row[category] = value !== undefined ? value : '-';
      }
      // Use TotalReturns value for the total column
      row['total'] =
        totalReturnsMap[date] !== undefined ? totalReturnsMap[date] : '-';
      return row;
    });
  }

  calculateDifferences() {
    const columns = this.displayedColumns.slice(1, -1);
    this.differenceColumns = ['date', ...columns, 'total'];
    this.differenceDataSource = this.dataSource.map((row, index, arr) => {
      if (index === 0) {
        const rowWithDifferences: any = { date: row.date };
        this.differenceColumns
          .slice(1, -1)
          .forEach((col) => (rowWithDifferences[col] = '-'));
        return rowWithDifferences;
      }
      const previousRow = arr[index - 1];
      const rowWithDifferences: any = { date: row.date };
      this.differenceColumns.slice(1).forEach((col) => {
        const currentValue = row[col];
        const previousValue = previousRow[col];
        if (
          typeof currentValue === 'number' &&
          typeof previousValue === 'number'
        ) {
          rowWithDifferences[col] = currentValue - previousValue;
        } else {
          rowWithDifferences[col] = '-';
        }
      });
      return rowWithDifferences;
    });
    this.calculateWeeklyPercentages();
  }

  calculateWeeklyPercentages() {
    this.percentageWeeklyColumns = [
      'date',
      'porcentual',
      'ARS',
      'A3500',
      'inflacion',
    ];
    this.percentageWeeklyDataSource = this.dataSource.map((row, index, arr) => {
      if (index === 0) {
        const rowWithPercentages: any = { date: row.date };
        this.percentageWeeklyColumns
          .slice(1)
          .forEach((col) => (rowWithPercentages[col] = 0));
        return rowWithPercentages;
      }
      const previousRow = arr[index - 1];
      const currentValue = row['total'];
      const previousValue = previousRow['total'];
      const porcentual =
        typeof currentValue === 'number' && typeof previousValue === 'number'
          ? currentValue / previousValue - 1
          : 0;
      const activeReturn = this.differenceDataSource.find(
        (data: any) => data.date === row.date
      );
      return {
        date: row.date,
        porcentual,
        ARS: activeReturn.total,
        inflacion: this.getValuationValue(row.date, this.inflationData),
        A3500: this.getValuationValue(row.date, this.dolarData),
      };
    });

    this.calculatePercentagesAcum();
  }

  calculatePercentagesAcum() {
    this.percentageAcumColumns = [
      'date',
      'porcentual',
      'ARS',
      'A3500',
      'inflacion',
    ];
    this.percentageAcumDataSource = this.percentageWeeklyDataSource.map(
      (row, index, arr) => {
        if (index === 0) {
          const rowWithPercentages: any = { date: row.date };
          this.percentageAcumColumns
            .slice(1)
            .forEach((col) => (rowWithPercentages[col] = 0));
          return rowWithPercentages;
        }
        const previousRow = arr[index - 1];
        const currentPercentValue = row['porcentual'];
        const previouPercentValue = previousRow['porcentual'];

        const currentARSValue = row['ARS'];
        const previouARSValue = previousRow['ARS'];
        const ARS =
          typeof currentARSValue === 'number' &&
          typeof previouARSValue === 'number'
            ? previouARSValue + currentARSValue
            : 0;
        const porcentual =
          typeof currentPercentValue === 'number' &&
          typeof previouPercentValue === 'number'
            ? (1 + previouPercentValue) * (1 + currentPercentValue) - 1
            : 0;
        const data = this.percentageWeeklyDataSource.filter(
          (data: any) => data.date === row.date
        );
        return {
          date: row.date,
          porcentual,
          ARS,
          inflacion: this.getValuationValue(row.date, this.inflationData),
          A3500: this.getValuationValue(row.date, this.dolarData),
        };
      }
    );
  }

  searchData() {
    this.loaderService.showLoader();
    const { startDate, endDate, date, dateType, daysInterval, weeksInterval } =
      this.reportsFormGroup?.controls;

    if (dateType?.value === EDateType.DAY) {
      this.fetchReportData(true, date.value);
    } else {
      this.fetchReportData(
        false,
        startDate.value,
        endDate.value,
        daysInterval?.value,
        weeksInterval?.value
      );
    }
  }

  checkValidDates() {
    const { startDate, endDate, date, dateType } =
      this.reportsFormGroup?.controls;

    return dateType?.value === EDateType.DAY
      ? !!date?.value
      : !!startDate?.value && !!endDate?.value;
  }

  exportFile(type: string) {
    this.loaderService.showLoader();
    const { startDate, endDate, date, dateType, daysInterval, weeksInterval } =
      this.reportsFormGroup?.controls;
    const params =
      dateType?.value === EDateType.DAY
        ? { date: date.value }
        : { startDate: startDate.value, endDate: endDate.value };

    if (type == 'xlsx') {
      this.reportService
        .exportXls(
          params,
          this.accountId,
          daysInterval?.value,
          weeksInterval?.value
        )
        .subscribe({
          next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte.${type}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this.loaderService.hideLoader();
          },
          error: (err) => {
            console.error('Error al descargar el archivo', err);
            const error: string =
              err?.error?.error || 'Ocurrió un error al descargar el archivo.';
            this.showErrorSnackBar(error);
            this.loaderService.hideLoader();
          },
        });
    } else {
      this.reportService
        .exportPdf(
          params,
          this.accountId,
          daysInterval?.value,
          weeksInterval?.value
        )
        .subscribe({
          next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte.pdf`; // Explicitly set the file extension to PDF
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url); // Clean up the object URL
            this.loaderService.hideLoader(); // Hide the loader after download
          },
          error: (err) => {
            console.error('Error al descargar el archivo', err);
            const error: string =
              err?.error?.error || 'Ocurrió un error al descargar el archivo.';
            this.showErrorSnackBar(error);
            this.loaderService.hideLoader(); // Hide the loader on error
          },
        });
    }
  }

  private fetchReportData(
    isSingleDate: boolean = false,
    start: any,
    end?: any | null,
    days?: number | null,
    weeks?: number | null
  ) {
    const reportObservable = isSingleDate
      ? this.reportService.getReportsByRange(this.accountId, start, start)
      : this.reportService.getReportsByRange(
          this.accountId,
          start,
          end,
          days,
          weeks
        );

    reportObservable.subscribe({
      next: (reports: IReportV2) => {
        this.inflationData = reports.ReferenceVariables?.[INFLATION_NAME];
        this.dolarData = reports.ReferenceVariables?.[A3500_NAME];

        const inflationValues = this.inflationData?.Valuations;
        const dolarValues = this.dolarData?.Valuations;
        this.referencesDataSource = [];

        // If reference variables are available, process them
        if (inflationValues && dolarValues) {
          // Recorremos todos los datos de inflación
          inflationValues.forEach((inflation) => {
            // Buscamos la misma fecha en los datos del dólar
            const dolarValue = dolarValues.find(
              (dolar) => dolar.Date === inflation.Date
            );

            if (dolarValue) {
              this.referencesDataSource.push({
                date: inflation.Date,
                value_dolar: dolarValue.Value,
                value_inflation: inflation.Value / 100,
              });
            }
          });
        } else {
          // If no reference variables, show a message
          this.referencesDataSource = [
            {
              date: 'No disponible',
              value_dolar: 'No disponible',
              value_inflation: 'No disponible',
            },
          ];
        }

        this.calculateData(reports);
        this.loaderService.hideLoader();
      },
      error: (err) => {
        const error: string =
          err?.error?.error || 'Ocurrió un error al obtener los datos.';
        console.error('Error al obtener los datos del informe:', err);
        this.showErrorSnackBar(error);
        this.loaderService.hideLoader();
      },
    });
  }

  private getValuationValue = (date: string, reference?: IReferences) => {
    const ref = reference?.Valuations?.find((i: IValuation) =>
      date.includes(i.Date)
    );
    return ref?.Value;
  };

  private showErrorSnackBar(message: string) {
    this.snackBar.open(message, 'X', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: ['error-snackbar'],
    });
  }
}
