import { state } from '../state.js';
import { esc } from '../utils/string-utils.js';
import TimetableExporter from '../services/ExcelExporter.js';
import StorageService from '../services/StorageService.js';
import { renderIcon } from '../utils/icons.js';

export function openDetailView(type, id, title, classes) {
    state.selectedEntityId = id;
    StorageService.saveSelectedEntity(type, id);
    
    // Update active state in submenu
    document.querySelectorAll('#subMenuList > div').forEach(el => {
        if (el.dataset.id === id) {
            el.classList.add('bg-blue-50', 'dark:bg-blue-950/40', 'border-l-4', 'border-l-blue-600');
        } else {
            el.classList.remove('bg-blue-50', 'dark:bg-blue-950/40', 'border-l-4', 'border-l-blue-600');
        }
    });

    const currentViewTitle = document.getElementById('currentViewTitle');
    const classScheduleView = document.getElementById('classScheduleView');
    
    if (currentViewTitle) currentViewTitle.textContent = title;
    if (classScheduleView) classScheduleView.style.display = 'flex';

    if (type === 'curriculum_detail') {
        renderCurriculumDetailTable(id, title);
    } else {
        renderDetailTable(title, classes);
    }
}

export function renderDetailTable(title, classes) {
    const container = document.getElementById('scheduleTablesContainer');
    if (!container) return;

    container.innerHTML = ''; // Clear previous content

    classes.forEach(cc => {
        // Prepare sessions for this class
        let classSessions = [...cc.sessions];

        // Sort by Date, then Shift (Sáng -> Chiều -> Tối)
        classSessions.sort((a, b) => {
            if (a.date.getTime() !== b.date.getTime()) {
                return a.date.getTime() - b.date.getTime();
            }
            const shiftOrder = { 'Sáng': 1, 'Chiều': 2, 'Tối': 3 };
            return (shiftOrder[a.sessionType] || 9) - (shiftOrder[b.sessionType] || 9);
        });

        // Calculate stats for this class
        const studentClassesStr = cc.studentClasses || 'N/A';
        const totalPeriods = cc.actualHoursTotal || cc.totalHours || 0;
        const totalSessions = classSessions.length;
        let timeRange = 'N/A';
        if (classSessions.length > 0) {
            timeRange = `${classSessions[0].dateFormatted} - ${classSessions[classSessions.length - 1].dateFormatted}`;
        }
        
        // Build table rows
        let rowsHtml = '';
        classSessions.forEach((s, idx) => {
            let shiftBadgeHtml = '';
            if (s.sessionType === 'Sáng') {
                shiftBadgeHtml = `<span class="badge-semantic badge-shift-morning"><span class="semantic-dot"></span>Sáng</span>`;
            } else if (s.sessionType === 'Chiều') {
                shiftBadgeHtml = `<span class="badge-semantic badge-shift-afternoon"><span class="semantic-dot"></span>Chiều</span>`;
            } else if (s.sessionType === 'Tối') {
                shiftBadgeHtml = `<span class="badge-semantic badge-shift-evening"><span class="semantic-dot"></span>Tối</span>`;
            } else {
                shiftBadgeHtml = `<span class="badge-semantic badge-unmapped"><span class="semantic-dot"></span>${esc(s.sessionType)}</span>`;
            }

            rowsHtml += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                    <td class="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-num text-xs">${idx + 1}</td>
                    <td class="py-2.5 px-3 font-semibold text-center text-slate-700 dark:text-slate-200 text-xs">${esc(s.dayOfWeekShort)}</td>
                    <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-center font-num text-xs">${esc(s.dateFormatted)}</td>
                    <td class="py-2.5 px-3 text-center">
                        ${shiftBadgeHtml}
                    </td>
                    <td class="py-2.5 px-3 font-mono text-center text-slate-700 dark:text-slate-200 font-num text-xs">${esc(s.periodStr)}</td>
                    <td class="py-2.5 px-3 text-center text-slate-700 dark:text-slate-200 font-num text-xs">${s.periodCount}</td>
                    <td class="py-2.5 px-3 text-center">
                        <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700 font-num">${esc(s.room)}</span>
                    </td>
                </tr>
            `;
        });

        const classBlockHtml = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-6 overflow-hidden flex flex-col">
                <!-- Table Toolbar -->
                <div class="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                            <button class="btn-prev-class w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 active:scale-95 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none" aria-label="Xem lớp trước" title="Lớp trước">
                                ${renderIcon('chevron-left', 'w-4 h-4')}
                            </button>
                            <h3 class="font-display text-base text-slate-900 dark:text-slate-100 flex-1 break-words font-bold">${esc(cc.fullTitle)}</h3>
                            <button class="btn-next-class w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 active:scale-95 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none" aria-label="Xem lớp tiếp theo" title="Lớp tiếp theo">
                                ${renderIcon('chevron-right', 'w-4 h-4')}
                            </button>
                        </div>
                        <div class="flex gap-2 shrink-0">
                            <button class="btn-class-export-csv flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none" data-class="${esc(cc.classCode)}" title="Xuất CSV" aria-label="Xuất file CSV">
                                ${renderIcon('download', 'w-3.5 h-3.5')} Xuất CSV
                            </button>
                            <button class="btn-class-export-xlsx flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none" data-class="${esc(cc.classCode)}" title="Xuất Excel" aria-label="Xuất file Excel">
                                ${renderIcon('download', 'w-3.5 h-3.5')} Xuất Excel
                            </button>
                            <button class="btn-class-copy-md flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none" data-class="${esc(cc.classCode)}" title="Sao chép Markdown" aria-label="Sao chép Markdown">
                                ${renderIcon('copy', 'w-3.5 h-3.5')} Copy MD
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 mt-3">
                        <div class="flex flex-col">
                            <span class="font-display text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">LỚP SV</span>
                            <span class="text-xs font-semibold text-slate-800 dark:text-slate-100 font-num">${esc(studentClassesStr)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-display text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">THỜI GIAN</span>
                            <span class="text-xs font-semibold text-slate-800 dark:text-slate-100 font-num">${esc(timeRange)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-display text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">SỐ BUỔI</span>
                            <span class="text-xs font-semibold text-slate-800 dark:text-slate-100 font-num">${totalSessions} buổi</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-display text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">SỐ TIẾT</span>
                            <span class="text-xs font-semibold text-slate-800 dark:text-slate-100 font-num">${totalPeriods} tiết</span>
                        </div>
                    </div>
                </div>
                
                <!-- Table -->
                <div class="overflow-x-auto w-full">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-100/80 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-y border-slate-200 dark:border-slate-800 text-[11px]">
                            <tr>
                                <th class="py-2 px-3 w-12 text-center font-num">STT</th>
                                <th class="py-2 px-3 w-20 text-center">Thứ</th>
                                <th class="py-2 px-3 w-28 text-center font-num">Ngày</th>
                                <th class="py-2 px-3 w-24 text-center">Buổi</th>
                                <th class="py-2 px-3 w-24 text-center font-num">Tiết</th>
                                <th class="py-2 px-3 w-20 text-center font-num">Số tiết</th>
                                <th class="py-2 px-3 w-28 text-center">Giảng đường</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', classBlockHtml);
    });

    // Helper to navigate between subMenu items
    const navigateSubMenu = (delta) => {
        const items = Array.from(document.querySelectorAll('#subMenuList > div'));
        if (!items.length) return;
        const currentIndex = items.findIndex(item => item.dataset.id === state.selectedEntityId);
        let targetIndex;
        if (currentIndex === -1) {
            targetIndex = 0;
        } else {
            targetIndex = currentIndex + delta;
        }
        if (targetIndex >= 0 && targetIndex < items.length) {
            items[targetIndex].click();
            items[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    // Bind prev / next class buttons
    container.querySelectorAll('.btn-prev-class').forEach(btn => {
        btn.addEventListener('click', () => navigateSubMenu(-1));
    });

    container.querySelectorAll('.btn-next-class').forEach(btn => {
        btn.addEventListener('click', () => navigateSubMenu(1));
    });

    // Bind event listeners for card toolbar buttons
    container.querySelectorAll('.btn-class-export-csv').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const classCode = e.currentTarget.getAttribute('data-class');
            const targetClass = classes.find(c => c.classCode === classCode);
            if (targetClass && targetClass.sessions) {
                const safeName = TimetableExporter.removeTones(targetClass.shortClassCode || targetClass.classCode || 'Lop');
                TimetableExporter.exportToCSV(targetClass.sessions, `LichGiang_${safeName}.csv`);
            }
        });
    });

    container.querySelectorAll('.btn-class-export-xlsx').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const classCode = e.currentTarget.getAttribute('data-class');
            if (state.parserData) {
                TimetableExporter.exportToExcel(state.parserData, classCode);
            }
        });
    });

    container.querySelectorAll('.btn-class-copy-md').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classCode = e.currentTarget.getAttribute('data-class');
            const targetClass = classes.find(c => c.classCode === classCode);
            if (targetClass) {
                const md = TimetableExporter.generateCourseClassMarkdown(targetClass);
                try {
                    await TimetableExporter.copyMarkdownToClipboard(md);
                    const origHtml = btn.innerHTML;
                    btn.innerHTML = `${renderIcon('check', 'w-3.5 h-3.5')} Đã chép!`;
                    btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
                    setTimeout(() => { 
                        btn.innerHTML = origHtml; 
                        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                        btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    }, 2000);
                } catch (err) {
                    console.error('Copy markdown error:', err);
                    alert('Không thể sao chép Markdown vào clipboard.');
                }
            }
        });
    });
}

export function renderCurriculumDetailTable(subjectName) {
    const container = document.getElementById('scheduleTablesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-6">
            <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-100/80 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <tr>
                        <th class="py-2.5 px-3 w-16 text-center font-num">STT</th>
                        <th class="py-2.5 px-3" colspan="2">Tên bài học</th>
                        <th class="py-2.5 px-3 w-20 text-center font-num">LT</th>
                        <th class="py-2.5 px-3 w-20 text-center font-num">TH</th>
                    </tr>
                </thead>
                <tbody id="scheduleTableBody" class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                </tbody>
            </table>
        </div>
    `;
    
    const scheduleTableBody = document.getElementById('scheduleTableBody');
    
    const keys = Object.keys(state.mapperData.curriculumData || {});
    let matchedKey = (state.mapperData.subjectLinkMap && state.mapperData.subjectLinkMap[subjectName]) || null;
    if (!matchedKey) {
        const lowerName = subjectName.trim().toLowerCase();
        matchedKey = keys.find(k => k.trim().toLowerCase() === lowerName);
    }
    
    if (!matchedKey || !state.mapperData.curriculumData[matchedKey]) {
        scheduleTableBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 dark:text-slate-500">Chưa có dữ liệu chương trình khung</td></tr>`;
        return;
    }

    const curriculum = state.mapperData.curriculumData[matchedKey];
    
    curriculum.lessons.forEach((lesson, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60';
        
        tr.innerHTML = `
            <td class="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-num">${idx + 1}</td>
            <td class="py-2 px-3 text-slate-800 dark:text-slate-200 font-medium" colspan="2">${esc(lesson.name)}</td>
            <td class="py-2 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300">${lesson.lt}</td>
            <td class="py-2 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300">${lesson.th}</td>
        `;
        scheduleTableBody.appendChild(tr);
    });
}
