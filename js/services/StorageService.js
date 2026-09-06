// StorageService.js - Centralized LocalStorage Management for TdyTime V2

const KEYS = {
    TIMETABLE_RAW_HTML: 'tdytime_timetable_raw_html',
    ACTIVE_TAB: 'tdytime_active_tab',
    SELECTED_ENTITY: 'tdytime_selected_entity',
    CURRICULUM_TEXT: 'tdytime_curriculum_text',
    CURRICULUM_DATA: 'tdytime_curriculum_data',
    SUBJECT_LINKS: 'tdytime_subject_links',
    CLASS_MAPPINGS: 'tdytime_class_mappings'
};

export default class StorageService {
    static get KEYS() {
        return KEYS;
    }

    // --- Timetable Raw HTML ---
    /**
     * Tối ưu hóa kích thước chuỗi HTML trước khi lưu vào localStorage (PERF-02).
     * Loại bỏ scripts, styles, inline base64 images giúp giảm ~90% dung lượng.
     */
    static cleanRawHtmlForStorage(rawHtml) {
        if (!rawHtml || typeof rawHtml !== 'string') return '';
        if (rawHtml.length < 300000) return rawHtml;
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html');
            doc.querySelectorAll('script, style, link[rel="stylesheet"], svg, iframe').forEach(el => el.remove());
            doc.querySelectorAll('img').forEach(img => {
                if (img.src && img.src.startsWith('data:')) img.removeAttribute('src');
            });
            const container = doc.querySelector('.hitec-content') || doc.body;
            if (container) {
                let extra = '';
                const yearElem = doc.querySelector('.hitec-year, #divThietLapHocKy');
                if (yearElem && !container.contains(yearElem)) extra += yearElem.outerHTML;
                const infoElem = doc.querySelector('.hitec-information');
                if (infoElem && !container.contains(infoElem)) extra += infoElem.outerHTML;
                return extra + container.innerHTML;
            }
            return doc.documentElement.innerHTML;
        } catch (e) {
            return rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                          .replace(/data:image\/[a-zA-Z]+;base64,[^"']+/g, '');
        }
    }

    static saveTimetableRaw(rawHtml) {
        if (!rawHtml) return;
        try {
            const optimized = StorageService.cleanRawHtmlForStorage(rawHtml);
            localStorage.setItem(KEYS.TIMETABLE_RAW_HTML, optimized);
        } catch (err) {
            console.warn('[StorageService] Không thể lưu lịch giảng vào localStorage:', err);
        }
    }

    static getTimetableRaw() {
        try {
            return localStorage.getItem(KEYS.TIMETABLE_RAW_HTML) || null;
        } catch (err) {
            console.warn('[StorageService] Không thể đọc lịch giảng từ localStorage:', err);
            return null;
        }
    }

    static clearTimetableRaw() {
        try {
            localStorage.removeItem(KEYS.TIMETABLE_RAW_HTML);
        } catch (err) {
            console.warn('[StorageService] Lỗi khi xóa lịch giảng:', err);
        }
    }

    // --- Active Tab ---
    static saveActiveTab(tab) {
        if (!tab) return;
        try {
            localStorage.setItem(KEYS.ACTIVE_TAB, tab);
        } catch (err) {
            console.warn('[StorageService] Lỗi khi lưu active tab:', err);
        }
    }

    static getActiveTab() {
        try {
            return localStorage.getItem(KEYS.ACTIVE_TAB) || null;
        } catch (err) {
            return null;
        }
    }

    // --- Selected Entity (Detail View) ---
    static saveSelectedEntity(type, id) {
        if (!id) return;
        try {
            localStorage.setItem(KEYS.SELECTED_ENTITY, JSON.stringify({ type, id }));
        } catch (err) {
            console.warn('[StorageService] Lỗi khi lưu selected entity:', err);
        }
    }

    static getSelectedEntity() {
        try {
            const val = localStorage.getItem(KEYS.SELECTED_ENTITY);
            return val ? JSON.parse(val) : null;
        } catch (err) {
            return null;
        }
    }

    // --- Curriculum Raw Text ---
    static saveCurriculumText(text) {
        if (typeof text !== 'string') return;
        try {
            localStorage.setItem(KEYS.CURRICULUM_TEXT, text);
        } catch (err) {
            console.warn('[StorageService] Lỗi khi lưu curriculum text:', err);
        }
    }

    static getCurriculumText() {
        try {
            return localStorage.getItem(KEYS.CURRICULUM_TEXT) || '';
        } catch (err) {
            return '';
        }
    }

    // --- Curriculum Parsed Data ---
    static saveCurriculumData(curriculumData) {
        if (!curriculumData) return;
        try {
            localStorage.setItem(KEYS.CURRICULUM_DATA, JSON.stringify(curriculumData));
        } catch (err) {
            console.warn('[StorageService] Lỗi khi lưu curriculum data:', err);
        }
    }

    static getCurriculumData() {
        try {
            const val = localStorage.getItem(KEYS.CURRICULUM_DATA);
            return val ? JSON.parse(val) : null;
        } catch (err) {
            return null;
        }
    }

    // --- Subject Link Map ---
    static saveSubjectLinks(subjectLinkMap) {
        if (!subjectLinkMap) return;
        try {
            localStorage.setItem(KEYS.SUBJECT_LINKS, JSON.stringify(subjectLinkMap));
        } catch (err) {
            console.warn('[StorageService] Lỗi khi lưu subject link map:', err);
        }
    }

    static getSubjectLinks() {
        try {
            const val = localStorage.getItem(KEYS.SUBJECT_LINKS);
            return val ? JSON.parse(val) : {};
        } catch (err) {
            return {};
        }
    }

    // --- Class Mappings (Kế hoạch giảng dạy chi tiết đã khớp) ---
    static saveClassMappings(classMappings) {
        if (!classMappings) return;
        try {
            localStorage.setItem(KEYS.CLASS_MAPPINGS, JSON.stringify(classMappings));
        } catch (err) {
            console.warn('[StorageService] Lỗi khi lưu class mappings:', err);
        }
    }

    static getClassMappings() {
        try {
            const val = localStorage.getItem(KEYS.CLASS_MAPPINGS);
            return val ? JSON.parse(val) : null;
        } catch (err) {
            console.warn('[StorageService] Lỗi khi đọc class mappings:', err);
            return null;
        }
    }

    static clearClassMappings() {
        try {
            localStorage.removeItem(KEYS.CLASS_MAPPINGS);
        } catch (err) {
            console.warn('[StorageService] Lỗi khi xóa class mappings:', err);
        }
    }

    // --- Session Reset (Khi bấm đổi file khác) ---
    static clearSession() {
        try {
            localStorage.removeItem(KEYS.TIMETABLE_RAW_HTML);
            localStorage.removeItem(KEYS.ACTIVE_TAB);
            localStorage.removeItem(KEYS.SELECTED_ENTITY);
            localStorage.removeItem(KEYS.CLASS_MAPPINGS);
        } catch (err) {
            console.warn('[StorageService] Lỗi khi xóa session:', err);
        }
    }

    // --- Xóa sạch toàn bộ ---
    static clearAll() {
        try {
            Object.values(KEYS).forEach(k => localStorage.removeItem(k));
        } catch (err) {
            console.warn('[StorageService] Lỗi khi clear all:', err);
        }
    }
}
