import { state } from './state.js';
import TimetableParser from './services/TimetableParser.js';
import { setupNavigation, renderActiveTab, switchTab } from './views/NavigationView.js';
import { setupCurriculumView } from './views/CurriculumView.js';
import { setupMappingView } from './views/MappingView.js';
import StorageService from './services/StorageService.js';
import { esc } from './utils/string-utils.js';

function init() {
    // 1. Setup Navigation & UI Tabs
    setupNavigation();
    
    // 2. Setup Curriculum & Mapping Features
    setupCurriculumView();
    setupMappingView();

    // 3. Setup Parser Mode (HTML Upload / Paste)
    setupParserMode();

    // 4. Restore Previous Session from LocalStorage (if any)
    restoreSavedSession();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function restoreSavedSession() {
    const savedHtml = StorageService.getTimetableRaw();
    if (!savedHtml) return;

    try {
        // Pre-load curriculum & subject links from storage into state
        state.mapperData.curriculumData = StorageService.getCurriculumData();
        state.mapperData.subjectLinkMap = StorageService.getSubjectLinks();

        // Process timetable data without overwriting storage
        processScheduleData(savedHtml, { saveStorage: false });

        // Pre-load class mappings from storage if available
        const savedMappings = StorageService.getClassMappings();
        if (savedMappings && savedMappings.length > 0) {
            state.mapperData.classMappings = savedMappings;
        }

        // Restore active tab
        const savedTab = StorageService.getActiveTab();
        if (savedTab && savedTab !== 'classes') {
            switchTab(savedTab);
        }

        // Restore selected item in submenu if applicable
        const savedEntity = StorageService.getSelectedEntity();
        if (savedEntity && savedEntity.id) {
            setTimeout(() => {
                const itemEl = document.querySelector(`#subMenuList > div[data-id="${savedEntity.id}"]`);
                if (itemEl) {
                    itemEl.click();
                }
            }, 150);
        }

        console.info('[StorageService] Đã tự động khôi phục phiên làm việc từ localStorage.');
    } catch (err) {
        console.error('[StorageService] Không thể khôi phục phiên làm việc:', err);
    }
}

function setupParserMode() {
    const fileInput = document.getElementById('fileInput');
    const tabUploadFile = document.getElementById('tabUploadFile');
    const tabPasteData = document.getElementById('tabPasteData');
    const panelUploadFile = document.getElementById('panelUploadFile');
    const panelPasteData = document.getElementById('panelPasteData');
    const txtPasteHtml = document.getElementById('txtPasteHtml');
    const btnProcessPaste = document.getElementById('btnProcessPaste');

    if(tabUploadFile && tabPasteData) {
        tabUploadFile.addEventListener('click', () => {
            tabUploadFile.className = 'font-semibold text-sm text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-2.5 px-3 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
            tabUploadFile.setAttribute('aria-selected', 'true');
            tabPasteData.className = 'font-medium text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 pb-2.5 px-3 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
            tabPasteData.setAttribute('aria-selected', 'false');
            panelUploadFile.classList.remove('hidden');
            panelUploadFile.classList.add('flex');
            panelPasteData.classList.add('hidden');
            panelPasteData.classList.remove('flex');
        });

        tabPasteData.addEventListener('click', () => {
            tabPasteData.className = 'font-semibold text-sm text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-2.5 px-3 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
            tabPasteData.setAttribute('aria-selected', 'true');
            tabUploadFile.className = 'font-medium text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 pb-2.5 px-3 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
            tabUploadFile.setAttribute('aria-selected', 'false');
            panelPasteData.classList.remove('hidden');
            panelPasteData.classList.add('flex');
            panelUploadFile.classList.add('hidden');
            panelUploadFile.classList.remove('flex');
        });
    }

    if (panelUploadFile) {
        panelUploadFile.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (fileInput) fileInput.click();
            }
        });

        // Drag and drop handling
        ['dragenter', 'dragover'].forEach(eventName => {
            panelUploadFile.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                panelUploadFile.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            panelUploadFile.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                panelUploadFile.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30');
            });
        });

        panelUploadFile.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt && dt.files;
            if (files && files.length > 0) {
                const reader = new FileReader();
                reader.onload = (ev) => processScheduleData(ev.target.result, { saveStorage: true });
                reader.readAsText(files[0]);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (ev) => processScheduleData(ev.target.result, { saveStorage: true });
                reader.readAsText(e.target.files[0]);
            }
        });
    }

    if(btnProcessPaste) {
        btnProcessPaste.addEventListener('click', () => {
            if(!txtPasteHtml.value.trim()) {
                alert('Vui lòng dán mã HTML vào ô trống!');
                return;
            }
            processScheduleData(txtPasteHtml.value, { saveStorage: true });
        });
    }
}

function processScheduleData(rawHtml, { saveStorage = true } = {}) {
    try {
        const rawData = TimetableParser.extractRawData(rawHtml);
        state.parserData = TimetableParser.transform(rawData);
        state.mode = 'parser';
        
        extractCohortsAndSubjects();

        // Reset old class mappings for previous timetable
        state.mapperData.classMappings = [];
        StorageService.saveClassMappings([]);

        // Save raw timetable html to localStorage
        if (saveStorage) {
            StorageService.saveTimetableRaw(rawHtml);
            StorageService.saveActiveTab('classes');
        }

        // Switch workspace and hide return banner
        const banner = document.getElementById('bannerReturnToActive');
        if (banner) banner.classList.add('hidden');

        const uploadSec = document.getElementById('uploadSection');
        if (uploadSec) {
            uploadSec.classList.add('hidden');
            uploadSec.style.display = 'none';
        }
        const ws = document.getElementById('workspaceContainer');
        if (ws) {
            ws.classList.remove('hidden');
            ws.style.display = 'flex';
        }
        
        // Render header
        const headerInfo = document.getElementById('headerInfo');
        if(headerInfo) headerInfo.style.display = 'flex';
        const headerTeacherName = document.getElementById('headerTeacherName');
        if(headerTeacherName) headerTeacherName.textContent = 'GV: ' + (state.parserData.defaultInstructor || '--');
        const headerSemesterText = document.getElementById('headerSemesterText');
        const rawSem = (state.parserData.semester || '--').toString().replace(/^HK\s*/i, '');
        if(headerSemesterText) headerSemesterText.textContent = `Năm học: ${state.parserData.academicYear || '--'} • HK${rawSem}`;
        const btnResetFile = document.getElementById('btnResetFile');
        if(btnResetFile) btnResetFile.classList.remove('hidden');

        // Render active tab
        renderActiveTab();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

function extractCohortsAndSubjects() {
    if(!state.parserData) return;
    const cohorts = new Set();
    const subjects = new Map();

    state.parserData.courseClassesList.forEach(cc => {
        if (cc.studentClasses) {
            cc.studentClasses.split(/,\s*/).forEach(cls => {
                if (cls.trim()) cohorts.add(cls.trim());
            });
        }
        if(!subjects.has(cc.subjectName)) {
            subjects.set(cc.subjectName, {
                name: cc.subjectName,
                totalHours: 0,
                classCount: 0,
                classes: []
            });
        }
        const subj = subjects.get(cc.subjectName);
        subj.totalHours += cc.totalHours;
        subj.classCount += 1;
        subj.classes.push(cc);
    });

    state.uniqueCohorts = Array.from(cohorts).sort((a, b) => {
        const getPriority = (cls) => {
            if (cls.startsWith('ĐD')) return 1;
            if (cls.startsWith('DS')) return 2;
            return 3;
        };
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return a.localeCompare(b, 'vi');
    });
    state.uniqueSubjects = Array.from(subjects.values()).sort((a,b) => a.name.localeCompare(b.name, 'vi'));
}
