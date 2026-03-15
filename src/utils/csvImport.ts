import { Product } from '../types';
import { PRODUCT_COLORS, PRODUCT_LABELS, MAX_PRODUCTS } from './colors';

export interface CSVImportResult {
  products: Product[];
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(raw: string, existingCount = 0): CSVImportResult {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const errors: string[] = [];
  const products: Product[] = [];

  if (lines.length < 2) {
    return { products: [], errors: ['CSV must have a header row and at least one data row.'] };
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));

  const idx = {
    name: headers.findIndex(h => h.includes('name') || h.includes('product') || h.includes('item')),
    length: headers.findIndex(h => h.includes('length') || h === 'l'),
    width: headers.findIndex(h => h.includes('width') || h === 'w'),
    height: headers.findIndex(h => h.includes('height') || h === 'h'),
    netWeight: headers.findIndex(h => h.includes('net')),
    grossWeight: headers.findIndex(h => h.includes('gross')),
    quantity: headers.findIndex(h => h.includes('qty') || h.includes('quantity')),
  };

  for (let i = 1; i < lines.length; i++) {
    const totalIdx = existingCount + products.length;
    if (totalIdx >= MAX_PRODUCTS) break;

    const cols = parseCSVLine(lines[i]);
    const rowNum = i + 1;

    const length = idx.length >= 0 ? parseFloat(cols[idx.length] ?? '') : NaN;
    const width = idx.width >= 0 ? parseFloat(cols[idx.width] ?? '') : NaN;
    const height = idx.height >= 0 ? parseFloat(cols[idx.height] ?? '') : NaN;

    if (isNaN(length) || isNaN(width) || isNaN(height) || length <= 0 || width <= 0 || height <= 0) {
      errors.push(`Row ${rowNum}: Invalid or missing dimensions — skipped.`);
      continue;
    }

    const netWeight = idx.netWeight >= 0 ? parseFloat(cols[idx.netWeight] ?? '') || 0 : 0;
    const grossWeight = idx.grossWeight >= 0 ? parseFloat(cols[idx.grossWeight] ?? '') || 0 : 0;
    const quantity = idx.quantity >= 0 ? parseInt(cols[idx.quantity] ?? '') || undefined : undefined;
    const name =
      idx.name >= 0 && cols[idx.name]
        ? cols[idx.name]
        : (PRODUCT_LABELS[totalIdx] ?? `Product ${totalIdx + 1}`);

    products.push({
      id: `product-csv-${Date.now()}-${i}`,
      name,
      length,
      width,
      height,
      netWeight,
      grossWeight,
      color: PRODUCT_COLORS[totalIdx % PRODUCT_COLORS.length],
      quantity,
      stackable: true,
      fragile: false,
      orientationLock: 'none',
      priority: 5,
    });
  }

  return { products, errors };
}

export function generateCSVTemplate(): string {
  const header = 'name,length,width,height,netWeight,grossWeight,quantity';
  const example1 = 'Widget Box,40,30,25,2.5,3.0,100';
  const example2 = 'Heavy Part,60,50,40,15.0,16.5,50';
  return [header, example1, example2].join('\n');
}

export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'loadcalc-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
