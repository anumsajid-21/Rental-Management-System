import * as XLSX from 'xlsx';

/**
 * Generate an Excel workbook (.xlsx buffer) for a list of transactions or rentals.
 */
export function generateExcelReport(rows = [], sheetName = 'Transactions') {
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = [];
  if (rows.length > 0) {
    Object.keys(rows[0]).forEach((key, colIndex) => {
      let maxLen = key.length;
      rows.forEach((r) => {
        const valStr = String(r[key] || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      colWidths[colIndex] = { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
    });
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate a CSV string for transactions.
 */
export function generateCsvReport(rows = []) {
  if (rows.length === 0) return '';
  const worksheet = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(worksheet);
}
