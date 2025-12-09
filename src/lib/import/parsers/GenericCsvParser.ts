
import Papa from 'papaparse';
import { TransactionParser, ParsedData, ParsedTransaction, ImportOptions } from '../types';

export class GenericCsvParser implements TransactionParser {
    name = "Generic CSV Import";
    fileExtensions = ["csv"];

    async canParse(file: File, _content: string): Promise<boolean> {
        return file.name.toLowerCase().endsWith('.csv');
    }

    async parse(_file: File, content: string, options?: ImportOptions): Promise<ParsedData> {
        if (!options?.csvMapping) {
            throw new Error("CSV Mapping options are required for CSV import");
        }

        const { csvMapping } = options;

        return new Promise((resolve, reject) => {
            Papa.parse(content, {
                header: csvMapping.hasHeader,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const transactions: ParsedTransaction[] = results.data.map((row: any) => {
                            // Determine values based on mapping
                            // If hasHeader is true, row is an object with keys as headers
                            // If hasHeader is false, row is an array, and column 'A', 'B' etc are mapped to indices? 
                            // Actually, typically users mapping columns by Name (if header) or Index (if no header).
                            // Let's assume for this iteration we map by COLUMN NAME (so require header for now or flexible).

                            // For robustness: map might be "Date" -> row["Date"] or index if row is array.
                            // Papaparse with header: true returns objects.

                            let dateVal = row[csvMapping.dateColumn];
                            let amountVal = row[csvMapping.amountColumn];
                            let descVal = row[csvMapping.descriptionColumn];

                            // Basic cleaning
                            let feeVal = csvMapping.feeColumn ? row[csvMapping.feeColumn] : '0';

                            // Helper to clean number string
                            const cleanNumber = (val: any) => {
                                if (typeof val === 'number') return val;
                                if (typeof val === 'string') {
                                    // Remove currency symbols and non-numeric chars except . and -
                                    return parseFloat(val.replace(/[^0-9.-]/g, ''));
                                }
                                return 0;
                            };

                            let amount = cleanNumber(amountVal);
                            const fee = cleanNumber(feeVal);

                            if (!isNaN(amount) && !isNaN(fee)) {
                                // Assuming Fee is typically a cost (negative) or just a value to add.
                                // If the user maps it, we add it. 
                                // Revolut: Amount -7.80, Fee 0.00. Total -7.80.
                                // If Fee was -1.00, Total -8.80. Math checks out.
                                amount += fee;
                            }

                            // Date Parsing
                            let dateStr = "";
                            if (dateVal && typeof dateVal === 'string') {
                                // Handle "YYYY-MM-DD HH:mm:ss" by slicing
                                if (dateVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                                    dateStr = dateVal.substring(0, 10);
                                } else {
                                    // Fallback: try basic JS parse
                                    const d = new Date(dateVal);
                                    if (!isNaN(d.getTime())) {
                                        dateStr = d.toISOString().split('T')[0];
                                    }
                                }
                            }

                            // Normalize amount: negative = expense, positive = income
                            // Always store as positive value, type determines direction
                            const normalizedAmount = typeof amount === 'number' && !isNaN(amount) ? Math.abs(amount) : 0;
                            const inferredType: 'expense' | 'income' = amount < 0 ? 'expense' : 'income';

                            return {
                                date: dateStr,
                                amount: normalizedAmount,
                                description: descVal || "No description",
                                type: inferredType,
                                raw_data: row
                            };
                        }).filter(t => t.date && t.date.length === 10 && !isNaN(t.amount) && t.amount !== 0);

                        resolve({
                            source: 'generic_csv',
                            transactions: transactions,
                            metadata: {
                                totalItems: transactions.length
                            }
                        });
                    } catch (e) {
                        reject(e);
                    }
                },
                error: (error: any) => {
                    reject(error);
                }
            });
        });
    }
}
