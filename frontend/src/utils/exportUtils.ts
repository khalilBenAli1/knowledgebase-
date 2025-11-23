// Utility functions for exporting data to CSV and Excel formats

interface ExportData {
  headers: string[];
  rows: (string | number | null)[][];
  filename: string;
}

/**
 * Export data to CSV format with proper encoding and formatting
 */
export function exportToCSV(data: ExportData): void {
  const { headers, rows, filename } = data;

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';

  // Escape and quote CSV cells properly
  const escapeCellValue = (value: string | number | null): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV content
  const csvContent = [
    headers.map(escapeCellValue).join(','),
    ...rows.map(row => row.map(escapeCellValue).join(','))
  ].join('\n');

  // Create blob with BOM for UTF-8
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format (XLSX) using HTML table approach
 * This creates a simple Excel file that opens properly in Excel/LibreOffice
 */
export function exportToExcel(data: ExportData): void {
  const { headers, rows, filename } = data;

  // Build HTML table with proper styling
  const htmlTable = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sheet1</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th {
          background-color: #134a21;
          color: white;
          font-weight: bold;
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
        td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${escapeHtml(String(cell || ''))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Create blob with Excel MIME type
  const blob = new Blob([htmlTable], {
    type: 'application/vnd.ms-excel;charset=utf-8;'
  });

  downloadBlob(blob, `${filename}.xls`);
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Helper function to trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a date for export
 */
export function formatDateForExport(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}
