import { state } from '../state.js';
import TimetableMapper from '../services/MappingEngine.js';
import TimetableExporter from '../services/ExcelExporter.js';
import StorageService from '../services/StorageService.js';
import { esc } from '../utils/string-utils.js';
import { renderIcon } from '../utils/icons.js';

export function setupMappingView() {
    const btnRunMapping = document.getElementById('btnRunMapping');
    if (btnRunMapping) {
        btnRunMapping.addEventListener('click', () => {
            executeMapping({ saveStorage: true });
        });
    }
}

export function executeMapping(options = { saveStorage: true }) {
    if (!state.mapperData.curriculumData || Object.keys(state.mapperData.curriculumData).length === 0) {
        const storedCurriculum = StorageService.getCurriculumData();
        if (storedCurriculum && Object.keys(storedCurriculum).length > 0) {
            state.mapperData.curriculumData = storedCurriculum;
        } else {
            alert('Vui lòng nhập chương trình khung trước!');
            return false;
        }
    }

    if (!state.uniqueSubjects || state.uniqueSubjects.length === 0) {
        return false;
    }

    const curriculumKeys = Object.keys(state.mapperData.curriculumData);
    const mappingResultsContainer = document.getElementById('mappingResultsContainer');
    if (!mappingResultsContainer) return false;

    mappingResultsContainer.innerHTML = ''; 
    const allMappedClasses = [];

    state.uniqueSubjects.forEach(subject => {
        let matchedKey = (state.mapperData.subjectLinkMap && state.mapperData.subjectLinkMap[subject.name]) || null;
        if (!matchedKey) {
            const lowerName = subject.name.trim().toLowerCase();
            matchedKey = curriculumKeys.find(k => k.trim().toLowerCase() === lowerName);
        }
        
        if (matchedKey && state.mapperData.curriculumData[matchedKey] && state.mapperData.curriculumData[matchedKey].total > 0) {
            const curriculum = state.mapperData.curriculumData[matchedKey];
            
            subject.classes.forEach(cc => {
                const reportRows = TimetableMapper.performMapping(cc, curriculum);
                cc.mappedReport = reportRows;
                cc.mappedSchedule = reportRows;
                allMappedClasses.push(cc);
                
                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-6 flex flex-col';
                
                card.innerHTML = `
                    <div class="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 class="font-display font-bold text-base text-blue-600 dark:text-blue-400 text-balance">${esc(cc.fullTitle)}</h3>
                        <button class="btn-export-excel flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none" data-class="${esc(cc.classCode)}" aria-label="Xuất Excel cho lớp ${esc(cc.shortClassCode || cc.classCode)}">
                            ${renderIcon('download', 'w-3.5 h-3.5')} Xuất Excel
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead class="bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th class="py-2.5 px-3 text-center w-24 border-r border-slate-200/80 dark:border-slate-800 font-num">Ngày</th>
                                    <th class="py-2.5 px-3 text-center w-24 border-r border-slate-200/80 dark:border-slate-800">Buổi</th>
                                    <th class="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800">Nội dung</th>
                                    <th class="py-2.5 px-3 text-center w-16 border-r border-slate-200/80 dark:border-slate-800 font-num">LT</th>
                                    <th class="py-2.5 px-3 text-center w-16 font-num">TH</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                                ${reportRows.map(row => `
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td class="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800 font-num ${row.isFirst ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-transparent'}">${esc(row.ngay || row.rawNgay)}</td>
                                        <td class="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                                            ${row.buoi === 'Sáng' ? '<span class="badge-semantic badge-shift-morning"><span class="semantic-dot"></span>Sáng</span>' : (row.buoi === 'Chiều' ? '<span class="badge-semantic badge-shift-afternoon"><span class="semantic-dot"></span>Chiều</span>' : '<span class="badge-semantic badge-shift-evening"><span class="semantic-dot"></span>Tối</span>')}
                                        </td>
                                        <td class="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">${esc(row.tenBai)}</td>
                                        <td class="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800 font-mono font-num text-slate-600 dark:text-slate-300">${esc(row.lt || '')}</td>
                                        <td class="py-2 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300">${esc(row.th || '')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                mappingResultsContainer.appendChild(card);
            });
        } else {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/60 rounded-2xl shadow-sm overflow-hidden mb-6 opacity-85';
            card.innerHTML = `
                <div class="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/40">
                    <h3 class="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2 text-balance">
                        ${renderIcon('alert-triangle', 'w-4 h-4 text-amber-600')} ${esc(subject.name)}
                    </h3>
                    <p class="text-xs mt-1 text-slate-500 dark:text-slate-400 text-balance">Chưa có chương trình khung hoặc có 0 tiết. Bỏ qua.</p>
                </div>
            `;
            mappingResultsContainer.appendChild(card);
        }
    });

    // Store mapped classes in state
    state.mapperData.classMappings = allMappedClasses;

    // Save to LocalStorage if requested
    if (options.saveStorage) {
        StorageService.saveClassMappings(allMappedClasses);
    }

    // Ensure header buttons are visible
    const btnRun = document.getElementById('btnRunMapping');
    const btnExport = document.getElementById('btnExportAllMapped');
    if (btnRun) btnRun.style.display = 'inline-flex';
    if (btnExport) btnExport.style.display = 'inline-flex';

    // Bind events for dynamically created export buttons
    document.querySelectorAll('.btn-export-excel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const classCode = e.currentTarget.getAttribute('data-class');
            const cc = allMappedClasses.find(c => c.classCode === classCode);
            if (cc) {
                TimetableExporter.exportMappedTimetableToExcel(cc);
            }
        });
    });

    let btnExportAll = document.getElementById('btnExportAllMapped');
    if (btnExportAll) {
        const newBtn = btnExportAll.cloneNode(true);
        btnExportAll.parentNode.replaceChild(newBtn, btnExportAll);
        
        newBtn.addEventListener('click', () => {
            const validMappings = allMappedClasses.filter(c => c.mappedSchedule && c.mappedSchedule.length > 0);
            if (validMappings.length > 0) {
                TimetableExporter.exportAllMappedClasses(validMappings);
            } else {
                alert("Không có dữ liệu hợp lệ để xuất!");
            }
        });
    }

    const statusText = document.getElementById('mappingStatusText');
    if (statusText) {
        statusText.textContent = `Đã khớp xong ${allMappedClasses.length} lớp học phần theo chương trình khung.`;
        statusText.className = 'font-semibold text-emerald-600 dark:text-emerald-400 text-sm';
    }

    return true;
}

export function renderMappingView() {
    const mappingResultsContainer = document.getElementById('mappingResultsContainer');
    if (!mappingResultsContainer) return;

    // Check if curriculum data exists (in state or localStorage)
    if (!state.mapperData.curriculumData || Object.keys(state.mapperData.curriculumData).length === 0) {
        state.mapperData.curriculumData = StorageService.getCurriculumData();
    }
    if (!state.mapperData.subjectLinkMap || Object.keys(state.mapperData.subjectLinkMap).length === 0) {
        state.mapperData.subjectLinkMap = StorageService.getSubjectLinks();
    }

    const hasCurriculum = state.mapperData.curriculumData && Object.keys(state.mapperData.curriculumData).length > 0;
    const btnRun = document.getElementById('btnRunMapping');
    const btnExport = document.getElementById('btnExportAllMapped');
    const statusText = document.getElementById('mappingStatusText');

    // Case 1: No curriculum data loaded yet
    if (!hasCurriculum) {
        if (btnRun) btnRun.style.display = 'none';
        if (btnExport) btnExport.style.display = 'none';
        if (statusText) {
            statusText.textContent = 'Chưa có dữ liệu chương trình khung.';
            statusText.className = 'text-slate-500 dark:text-slate-400 text-xs mt-0.5';
        }

        mappingResultsContainer.innerHTML = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm flex flex-col items-center">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    ${renderIcon('calendar-search', 'w-6 h-6')}
                </div>
                <h3 class="font-heading font-bold text-base text-slate-800 dark:text-slate-100 mb-1">Chưa nạp chương trình khung</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Để tự động khớp bài học chi tiết cho từng buổi dạy, vui lòng nạp dữ liệu chương trình khung ở tab Chương trình.</p>
                <button id="btnGoToCurriculum" class="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95">
                    ${renderIcon('book-open', 'w-4 h-4')} Đến tab Chương trình
                </button>
            </div>
        `;
        const btnGo = document.getElementById('btnGoToCurriculum');
        if (btnGo) {
            btnGo.addEventListener('click', () => {
                const tab = document.querySelector('.mode-tab[data-mode="curriculum"]');
                if (tab) tab.click();
            });
        }
        return;
    }

    // Case 2: Curriculum data exists!
    if (btnRun) btnRun.style.display = 'inline-flex';
    if (btnExport) btnExport.style.display = 'inline-flex';

    // If already rendered with actual class cards, keep them unless requested to re-run
    const hasClassCards = mappingResultsContainer.children.length > 0 && 
                          !mappingResultsContainer.querySelector('#btnGoToCurriculum');
    if (hasClassCards && state.mapperData.classMappings && state.mapperData.classMappings.length > 0) {
        return;
    }

    // Automatically perform mapping & render tables immediately (F5 resilient & 0 redundant click)
    executeMapping({ saveStorage: true });
}
