import { ImportOptions, ParsedData, ParsedTransaction, TransactionParser } from "../types";

// Cell values as normalized plain primitives
type CellValue = string | number | undefined;

export class IntesaSanpaoloParser implements TransactionParser {
    name = "Intesa Sanpaolo Import";
    fileExtensions = ["xlsx"];


    async canParse(file: File, _content: string): Promise<boolean> {
        return file.name.toLowerCase().endsWith('.xlsx');
    }


    async parse(file: File, _content: string, _options?: ImportOptions): Promise<ParsedData> {
        // Lazy-load exceljs: only users importing bank files pay the cost
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());

        const sheet = workbook.worksheets[0];
        if (!sheet) {
            throw new Error("Workbook contains no worksheets.");
        }

        // Flatten to a dense row matrix of plain values.
        // exceljs reads actual cells, so the corrupted !ref ranges that
        // Intesa Sanpaolo exports sometimes contain are not an issue here.
        const rows: CellValue[][] = [];
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const values: CellValue[] = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                values[colNumber - 1] = normalizeCellValue(cell.value);
            });
            rows[rowNumber - 1] = values;
        });

        // Find header row: we look for "Data", "Operazione", "Importo"
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const row = rows[i];
            if (!row) continue;
            if (row.includes("Data") && row.includes("Operazione") && row.includes("Importo")) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error("Could not find valid Intesa Sanpaolo headers (Data, Operazione, Importo).");
        }

        // Map columns
        const headerRow = rows[headerRowIndex];
        const colMap = {
            date: headerRow.indexOf("Data"),
            description: headerRow.indexOf("Operazione"),
            details: headerRow.indexOf("Dettagli"),
            category: headerRow.indexOf("Categoria"), // Note: Excel might have a trailing space "Categoria "
            amount: headerRow.indexOf("Importo")
        };

        // Handle "Categoria " with space if simple search failed
        if (colMap.category === -1) {
            colMap.category = headerRow.findIndex(
                (h) => typeof h === 'string' && h.trim() === "Categoria"
            );
        }

        const transactions: ParsedTransaction[] = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // Ensure we have at least date and amount
            if (row[colMap.date] === undefined || row[colMap.amount] === undefined) continue;

            // Parse Date
            const dateStr = parseDate(row[colMap.date]);

            // Parse Amount
            const rawAmount = row[colMap.amount];
            const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
            if (Number.isNaN(amount)) continue;

            // Description: "Operazione" is usually the merchant/type, "Dettagli" has more info.
            const op = row[colMap.description] || "";
            const det = row[colMap.details] || "";
            const description = det ? `${op} - ${det}` : String(op);

            // Infer type (Intesa expenses are negative)
            const type = amount < 0 ? 'expense' : 'income';

            transactions.push({
                date: dateStr,
                amount: amount,
                description: description.substring(0, 200), // Safety clip
                type: type,
                raw_data: row
            });
        }

        return {
            source: 'intesa_sanpaolo',
            transactions: transactions,
            metadata: {
                totalItems: transactions.length
            }
        };
    }
}

/**
 * Normalize an exceljs cell value to a plain string/number.
 * Dates become "YYYY-MM-DD" strings, formulas resolve to their result,
 * rich text flattens to plain text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCellValue(value: any): CellValue {
    if (value === null || value === undefined) return undefined;
    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }
    if (typeof value === 'object') {
        if ('result' in value) return normalizeCellValue(value.result); // formula
        if ('richText' in value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return value.richText.map((part: any) => part.text).join('');
        }
        if ('text' in value) return String(value.text); // hyperlink
        return String(value);
    }
    return value;
}

/**
 * Parse a date cell into "YYYY-MM-DD".
 * Handles ISO strings (from normalized Date cells), DD/MM/YYYY strings,
 * and Excel serial numbers.
 */
function parseDate(rawDate: CellValue): string {
    if (typeof rawDate === 'number') {
        // Excel serial date: (value - 25569) * 86400 * 1000
        const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        return dateObj.toISOString().split('T')[0];
    }
    if (typeof rawDate === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
            return rawDate.split('T')[0];
        }
        // Assuming DD/MM/YYYY
        const parts = rawDate.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    // Fallback
    return new Date().toISOString().split('T')[0];
}
