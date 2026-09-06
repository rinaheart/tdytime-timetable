import { state } from '../state.js';
import CurriculumParser from '../services/CurriculumParser.js';
import { esc } from '../utils/string-utils.js';
import TimetableExporter from '../services/ExcelExporter.js';
import StorageService from '../services/StorageService.js';

function getMatchBadgeHtml(status, score) {
    if (status === 'exact') {
        return `<span class="badge-semantic badge-exact">
            <span class="semantic-dot"></span> Trùng khớp
        </span>`;
    }
    if (status === 'auto') {
        return `<span class="badge-semantic badge-auto">
            <span class="semantic-dot"></span> Gợi ý (${score}đ)
        </span>`;
    }
    if (status === 'saved') {
        return `<span class="badge-semantic badge-saved">
            <span class="semantic-dot"></span> Đã liên kết
        </span>`;
    }
    return `<span class="badge-semantic badge-unmapped">
        <span class="semantic-dot"></span> Chưa liên kết
    </span>`;
}

function renderTable2UnlinkedCurriculums(curriculumKeys, parsedData, subjectLinkMap) {
    const table2Container = document.getElementById('table2Container');
    const table2Body = document.getElementById('table2Body');
    if (!table2Container || !table2Body) return;

    const linkedCurriculumValues = new Set(Object.values(subjectLinkMap || {}).filter(Boolean));
    const unlinkedKeys = curriculumKeys.filter(k => !linkedCurriculumValues.has(k));

    if (unlinkedKeys.length > 0) {
        table2Container.classList.remove('hidden');
        table2Body.innerHTML = unlinkedKeys.map((k, idx) => {
            const curr = parsedData[k] || { lessons: [], lt: 0, th: 0, total: 0 };
            return `
                <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-num text-xs">${idx + 1}</td>
                    <td class="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 text-xs">${esc(k)}</td>
                    <td class="py-2.5 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300 text-xs">${curr.lessons ? curr.lessons.length : 0}</td>
                    <td class="py-2.5 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300 text-xs">${curr.lt}</td>
                    <td class="py-2.5 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300 text-xs">${curr.th}</td>
                    <td class="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200 font-num text-xs">${curr.total}</td>
                </tr>
            `;
        }).join('');
    } else {
        table2Container.classList.add('hidden');
        table2Body.innerHTML = '';
    }
}

function updateLinkSummaryBadge(totalSubjects, linkedCount) {
    const badge = document.getElementById('linkSummaryBadge');
    if (!badge) return;
    if (linkedCount === totalSubjects && totalSubjects > 0) {
        badge.className = 'badge-semantic badge-exact font-num text-xs';
        badge.innerHTML = `<span class="semantic-dot"></span>Đã liên kết ${linkedCount}/${totalSubjects} học phần`;
    } else {
        badge.className = 'badge-semantic badge-saved font-num text-xs';
        badge.innerHTML = `<span class="semantic-dot"></span>Đã liên kết ${linkedCount}/${totalSubjects} học phần`;
    }
}

export function renderCurriculumTables(parsedData, subjectMatches, curriculumKeys) {
    const container = document.getElementById('curriculumListContainer');
    const table1Container = document.getElementById('table1Container');
    const table1Body = document.getElementById('table1Body');
    if (!container || !table1Container || !table1Body) return;

    container.classList.remove('hidden');
    table1Container.classList.remove('hidden');

    const totalSubjects = subjectMatches.length;
    let linkedCount = subjectMatches.filter(m => m.matchedCurriculumKey).length;
    updateLinkSummaryBadge(totalSubjects, linkedCount);

    table1Body.innerHTML = subjectMatches.map((m, idx) => {
        const subj = m.timetableSubject;
        const selectedKey = m.matchedCurriculumKey || '';
        const curr = m.curriculumData || { lt: '-', th: '-', total: '-' };

        const optionsHtml = [
            `<option value="">-- Chưa liên kết --</option>`,
            ...curriculumKeys.map(k => {
                const item = parsedData[k];
                const label = `${esc(k)} (${item.total}t: ${item.lt}LT/${item.th}TH)`;
                const isSel = (k === selectedKey) ? 'selected' : '';
                return `<option value="${esc(k)}" ${isSel}>${label}</option>`;
            })
        ].join('');

        return `
            <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors" data-subject="${esc(subj.name)}">
                <td class="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-num text-xs">${idx + 1}</td>
                <td class="py-2.5 px-3">
                    <div class="font-medium text-slate-800 dark:text-slate-200 text-xs text-balance">${esc(subj.name)}</div>
                    <div class="text-[11px] text-slate-400 dark:text-slate-500 font-num">${subj.classCount} lớp • ${subj.totalHours} tiết</div>
                </td>
                <td class="py-2.5 px-3">
                    <select class="select-curriculum-link w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none text-slate-800 dark:text-slate-100" data-subject="${esc(subj.name)}" aria-label="Chọn chương trình khung liên kết cho môn ${esc(subj.name)}">
                        ${optionsHtml}
                    </select>
                </td>
                <td class="py-2.5 px-3 text-center col-badge">
                    ${getMatchBadgeHtml(m.status, m.score)}
                </td>
                <td class="py-2.5 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300 text-xs col-lt">${curr.lt}</td>
                <td class="py-2.5 px-3 text-center font-mono font-num text-slate-600 dark:text-slate-300 text-xs col-th">${curr.th}</td>
                <td class="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400 font-num text-xs col-total">${curr.total}</td>
            </tr>
        `;
    }).join('');

    // Bind event for dropdowns
    table1Body.querySelectorAll('.select-curriculum-link').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const subjName = e.target.getAttribute('data-subject');
            const newKey = e.target.value;
            const tr = e.target.closest('tr');

            if (newKey && parsedData[newKey]) {
                state.mapperData.subjectLinkMap[subjName] = newKey;
                const curr = parsedData[newKey];
                if (tr) {
                    tr.querySelector('.col-badge').innerHTML = getMatchBadgeHtml('saved', 1000);
                    tr.querySelector('.col-lt').textContent = curr.lt;
                    tr.querySelector('.col-th').textContent = curr.th;
                    tr.querySelector('.col-total').textContent = curr.total;
                }
            } else {
                delete state.mapperData.subjectLinkMap[subjName];
                if (tr) {
                    tr.querySelector('.col-badge').innerHTML = getMatchBadgeHtml('unmapped', 0);
                    tr.querySelector('.col-lt').textContent = '-';
                    tr.querySelector('.col-th').textContent = '-';
                    tr.querySelector('.col-total').textContent = '-';
                }
            }

            StorageService.saveSubjectLinks(state.mapperData.subjectLinkMap);
            state.mapperData.classMappings = null;
            StorageService.clearClassMappings();

            // Re-render Table 2 & Summary badge
            const currentLinked = Object.values(state.mapperData.subjectLinkMap).filter(Boolean).length;
            updateLinkSummaryBadge(totalSubjects, currentLinked);
            renderTable2UnlinkedCurriculums(curriculumKeys, parsedData, state.mapperData.subjectLinkMap);
        });
    });

    // Render Table 2
    renderTable2UnlinkedCurriculums(curriculumKeys, parsedData, state.mapperData.subjectLinkMap);

    // Update subject chips
    renderSubjectPills();

    if (window.lucide) {
        const sec = document.getElementById('curriculumSection');
        window.lucide.createIcons({ root: sec || document.body });
    }
}

const DEMO_SYLLABUS = `Dịch tễ học - Thực hành Nghiên cứu khoa học\t\t\t\t
1\tBài 1. Đại cương về dịch tễ học\t4\t0\t4
2\tBài 2. Các chỉ số thường dùng trong dịch tễ học\t4\t0\t4
3\tBài 2. Các chỉ số thường dùng trong dịch tễ học (tt)\t0\t4\t4
4\tBài 3. Điều tra xử lý dịch\t4\t0\t4
5\tBài 3. Điều tra xử lý dịch (tt)\t0\t2\t2
6\tBài 4. Đại cương về nghiên cứu khoa học\t2\t0\t2
7\tBài 5. Thiết kế nghiên cứu, chọn mẫu và xác định cỡ mẫu\t4\t0\t4
8\tBài 5. Thiết kế nghiên cứu, chọn mẫu và xác định cỡ mẫu (tt)\t0\t4\t4
9\tBài 5. Thiết kế nghiên cứu, chọn mẫu và xác định cỡ mẫu (tt)\t0\t2\t2
10\tBài 5. Thiết kế nghiên cứu, chọn mẫu và xác định cỡ mẫu (tt)\t0\t4\t4
11\tBài 5. Thiết kế nghiên cứu, chọn mẫu và xác định cỡ mẫu (tt)\t0\t4\t4
12\tBài 6. Thu thập, xử lý và phân tích dữ liệu\t2\t2\t4
13\tBài 6. Thu thập, xử lý và phân tích dữ liệu (tt)\t0\t4\t4
14\tBài 7. Lập kế hoạch nghiên cứu và dự trù kinh phí\t1\t3\t4
15\tBài 8. Viết đề cương và báo cáo khoa học\t2\t2\t4
16\tBài 8. Viết đề cương và báo cáo khoa học (tt)\t0\t2\t2
Thực hành Nghiên cứu khoa học\t\t\t\t
1\tBài 1. Đại cương về nghiên cứu khoa học\t2\t0\t2
2\tBài 2. Thiết kế nghiên cứu, chọn mẫu và xác định cỡ mẫu\t6\t10\t16
3\tBài 3. Thu thập, xử lý và phân tích dữ liệu\t2\t10\t12
4\tBài 4. Lập kế hoạch nghiên cứu và dự trù kinh phí\t2\t4\t6
5\tBài 5. Viết đề cương và báo cáo khoa học\t2\t5\t7
6\tKiểm tra\t1\t1\t2`;

export function renderSubjectPills() {
    const pillList = document.getElementById('timetableSubjectsPillList');
    if (!pillList || !state.uniqueSubjects || state.uniqueSubjects.length === 0) return;

    pillList.innerHTML = state.uniqueSubjects.map(s => {
        const isLinked = state.mapperData.subjectLinkMap && state.mapperData.subjectLinkMap[s.name];
        if (isLinked) {
            return `
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>${esc(s.name)}</span>
                    <span class="text-[11px] font-normal opacity-80 font-num">(${s.classCount} lớp • ${s.totalHours}t)</span>
                    <i data-lucide="check" class="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-0.5"></i>
                </span>
            `;
        }
        return `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>${esc(s.name)}</span>
                <span class="text-[11px] font-normal text-slate-400 dark:text-slate-500 font-num">(${s.classCount} lớp • ${s.totalHours}t)</span>
            </span>
        `;
    }).join('');

    if (window.lucide) {
        const list = document.getElementById('syllabusSubjectList');
        if (list) window.lucide.createIcons({ root: list });
    }
}

export function updateLineCount() {
    const txt = document.getElementById('txtPasteSyllabusGlobal');
    const counter = document.getElementById('syllabusLineCount');
    if (!txt || !counter) return;
    const lines = txt.value.split('\n').filter(l => l.trim().length > 0);
    counter.textContent = `${lines.length} dòng dữ liệu`;
}

export function setupCurriculumView() {
    const txtSyllabus = document.getElementById('txtPasteSyllabusGlobal');
    if (txtSyllabus) {
        txtSyllabus.addEventListener('input', updateLineCount);
        if (!txtSyllabus.value.trim()) {
            const savedText = StorageService.getCurriculumText();
            if (savedText) {
                txtSyllabus.value = savedText;
                updateLineCount();
            }
        }
    }

    const btnClearSyllabusText = document.getElementById('btnClearSyllabusText');
    if (btnClearSyllabusText) {
        btnClearSyllabusText.addEventListener('click', () => {
            if (txtSyllabus) {
                txtSyllabus.value = '';
                updateLineCount();
                txtSyllabus.focus();
            }
        });
    }

    const btnLoadDemoSyllabus = document.getElementById('btnLoadDemoSyllabus');
    if (btnLoadDemoSyllabus) {
        btnLoadDemoSyllabus.addEventListener('click', () => {
            if (txtSyllabus) {
                txtSyllabus.value = DEMO_SYLLABUS;
                updateLineCount();
                const btnProcess = document.getElementById('btnProcessSyllabusGlobal');
                if (btnProcess) btnProcess.click();
            }
        });
    }

    const btnProcessSyllabusGlobal = document.getElementById('btnProcessSyllabusGlobal');
    if (btnProcessSyllabusGlobal) {
        btnProcessSyllabusGlobal.addEventListener('click', () => {
            try {
                if (!state.uniqueSubjects || state.uniqueSubjects.length === 0) {
                    alert('Vui lòng tải lịch giảng trước khi nhập chương trình khung!');
                    return;
                }

                const text = document.getElementById('txtPasteSyllabusGlobal').value;
                if (!text || text.trim().length === 0) {
                    alert('Vui lòng dán dữ liệu chương trình khung từ Excel!');
                    return;
                }

                const savedLinkMap = StorageService.getSubjectLinks();
                const { parsedData, subjectMatches, subjectLinkMap, curriculumKeys } = 
                    CurriculumParser.parseCurriculumData(text, state.uniqueSubjects, savedLinkMap);

                // Save to state & localStorage
                state.mapperData.curriculumData = parsedData;
                state.mapperData.subjectLinkMap = subjectLinkMap;
                state.mapperData.classMappings = null;
                StorageService.clearClassMappings();
                StorageService.saveCurriculumText(text);
                StorageService.saveCurriculumData(parsedData);
                StorageService.saveSubjectLinks(subjectLinkMap);

                // Render UI
                renderCurriculumTables(parsedData, subjectMatches, curriculumKeys);

                const mappedCount = Object.keys(subjectLinkMap).length;
                alert(`Đã nhận diện ${curriculumKeys.length} học phần từ chương trình khung. Tự động kết nối ${mappedCount}/${state.uniqueSubjects.length} học phần.`);

            } catch (err) {
                console.error("Error processing syllabus:", err);
                alert("Đã xảy ra lỗi trong quá trình xử lý: " + err.message);
            }
        });
    }

    const btnDownloadSyllabusTemplate = document.getElementById('btnDownloadSyllabusTemplate');
    if (btnDownloadSyllabusTemplate) {
        btnDownloadSyllabusTemplate.addEventListener('click', () => {
            if (!state.uniqueSubjects || state.uniqueSubjects.length === 0) {
                alert('Chưa có dữ liệu Lịch giảng. Vui lòng nạp lịch giảng trước.');
                return;
            }
            if (TimetableExporter && TimetableExporter.exportSyllabusTemplate) {
                TimetableExporter.exportSyllabusTemplate(state.uniqueSubjects);
            } else {
                alert('Chức năng xuất Excel chưa sẵn sàng.');
            }
        });
    }
}

export function renderCurriculumView() {
    const subMenuList = document.getElementById('subMenuList');
    if (subMenuList) subMenuList.innerHTML = '';

    renderSubjectPills();

    const txtSyllabus = document.getElementById('txtPasteSyllabusGlobal');
    if (txtSyllabus) {
        if (!txtSyllabus.value.trim()) {
            const savedText = StorageService.getCurriculumText();
            if (savedText) {
                txtSyllabus.value = savedText;
            }
        }
        updateLineCount();
    }

    // If curriculum data already exists in state or storage, restore the tables
    if (!state.mapperData.curriculumData) {
        state.mapperData.curriculumData = StorageService.getCurriculumData();
    }
    if (!state.mapperData.subjectLinkMap || Object.keys(state.mapperData.subjectLinkMap).length === 0) {
        state.mapperData.subjectLinkMap = StorageService.getSubjectLinks();
    }

    if (state.mapperData && state.mapperData.curriculumData && state.uniqueSubjects && state.uniqueSubjects.length > 0) {
        const savedLinkMap = state.mapperData.subjectLinkMap || StorageService.getSubjectLinks();
        const { subjectMatches, curriculumKeys } = 
            CurriculumParser.matchSubjects(state.mapperData.curriculumData, state.uniqueSubjects, savedLinkMap);
        renderCurriculumTables(state.mapperData.curriculumData, subjectMatches, curriculumKeys);
    } else {
        const container = document.getElementById('curriculumListContainer');
        if (container) container.classList.add('hidden');
    }
}
