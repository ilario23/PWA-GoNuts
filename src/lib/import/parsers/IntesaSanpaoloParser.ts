import { ImportOptions, ParsedData, ParsedTransaction, TransactionParser } from "../types";
import * as XLSX from 'xlsx';

export class IntesaSanpaoloParser implements TransactionParser {
    name = "Intesa Sanpaolo Import";
    fileExtensions = ["xlsx"];

     
    async canParse(file: File, _content: string): Promise<boolean> {
        return file.name.toLowerCase().endsWith('.xlsx');
    }

     
    async parse(file: File, _content: string, _options?: ImportOptions): Promise<ParsedData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    // Fix for Intesa Sanpaolo exports with corrupted !ref range
                    // The exported file may have incorrect !ref (e.g., A1:J33) but actual cells extend much further
                    // We need to recalculate the correct range by scanning all cell keys
                    const cellKeys = Object.keys(sheet).filter(k => !k.startsWith('!'));
                    if (cellKeys.length > 0) {
                        let maxRow = 0;
                        let maxCol = 0;
                        cellKeys.forEach(key => {
                            const match = key.match(/^([A-Z]+)(\d+)$/);
                            if (match) {
                                const col = XLSX.utils.decode_col(match[1]);
                                const row = parseInt(match[2]);
                                if (row > maxRow) maxRow = row;
                                if (col > maxCol) maxCol = col;
                            }
                        });
                        // Update the sheet range to the actual extent of data
                        const newRef = `A1:${XLSX.utils.encode_col(maxCol)}${maxRow}`;
                        sheet['!ref'] = newRef;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    // Find header row
                    // We look for "Data", "Operazione", "Dettagli"
                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(rows.length, 50); i++) {
                        const row = rows[i];
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
                        colMap.category = headerRow.findIndex((h: string) => h && h.trim() === "Categoria");
                    }

                    const transactions: ParsedTransaction[] = [];

                    for (let i = headerRowIndex + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;

                        // Ensure we have at least date and amount
                        if (row[colMap.date] === undefined || row[colMap.amount] === undefined) continue;

                        // Parse Date
                        // Excel dates are often numbers (serial), but sheet_to_json might treat them differently depending on options.
                        // However, we used { header: 1 } so we get mixed types.
                        // Intesa export usually has "Data" column.
                        let dateStr = "";
                        const rawDate = row[colMap.date];

                        if (typeof rawDate === 'number') {
                            // Excel serial date
                            // (value - 25569) * 86400 * 1000
                            const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                            dateStr = dateObj.toISOString().split('T')[0];
                        } else if (typeof rawDate === 'string') {
                            // "dd/mm/yyyy" or similar
                            // Try basic parsing if formatted as string
                            // Intesa probably exports dates as serial numbers in real xlsx, but let's handle string too
                            // Assuming DD/MM/YYYY
                            const parts = rawDate.split('/');
                            if (parts.length === 3) {
                                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                            } else {
                                // Fallback?
                                dateStr = new Date().toISOString().split('T')[0];
                            }
                        }

                        // Parse Amount
                        const rawAmount = row[colMap.amount];
                        const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount);
                        // Intesa expenses are negative. ImportProcessor expects positive amount usually? 
                        // Wait, previous Revolut parser returns negative for expense. 
                        // ImportProcessor line 267: `const normalizedAmount = Math.abs(tx.amount);`
                        // So it doesn't matter for ImportProcessor storage, but for UI preview it might look better if consistent.
                        // Let's keep it as is from file.

                        // Description
                        const op = row[colMap.description] || "";
                        const det = row[colMap.details] || "";
                        // Combine or pick best. "Operazione" is usually the merchant/type, "Dettagli" has more info.
                        // Let's combine nicely.
                        const description = det ? `${op} - ${det}` : op;

                        // Category (Standardize or leave for rules)
                        // Intesa has its own categories. We can pass them, but usually we just want to leverage our Rules engine.
                        // We can put it in `raw_data` for debug or potential auto-creation later.

                        // Infer type
                        const type = amount < 0 ? 'expense' : 'income';

                        transactions.push({
                            date: dateStr,
                            amount: amount,
                            description: description.substring(0, 200), // Safety clip
                            type: type,
                            raw_data: row
                        });
                    }

                    resolve({
                        source: 'intesa_sanpaolo',
                        transactions: transactions,
                        metadata: {
                            totalItems: transactions.length
                        }
                    });

                } catch (err) {
                    reject(err);
                }
            };

            reader.readAsArrayBuffer(file);
        });
    }
}
