import { state } from '../state.js';
import { esc } from '../utils/string-utils.js';
import { createSubMenuItem } from './UIComponents.js';
import { openDetailView } from './TimetableView.js';
import { setupCurriculumView, renderCurriculumView } from './CurriculumView.js';
import { renderMappingView } from './MappingView.js';
import { renderStatisticsView } from './StatisticsView.js';
import StorageService from '../services/StorageService.js';

export function switchTab(mode) {
    // Nếu đang ở màn hình upload nhưng đã có dữ liệu lịch giảng: khôi phục workspace
    const uploadSec = document.getElementById('uploadSection');
    const ws = document.getElementById('workspaceContainer');
    if (state.parserData && uploadSec && ws && ws.classList.contains('hidden')) {
        uploadSec.classList.add('hidden');
        uploadSec.style.display = 'none';
        ws.classList.remove('hidden');
        ws.style.display = 'flex';
        const banner = document.getElementById('bannerReturnToActive');
        if (banner) banner.classList.add('hidden');
        const headerInfo = document.getElementById('headerInfo');
        if (headerInfo) headerInfo.style.display = 'flex';
        const btnResetFile = document.getElementById('btnResetFile');
        if (btnResetFile) btnResetFile.classList.remove('hidden');
    }

    const modeTabs = document.querySelectorAll('.mode-tab');
    modeTabs.forEach(t => {
        if (t.dataset.mode === mode) {
            t.classList.add('active', 'bg-blue-50', 'dark:bg-blue-950/40');
        } else {
            t.classList.remove('active', 'bg-blue-50', 'dark:bg-blue-950/40');
        }
    });
    state.activeTab = mode;
    state.selectedEntityId = null;
    StorageService.saveActiveTab(mode);
    renderActiveTab();
}

export function setupNavigation() {
    const modeTabs = document.querySelectorAll('.mode-tab');
    modeTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tab.dataset.mode);
        });
    });

    const btnResetFile = document.getElementById('btnResetFile');
    if (btnResetFile) {
        btnResetFile.addEventListener('click', () => {
            // Không xóa state.parserData hay StorageService để bảo vệ người dùng bấm nhầm
            const uploadSec = document.getElementById('uploadSection');
            if (uploadSec) {
                uploadSec.classList.remove('hidden');
                uploadSec.style.display = 'flex';
            }
            const ws = document.getElementById('workspaceContainer');
            if (ws) {
                ws.classList.add('hidden');
                ws.style.display = 'none';
            }
            const banner = document.getElementById('bannerReturnToActive');
            if (banner && state.parserData) {
                banner.classList.remove('hidden');
            }
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
            const txtPasteHtml = document.getElementById('txtPasteHtml');
            if (txtPasteHtml) txtPasteHtml.value = '';
        });
    }

    const btnReturn = document.getElementById('btnReturnToActive');
    if (btnReturn) {
        btnReturn.addEventListener('click', () => {
            if (state.parserData) {
                switchTab(state.activeTab || 'classes');
            }
        });
    }
}

export function hideAllViews() {
    const views = ['subMenuPanel', 'classScheduleView', 'curriculumView', 'mappingView', 'statisticsView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const subMenuList = document.getElementById('subMenuList');
    if (subMenuList) subMenuList.innerHTML = '';
}

export function renderActiveTab() {
    if (!state.parserData) return;
    hideAllViews();

    const curriculumView = document.getElementById('curriculumView');
    const mappingView = document.getElementById('mappingView');
    const statisticsView = document.getElementById('statisticsView');

    if (state.activeTab === 'classes') {
        renderSubMenu('classes');
    } else if (state.activeTab === 'students') {
        renderSubMenu('students');
    } else if (state.activeTab === 'subjects') {
        renderSubMenu('subjects');
    } else if (state.activeTab === 'curriculum') {
        curriculumView.style.display = 'flex';
        renderCurriculumView();
    } else if (state.activeTab === 'schedule') {
        mappingView.style.display = 'flex';
        renderMappingView();
    } else if (state.activeTab === 'statistics') {
        statisticsView.style.display = 'flex';
        renderStatisticsView();
    }
}

export function renderSubMenu(type) {
    const subMenuPanel = document.getElementById('subMenuPanel');
    const subMenuList = document.getElementById('subMenuList');
    
    subMenuPanel.style.display = 'flex';
    subMenuList.innerHTML = '';
    let firstItem = null;

    if (type === 'classes') {
        const total = state.parserData.courseClassesList.length;
        document.getElementById('subMenuTitle').textContent = `Lớp học phần (${total})`;
        state.parserData.courseClassesList.forEach((cc, idx) => {
            const title = `${idx + 1}. ${esc(cc.shortClassCode)} • ${esc(cc.groupName)} - ${esc(cc.studentClasses)}`;
            const item = createSubMenuItem(
                title,
                esc(cc.subjectName),
                `${cc.totalHours} tiết / ${cc.sessionCount} buổi`,
                cc.classCode,
                () => openDetailView('classes', cc.classCode, title, [cc])
            );
            subMenuList.appendChild(item);
            if (!firstItem) firstItem = { id: cc.classCode, el: item, click: () => item.click() };
        });
    } else if (type === 'students') {
        const total = state.uniqueCohorts.length;
        document.getElementById('subMenuTitle').textContent = `Lớp SV (${total})`;
        state.uniqueCohorts.forEach((cohort, idx) => {
            let matchedClasses = state.parserData.courseClassesList.filter(cc => 
                cc.studentClasses && cc.studentClasses.includes(cohort)
            );
            
            const item = createSubMenuItem(
                `${idx + 1}. ${esc(cohort)}`,
                `${matchedClasses.length} lớp`,
                '',
                cohort,
                () => openDetailView('students', cohort, `Lịch giảng: ${cohort}`, matchedClasses)
            );
            subMenuList.appendChild(item);
            if (!firstItem) firstItem = { id: cohort, el: item, click: () => item.click() };
        });
    } else if (type === 'subjects') {
        const total = state.uniqueSubjects.length;
        document.getElementById('subMenuTitle').textContent = `Học phần (${total})`;
        state.uniqueSubjects.forEach((subj, idx) => {
            const item = createSubMenuItem(
                `${idx + 1}. ${esc(subj.name)}`,
                `${subj.classCount} lớp`,
                `${subj.totalHours} tiết`,
                subj.name,
                () => openDetailView('subjects', subj.name, `Học phần: ${subj.name}`, subj.classes)
            );
            subMenuList.appendChild(item);
            if (!firstItem) firstItem = { id: subj.name, el: item, click: () => item.click() };
        });
    } else if (type === 'curriculum') {
        const currData = state.mapperData.curriculumData || {};
        const curriculumKeys = Object.keys(currData);
        const mappedSubjects = state.uniqueSubjects.filter(s => {
            const matchedKey = (state.mapperData.subjectLinkMap && state.mapperData.subjectLinkMap[s.name])
                || curriculumKeys.find(k => k.trim().toLowerCase() === s.name.trim().toLowerCase());
            return matchedKey && currData[matchedKey] && currData[matchedKey].total > 0;
        });

        document.getElementById('subMenuTitle').textContent = `Học phần có chương trình khung (${mappedSubjects.length})`;
        mappedSubjects.forEach((subj, idx) => {
            const item = createSubMenuItem(
                `${idx + 1}. ${esc(subj.name)}`,
                `${subj.classCount} lớp`,
                `${subj.totalHours} tiết`,
                subj.name,
                () => openDetailView('curriculum_detail', subj.name, `Chương trình khung: ${subj.name}`, subj.classes)
            );
            subMenuList.appendChild(item);
            if (!firstItem) firstItem = { id: subj.name, el: item, click: () => item.click() };
        });
    }

    if (firstItem && !state.selectedEntityId) {
        firstItem.click();
    } else if (state.selectedEntityId) {
        // Safe DOM search by dataset.id to prevent querySelector DOMException with quotes/special characters
        const activeEl = Array.from(subMenuList.children).find(el => el.dataset.id === String(state.selectedEntityId));
        if (activeEl) {
            activeEl.click();
        } else if (firstItem) {
            firstItem.click();
        }
    }
}
