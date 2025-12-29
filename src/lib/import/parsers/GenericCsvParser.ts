
import Papa from 'papaparse';
import { TransactionParser, ParsedData, ParsedTransaction, ImportOptions, ParsedCategory } from '../types';

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
                        const parsedCategoriesMap = new Map<string, string>(); // Name -> ID
                        const categories: ParsedCategory[] = [];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const transactions: ParsedTransaction[] = results.data.map((row: any) => {
                            const dateVal = row[csvMapping.dateColumn];
                            const amountVal = row[csvMapping.amountColumn];
                            const descVal = row[csvMapping.descriptionColumn];

                            // Basic cleaning
                            const feeVal = csvMapping.feeColumn ? row[csvMapping.feeColumn] : '0';

                            // Clean number helper
                            const cleanNumber = (val: unknown) => {
                                if (typeof val === 'number') return val;
                                if (typeof val === 'string') {
                                    return parseFloat(val.replace(/[^0-9.-]/g, ''));
                                }
                                return 0;
                            };

                            let amount = cleanNumber(amountVal);
                            const fee = cleanNumber(feeVal);

                            if (!isNaN(amount) && !isNaN(fee)) {
                                amount += fee;
                            }

                            // Date Parsing
                            let dateStr = "";
                            if (dateVal && typeof dateVal === 'string') {
                                if (dateVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                                    dateStr = dateVal.substring(0, 10);
                                } else {
                                    const d = new Date(dateVal);
                                    if (!isNaN(d.getTime())) {
                                        dateStr = d.toISOString().split('T')[0];
                                    }
                                }
                            }

                            // Category Parsing
                            let categoryId: string | undefined = undefined;
                            if (csvMapping.categoryColumn && row[csvMapping.categoryColumn]) {
                                const catName = row[csvMapping.categoryColumn].trim();
                                if (catName) {
                                    if (!parsedCategoriesMap.has(catName)) {
                                        // Create new temp category
                                        const newId = crypto.randomUUID();
                                        parsedCategoriesMap.set(catName, newId);
                                        categories.push({
                                            id: newId,
                                            name: catName,
                                            type: amount < 0 ? 'expense' : 'income', // Guess type based on first occurrence
                                            icon: 'HelpCircle', // Default icon
                                            color: '#808080'
                                        });
                                    }
                                    categoryId = parsedCategoriesMap.get(catName);
                                }
                            }

                            const normalizedAmount = typeof amount === 'number' && !isNaN(amount) ? Math.abs(amount) : 0;
                            const inferredType: 'expense' | 'income' = amount < 0 ? 'expense' : 'income';

                            return {
                                date: dateStr,
                                amount: normalizedAmount,
                                description: descVal || "No description",
                                type: inferredType,
                                category_id: categoryId,
                                raw_data: row
                            };
                        }).filter(t => t.date && t.date.length === 10 && !isNaN(t.amount) && t.amount !== 0);

                        resolve({
                            source: 'generic_csv',
                            transactions: transactions,
                            categories: categories.length > 0 ? categories : undefined,
                            metadata: {
                                totalItems: transactions.length
                            }
                        });
                    } catch (e) {
                        reject(e);
                    }
                },
                error: (error: unknown) => {
                    reject(error);
                }
            });
        });
    }
}
