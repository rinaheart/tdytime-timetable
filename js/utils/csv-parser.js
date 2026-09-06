export function parseCsvLine(rawLine) {
    if (!rawLine) return [];
    if (rawLine.indexOf('\t') !== -1) {
        return rawLine.split('\t').map(c => c.trim());
    }
    
    let cols = [];
    let inQuotes = false;
    let current = '';
    
    for (let i = 0; i < rawLine.length; i++) {
        let c = rawLine[i];
        if (c === '"') {
            inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            cols.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    cols.push(current);
    
    return cols.map(c => c.trim().replace(/^"|"$/g, ''));
}
