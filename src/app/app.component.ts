import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { AddressRefactorService } from './core/services/address-refactor.service';
interface Refactorizado {
  address: string;
  country: string;
  zipCode: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'PathPilot';
  jsonData: any;

  constructor(private addressRefactorService: AddressRefactorService) { }

  
  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) return;
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      this.jsonData = this.addressRefactorService.refactorAddresses(rawData as string[][]);
    };
    reader.readAsBinaryString(target.files[0]);
  }
  
}
