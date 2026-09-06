export function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function removeTones(str) {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '_');
}

export function sanitizeFormula(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
        return "'" + str;
    }
    return str;
}
