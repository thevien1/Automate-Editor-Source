import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

function execute(action: string, payload: any): any {
    const colToIdx = (colStr: string): number => {
      const trimmed = colStr.trim();
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        return Math.max(0, num - 1);
      }
      let cIdx = 0;
      const upper = trimmed.toUpperCase();
      for (let i = 0; i < upper.length; i++) {
        cIdx = cIdx * 26 + (upper.charCodeAt(i) - 64);
      }
      return Math.max(0, cIdx - 1);
    };

    if (action === 'readExcel') {
      if (!fs.existsSync(payload.path)) {
        return { success: false, error: 'Excel file does not exist' };
      }
      const wb = XLSX.readFile(payload.path);
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      const sheetName = wb.SheetNames[sheetIdx] || wb.SheetNames[0];
      if (!sheetName || !wb.Sheets[sheetName]) {
        return { success: false, error: `Sheet index ${sheetIdx} does not exist` };
      }
      const ws = wb.Sheets[sheetName];
      const colIdx = colToIdx(String(payload.col || 'A'));
      const rowNum = parseInt(String(payload.row || '1'), 10) || 1;
      const cellAddress = XLSX.utils.encode_cell({ c: colIdx, r: rowNum - 1 });
      const cell = ws[cellAddress];
      const val = cell ? (cell.v !== undefined ? String(cell.v) : (cell.w || '')) : '';
      return { success: true, value: val };
    }
    if (action === 'readExcelAllRows') {
      if (!fs.existsSync(payload.path)) {
        return { success: false, error: 'Excel file does not exist' };
      }
      const wb = XLSX.readFile(payload.path);
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      const sheetName = wb.SheetNames[sheetIdx] || wb.SheetNames[0];
      if (!sheetName || !wb.Sheets[sheetName]) {
        return { success: false, error: `Sheet index ${sheetIdx} does not exist` };
      }
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      return { success: true, sheetName, rows };
    }
    if (action === 'writeExcel') {
      let wb: XLSX.WorkBook;
      if (fs.existsSync(payload.path)) {
        wb = XLSX.readFile(payload.path);
      } else {
        wb = XLSX.utils.book_new();
      }
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      let sheetName = wb.SheetNames[sheetIdx];
      let ws: XLSX.WorkSheet;
      if (!sheetName || !wb.Sheets[sheetName]) {
        sheetName = `Sheet${sheetIdx + 1}`;
        ws = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        ws = wb.Sheets[sheetName];
      }
      const colIdx = colToIdx(String(payload.col || 'A'));
      const rowNum = parseInt(String(payload.row || '1'), 10) || 1;
      const cellAddress = XLSX.utils.encode_cell({ c: colIdx, r: rowNum - 1 });
      XLSX.utils.sheet_add_aoa(ws, [[payload.value ?? '']], { origin: cellAddress });
      const dir = path.dirname(payload.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      XLSX.writeFile(wb, payload.path);
      return { success: true };
    }
    if (action === 'appendExcel') {
      let wb: XLSX.WorkBook;
      if (fs.existsSync(payload.path)) {
        wb = XLSX.readFile(payload.path);
      } else {
        wb = XLSX.utils.book_new();
      }
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      let sheetName = wb.SheetNames[sheetIdx];
      let ws: XLSX.WorkSheet;
      if (!sheetName || !wb.Sheets[sheetName]) {
        sheetName = `Sheet${sheetIdx + 1}`;
        ws = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        ws = wb.Sheets[sheetName];
      }
      const colIdx = colToIdx(String(payload.col || 'A'));
      let nextRow = 1;
      while (
        ws[XLSX.utils.encode_cell({ c: colIdx, r: nextRow - 1 })] &&
        String(ws[XLSX.utils.encode_cell({ c: colIdx, r: nextRow - 1 })].v ?? '').trim() !== ''
      ) {
        nextRow++;
      }
      const cellAddress = XLSX.utils.encode_cell({ c: colIdx, r: nextRow - 1 });
      XLSX.utils.sheet_add_aoa(ws, [[payload.value ?? '']], { origin: cellAddress });
      const dir = path.dirname(payload.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      XLSX.writeFile(wb, payload.path);
      return { success: true, row: nextRow };
    }
    return { success: false, error: 'Unsupported Excel action' };
}

parentPort?.on('message', ({ id, action, payload }) => {
  try { parentPort!.postMessage({ id, result: execute(action, payload) }); }
  catch (error: any) { parentPort!.postMessage({ id, result: { success: false, error: error.message } }); }
});
