
import Papa from 'papaparse';
import { TransactionParser, ParsedData, ParsedTransaction, ImportOptions } from '../types';

export class RevolutParser implements TransactionParser {
    name = "Revolut Import";
    fileExtensions = ["csv"];

    private knownHeaders = {
        en: {
            type: 'Type',
            product: 'Product',
            completedDate: 'Completed Date',
            description: 'Description',
            amount: 'Amount',
            fee: 'Fee',
            state: 'State',
            balance: 'Balance'
        },
        it: {
            type: 'Tipo',
            product: 'Prodotto',
            completedDate: 'Data di completamento',
            description: 'Descrizione',
            amount: 'Importo',
            fee: 'Costo', // "Costo" found in provided file
            state: 'State', // "State" even in IT file
            balance: 'Saldo'
        }
    };

    private completedStates = new Set(['COMPLETED', 'COMPLETATO']);
    // Products that represent the "Main" account. Anything else is considered secondary (savings/pockets).
    // Note: Revolut changes these often, but broadly speaking:
    // IT: "Attuale"
    // EN: "Current"
    private standardAccounts = new Set(['ATTUALE', 'CURRENT', 'PERSONAL', 'MAIN']);

    async canParse(_file: File, content: string): Promise<boolean> {
        // Quick check for specific Revolut column combinations
        const firstLine = content.substring(0, 500).split('\n')[0];
        const hasItHeaders = firstLine.includes('Tipo') && firstLine.includes('Prodotto') && firstLine.includes('Saldo');
        const hasEnHeaders = firstLine.includes('Type') && firstLine.includes('Product') && firstLine.includes('Balance');
        return hasItHeaders || hasEnHeaders;
    }

    async parse(_file: File, content: string, options?: ImportOptions): Promise<ParsedData> {
        return new Promise((resolve, reject) => {
            Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const transactions: ParsedTransaction[] = [];

                        // Detect Language based on headers of first row
                        // Actually PapaParse gives us 'meta.fields'
                        const fields = results.meta.fields || [];
                        const isIt = fields.includes('Prodotto');
                        const map = isIt ? this.knownHeaders.it : this.knownHeaders.en;

                        for (const row of results.data as any[]) {
                            // 1. Filter Status
                            // Note: In the provided IT file, the column is "State" (English key) but values might be localized? 
                            // File says: "State" -> "COMPLETATO".
                            // So key is 'State' in both usually, but let's be safe.
                            const stateCol = row['State'] !== undefined ? 'State' : (row['Stato'] !== undefined ? 'Stato' : map.state);
                            const stateVal = (row[stateCol] || "").toString().toUpperCase();

                            if (!this.completedStates.has(stateVal)) {
                                continue;
                            }

                            // 2. Filter Savings (if not requested)
                            if (!options?.includeSavings) {
                                const productVal = (row[map.product] || "").toString().toUpperCase();
                                // If it's NOT a standard account, skip it
                                // "Standard" means "Attuale" or "Current".
                                // If row is "Risparmi" (Savings) -> Skip.
                                if (!this.standardAccounts.has(productVal)) {
                                    continue;
                                }
                            }

                            // 3. Parse Data
                            const dateStr = this.parseDate(row[map.completedDate] || row['Data di inizio'] || row['Started Date']);
                            const desc = row[map.description] || "";

                            // Amount handling
                            // Revolut CSV: "Importo" usually includes sign. "-10.00".
                            // "Costo" (Fee) is usually "0.00".
                            const amountRaw = row[map.amount];
                            const feeRaw = row[map.fee];

                            let amount = this.parseNumber(amountRaw);
                            const fee = this.parseNumber(feeRaw);

                            // In Revolut export, Amount is usually net of fees? Or inclusive?
                            // Example: "Importo": -13.00, "Costo": 0.00. Total -13.00.
                            // If there is a fee, usually it's separate. 
                            // Let's assume we just want the 'Amount' as it reflects the transaction value.
                            // Unlike generic parser where user might want to Add Fee, Revolut usually handles this in the Amount entry or separate line?
                            // Actually in the provided file: Importo -13.00, Costo 0.00.
                            // Let's just use Amount for now.

                            if (isNaN(amount)) continue;

                            // 4. Type Inference
                            // type can be 'expense' | 'income'
                            const type = amount < 0 ? 'expense' : 'income';
                            const normalizedAmount = Math.abs(amount);

                            if (normalizedAmount === 0) continue; // Skip strictly zero stuff unless it's meaningful?

                            transactions.push({
                                date: dateStr,
                                amount: normalizedAmount,
                                description: desc,
                                type: type,
                                raw_data: row,
                                // We leave category_id undefined for reconciliation
                            });
                        }

                        resolve({
                            source: 'generic_csv', // Reuse generic source type for UI compatibility, or add 'revolut' if needed. 
                            // Using 'generic_csv' allows using the existing Reconciliation UI flow.
                            transactions: transactions,
                            metadata: {
                                totalItems: transactions.length
                            }
                        });
                    } catch (e) {
                        reject(e);
                    }
                },
                error: (err: any) => reject(err)
            });
        });
    }

    private parseDate(val: string): string {
        if (!val) return new Date().toISOString().split('T')[0];
        // Format: 2025-05-01 17:03:33
        // ISO-like, but space instead of T.
        try {
            // Replace space with T to make it ISO complient for Date constructor
            const iso = val.replace(' ', 'T');
            const d = new Date(iso);
            if (isNaN(d.getTime())) return val; // Fallback
            return d.toISOString().split('T')[0];
        } catch {
            return val;
        }
    }

    private parseNumber(val: string | number): number {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        // Handle currencies? "-13.00" -> -13.00
        // Remove currency symbols if any (Generic CSV parser logic)
        return parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    }
}
