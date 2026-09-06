import { esc } from '../utils/string-utils.js';

export function createSubMenuItem(title, subtitle, badge, id, onClick) {
    const item = document.createElement('div');
    item.className = 'p-3 hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/80 group rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
    item.dataset.id = id;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `${title} - ${subtitle || ''}`);
    
    item.innerHTML = `
        <div class="font-medium text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-balance">${esc(title)}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex justify-between items-center gap-2">
            <span class="truncate min-w-0 pr-2">${esc(subtitle)}</span>
            ${badge ? `<span class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-num shrink-0">${esc(badge)}</span>` : ''}
        </div>
    `;

    item.addEventListener('click', onClick);
    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
        }
    });

    return item;
}
