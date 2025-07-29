import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { IReportV2 } from '../pages/reports/interfacesv2';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  constructor(private http: HttpClient) {}

  private apiUrl = environment.apiUrl;

  getAccountAssetsByDate(accountId: string, date: string): Observable<any> {
    const formattedDate = this.formatDate(date);
    const url = `${this.apiUrl}/accounts/${accountId}?date=${formattedDate}`;
    return this.http.get<any>(url);
  }

  getReportsByDate(accountId: string, date: string): Observable<any> {
    const formattedDate = this.formatDate(date);
    const url = `${this.apiUrl}/reports/${accountId}?date=${formattedDate}`;
    return this.http.get<any>(url);
  }

  getAccountAssetsByRange(
    accountId: string,
    startDate: string,
    endDate: string,
    daysInterval: null | number = 1,
    weeksInterval: null | number = 0
  ): Observable<any> {
    const startDateFormatted = this.formatDate(startDate);
    const endDateFormatted = this.formatDate(endDate);
    const interval = `${weeksInterval}w:${daysInterval}d`;
    const url = `${this.apiUrl}/accounts/${accountId}?startDate=${startDateFormatted}&endDate=${endDateFormatted}&interval=${interval}`;
    return this.http.get<any>(url, {});
  }

  getReportsByRange(
    accountId: string,
    startDate: string,
    endDate: string,
    daysInterval: null | number = 1,
    weeksInterval: null | number = 0
  ): Observable<IReportV2> {
    const startDateFormatted = this.formatDate(startDate);
    const endDateFormatted = this.formatDate(endDate);
    const interval = `${weeksInterval}w:${daysInterval}d`;
    const url = `${this.apiUrl}/reports/${accountId}?startDate=${startDateFormatted}&endDate=${endDateFormatted}&interval=${interval}`;
    return this.http.get<any>(url, {});
  }

  exportXls(
    params: any,
    accountId: string,
    daysInterval: null | number = 1,
    weeksInterval: null | number = 0
  ) {
    let dates: string;
    const interval = `${weeksInterval}w:${daysInterval}d`;
    if (params?.startDate && params?.endDate) {
      const startDateFormatted = this.formatDate(params.startDate);
      const endDateFormatted = this.formatDate(params.endDate);
      dates = `startDate=${startDateFormatted}&endDate=${endDateFormatted}`;
    } else {
      const dateFormatted = this.formatDate(params?.date);
      dates = `date=${dateFormatted}`;
    }
    const url = `${this.apiUrl}/reports/${accountId}/file?${dates}&interval=${interval}&format=XLSX`;
    return this.http.get(url, {
      responseType: 'blob',
    });
  }

  exportPdf(
    params: any,
    accountId: string,
    daysInterval: null | number = 1,
    weeksInterval: null | number = 0
  ) {
    let dates: string;
    const interval = `${weeksInterval}w:${daysInterval}d`;
    if (params?.startDate && params?.endDate) {
      const startDateFormatted = this.formatDate(params.startDate);
      const endDateFormatted = this.formatDate(params.endDate);
      dates = `startDate=${startDateFormatted}&endDate=${endDateFormatted}`;
    } else {
      const dateFormatted = this.formatDate(params?.date);
      dates = `date=${dateFormatted}`;
    }
    const url = `${this.apiUrl}/reports/${accountId}/file?${dates}&interval=${interval}&format=PDF`;
    return this.http.get(url, {
      responseType: 'blob',
    });
  }

  private formatDate(date: string | Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
