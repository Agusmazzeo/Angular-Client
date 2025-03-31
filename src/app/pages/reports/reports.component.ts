import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, model, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatFormFieldModule,
  MatHint,
  MatLabel,
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  Router,
} from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import * as html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { forkJoin } from 'rxjs';

import { LoaderService } from '../../services/loader.service';
import { ReportsService } from '../../services/reports.service';
import { A3500_NAME, INFLATION_NAME } from '../constants';
import { EDateType } from '../enums';
import { IReport, IVouchers } from './interfaces';
import {
  IReferences,
  IReportV2,
  IValuation,
  IVouchersReturn,
} from './interfacesv2';
import { reportsMock } from './reports-mock';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarModule,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

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
  displayedColumns: string[] = [];
  dataSource: any[] = [];
  dates: any[] = [];
  differenceColumns: string[] = [];
  differenceDataSource: any[] = [];
  returnsColumns: string[] = [];
  returnsDataSource: any[] = [];
  referencesColumns: string[] = ['date', 'value_dolar', 'value_inflation'];
  referencesDataSource: any[] = [];
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

  calculateData(reportData: IReportV2) {
    const report: IReportV2 = reportData;
    const vouchers: IVouchers = report.VouchersByCategory;
    const dates = new Set<string>();
    const columns = new Set<string>();
    const rowsMap: { [key: string]: { [key: string]: number | string } } = {};
    const idValuesMap: { [key: string]: number } = {};

    for (const id in vouchers) {
      if (vouchers.hasOwnProperty(id)) {
        const holdings = vouchers[id][0].Holdings;
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
          rowsMap[date][id] =
            holding.Value !== null && holding.Value !== undefined
              ? holding.Value
              : '-';
        }
        if (!hasValidDate) {
          idValuesMap[id] = idValuesMap[id] || 0;
        } else {
          columns.add(id);
        }
      }
    }

    this.displayedColumns = ['date', ...Array.from(columns), 'total'];
    const sortedDates = Array.from(dates).sort();
    this.dataSource = sortedDates.map((date) => {
      const row: any = { date };
      let total = 0;
      for (const id of columns) {
        const value = rowsMap[date][id];
        row[id] = value !== undefined ? value : '-';
        if (typeof value === 'number') {
          total += value;
        }
      }
      row['total'] = total > 0 ? total : '-';
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
  }

  calculateReturn(reportData: IReportV2) {
    const report: IReportV2 = reportData;
    const vouchers: IVouchersReturn = report.VouchersReturnByCategory;
    const dates = new Set<string>();
    const columns = new Set<string>();
    const rowsMap: { [key: string]: { [key: string]: number | string } } = {};
    const idValuesMap: { [key: string]: number } = {};

    for (const id in vouchers) {
      if (vouchers.hasOwnProperty(id)) {
        const returns = vouchers[id][0].ReturnsByDateRange;
        let hasValidDate = false;
        for (const returnData of returns || []) {
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
          rowsMap[date][id] =
            returnData.ReturnPercentage !== null &&
            returnData.ReturnPercentage !== undefined
              ? returnData.ReturnPercentage
              : '-';
        }
        if (!hasValidDate) {
          idValuesMap[id] = idValuesMap[id] || 0;
        } else {
          columns.add(id);
        }
      }
    }

    this.returnsColumns = ['date', ...Array.from(columns), 'total'];
    const sortedDates = Array.from(dates).sort();
    this.returnsDataSource = sortedDates.map((date) => {
      const row: any = { date };
      let total = 0;
      for (const id of columns) {
        const value = rowsMap[date][id];
        row[id] = value !== undefined ? value : '-';
        if (typeof value === 'number') {
          total += value;
        }
      }
      row['total'] = total > 0 ? total : '-';
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

        // Recorremos todos los datos de inflación
        inflationValues?.forEach((inflation) => {
          // Buscamos la misma fecha en los datos del dólar
          const dolarValue = dolarValues?.find(
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
