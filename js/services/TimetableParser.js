/**
 * Parser Engine for University Timetable HTML Exports
 * Optimized architecture: Separates 1-time DOM Extraction and high-performance In-Memory Transformation.
 * Includes security sanitization (XSS mitigation) and academic year / semester extraction.
 */

export default class TimetableParser {
    // Default planned curriculum hours by subject code prefix or subject keywords
    static DEFAULT_PLANNED_HOURS = {
        'MHCĐO1023': 60, // Dịch tễ học và THNCKH
        'MHCĐO1092': 45, // Thực hành Nghiên cứu khoa học
    };

    static DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    static DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    /**
     * Decode HTML entities safely without executing scripts.
     */
    static decodeHtml(html) {
        if (!html) return '';
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    /**
     * Escape special HTML characters to prevent DOM-based XSS injection.
     */
    static escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Shorten full course class code (e.g. "2025-2026.1.MHCĐO1023.001" -> "MHCĐO1023.001")
     */
    static shortCode(code) {
        if (!code) return '';
        return String(code).replace(/^\d{4}-\d{4}\.\d\./, '');
    }

    /**
     * Remove Vietnamese accents for clean filenames
     */
    static removeTones(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9_.-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * STAGE 1: Extract raw session objects from HTML string using DOMParser.
     * Runs ONCE per file load. Cached in memory for instant filtering.
     * @param {string} htmlString 
     * @returns {Object} Raw extracted dataset
     */
    static extractRawData(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        const pageTitle = doc.title || 'Lịch trình giảng dạy';
        const h2Elem = doc.querySelector('.hitec-content h2');
        const heading = h2Elem ? h2Elem.textContent.trim() : 'LỊCH TRÌNH GIẢNG DẠY';

        // 1. Extract Academic Year & Semester from .hitec-year
        let detectedAcademicYear = '';
        let detectedSemester = '';

        const yearElem = doc.querySelector('.hitec-year') || doc.querySelector('#divThietLapHocKy');
        if (yearElem) {
            const rawYearText = TimetableParser.decodeHtml(yearElem.textContent).trim();
            const semMatch = rawYearText.match(/Học\s*kỳ:\s*(\d+|hè|[A-Za-z0-9]+)/i);
            const yearMatch = rawYearText.match(/năm\s*học:\s*(\d{4}\s*-\s*\d{4})/i);
            if (semMatch) detectedSemester = semMatch[1].trim();
            if (yearMatch) detectedAcademicYear = yearMatch[1].replace(/\s+/g, '');
        }

        if (!detectedAcademicYear) {
            const namhocSelect = doc.querySelector('select[name="namhoc"] option[selected], select[name="namhoc"]');
            if (namhocSelect) detectedAcademicYear = namhocSelect.value || namhocSelect.textContent.trim();
        }
        if (!detectedSemester) {
            const hockySelect = doc.querySelector('select[name="hocky"] option[selected], select[name="hocky"]');
            if (hockySelect) detectedSemester = hockySelect.value || hockySelect.textContent.trim();
        }

        // Extract sidebar default instructor
        const sidebarNameElem = doc.querySelector('.hitec-information h5');
        const defaultInstructor = sidebarNameElem ? TimetableParser.decodeHtml(sidebarNameElem.textContent).trim() : 'Phan Đức Thái Duy';

        // Table
        const table = doc.querySelector('table.table-bordered');
        if (!table) {
            throw new Error('Không tìm thấy bảng thời khóa biểu (.table-bordered) trong file HTML.');
        }

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const rawSessions = [];
        const teachersSet = new Set();

        let currentWeek = null;

        rows.forEach(tr => {
            const weekTd = tr.querySelector('td.hitec-td-tkbTuan');
            if (weekTd) {
                const weekText = TimetableParser.decodeHtml(weekTd.textContent).trim();
                const dateMatches = weekText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
                if (dateMatches && dateMatches.length >= 2) {
                    currentWeek = {
                        text: weekText,
                        startDateStr: dateMatches[0],
                        endDateStr: dateMatches[1],
                        startDate: TimetableParser.parseDate(dateMatches[0]),
                        endDate: TimetableParser.parseDate(dateMatches[1])
                    };
                }
                return;
            }

            if (!currentWeek) return;

            const cells = Array.from(tr.querySelectorAll('td'));
            if (cells.length < 7) return;

            let sessionType = 'Sáng';
            const firstClass = cells[0].className || '';
            if (firstClass.includes('hitec-td-tkbSang')) sessionType = 'Sáng';
            else if (firstClass.includes('hitec-td-tkbChieu')) sessionType = 'Chiều';
            else if (firstClass.includes('hitec-td-tkbToi')) sessionType = 'Tối';

            cells.forEach((cell, dayIdx) => {
                const links = Array.from(cell.querySelectorAll('a'));
                if (links.length === 0) return;

                const sessionDate = new Date(currentWeek.startDate);
                sessionDate.setDate(sessionDate.getDate() + dayIdx);
                const dateFormatted = TimetableParser.formatDate(sessionDate);
                const dayOfWeek = TimetableParser.DAY_NAMES[dayIdx];
                const dayOfWeekShort = TimetableParser.DAYS[dayIdx];

                links.forEach(a => {
                    const href = a.getAttribute('href') || '';
                    const rawTitle = a.getAttribute('title') || '';
                    const title = TimetableParser.decodeHtml(rawTitle).trim();
                    const rawDataContent = a.getAttribute('data-content') || '';
                    const dataContent = TimetableParser.decodeHtml(rawDataContent).trim();
                    const strongText = a.querySelector('strong') ? a.querySelector('strong').textContent.trim() : '';

                    let fullClassCode = '';
                    const hrefMatch = href.match(/Course\/Details\/([^/]+)\//i);
                    if (hrefMatch) {
                        fullClassCode = hrefMatch[1];
                    } else {
                        fullClassCode = strongText || 'UNKNOWN';
                    }

                    if (!detectedAcademicYear || !detectedSemester) {
                        const yearSemMatch = fullClassCode.match(/^(\d{4}-\d{4})\.(\d+)\./);
                        if (yearSemMatch) {
                            if (!detectedAcademicYear) detectedAcademicYear = yearSemMatch[1];
                            if (!detectedSemester) detectedSemester = yearSemMatch[2];
                        }
                    }

                    const shortClassCode = TimetableParser.shortCode(fullClassCode);

                    // Parse room
                    const roomMatch = dataContent.match(/Phòng\s*học:\s*([^<]*)/i);
                    let room = roomMatch ? roomMatch[1].trim() : '';
                    if (!room || room === '.') room = '(Chưa xếp)';

                    // Parse periods
                    const periodMatch = dataContent.match(/Tiết:\s*(\d+)\s*(?:-|–|—|đến)\s*(\d+)/i);
                    let startPeriod = periodMatch ? parseInt(periodMatch[1], 10) : 0;
                    let endPeriod = periodMatch ? parseInt(periodMatch[2], 10) : 0;
                    let periodStr = startPeriod && endPeriod ? `${startPeriod}-${endPeriod}` : '';

                    // Parse actual teaching hours
                    const actualHoursMatch = dataContent.match(/Thực\s*dạy\s*(?:<b>)?\s*(\d+)\s*(?:<\/b>)?/i);
                    const actualHours = actualHoursMatch ? parseInt(actualHoursMatch[1], 10) : 0;

                    // Parse teacher name
                    const teacherMatch = dataContent.match(/Giáo\s*viên:\s*([^<]*)/i);
                    let teacher = teacherMatch ? teacherMatch[1].trim() : '';
                    if (!teacher) teacher = defaultInstructor;

                    if (teacher) teachersSet.add(teacher);

                    // Parse Subject Name, Group Name, Student Classes
                    let subjectName = title;
                    let studentClasses = '';
                    let groupName = '';

                    const titleParts = title.split(/\s*-\s*/);
                    if (titleParts.length >= 3) {
                        studentClasses = titleParts[titleParts.length - 1].trim();
                        groupName = titleParts[titleParts.length - 2].trim();
                        subjectName = titleParts.slice(0, titleParts.length - 2).join(' - ').trim();
                    } else if (titleParts.length === 2) {
                        studentClasses = titleParts[1].trim();
                        subjectName = titleParts[0].trim();
                    }

                    const isCivicWeek = fullClassCode.includes('CT_') || subjectName.toLowerCase().includes('sinh hoạt công dân');

                    rawSessions.push({
                        classCode: fullClassCode,
                        shortClassCode,
                        fullTitle: title,
                        subjectName,
                        groupName,
                        studentClasses,
                        date: sessionDate,
                        dateFormatted,
                        dayOfWeek,
                        dayOfWeekShort,
                        dayIndex: dayIdx,
                        sessionType,
                        startPeriod,
                        endPeriod,
                        periodStr,
                        actualHours,
                        room,
                        teacher,
                        isCivicWeek,
                        weekInfo: currentWeek.text
                    });
                });
            });
        });

        const academicYear = detectedAcademicYear || '2025-2026';
        const semester = detectedSemester || '1';

        return {
            pageTitle,
            heading,
            academicYear,
            semester,
            defaultInstructor,
            allTeachers: Array.from(teachersSet).sort((a, b) => a.localeCompare(b, 'vi')),
            rawSessions
        };
    }

    /**
     * STAGE 2: High-speed In-Memory Filtering, Trimming, and Grouping.
     * Executes in < 2ms without touching DOMParser.
     * @param {Object} rawData 
     * @param {Object} options 
     * @returns {Object} Transformed and aggregated dataset
     */
    static transform(rawData, options = {}) {
        const {
            selectedTeacher = 'Phan Đức Thái Duy',
            ignoreCivicWeek = true,
            periodCalcMode = 'range', // 'range' or 'actual'
            autoTrimExcess = false,
            plannedHoursMap = TimetableParser.DEFAULT_PLANNED_HOURS
        } = options;

        if (!rawData || !rawData.rawSessions) {
            throw new Error('Dữ liệu thô chưa được trích xuất.');
        }

        // Filter raw sessions
        let filteredSessions = rawData.rawSessions;

        if (selectedTeacher && selectedTeacher !== 'ALL') {
            const target = selectedTeacher.toLowerCase().trim();
            filteredSessions = filteredSessions.filter(s => 
                s.teacher.toLowerCase().includes(target)
            );
        }

        if (ignoreCivicWeek) {
            filteredSessions = filteredSessions.filter(s => !s.isCivicWeek);
        }

        // Deep copy sessions for immutable calculation
        const processedSessions = filteredSessions.map(s => {
            let periodCount = 0;
            if (periodCalcMode === 'actual') {
                periodCount = s.actualHours;
            } else {
                periodCount = (s.startPeriod && s.endPeriod) ? (s.endPeriod - s.startPeriod + 1) : s.actualHours;
            }
            return {
                ...s,
                periodCount,
                originalPeriodCount: periodCount,
                originalPeriodStr: s.periodStr,
                isTrimmed: false,
                trimmedCount: 0
            };
        });

        // Group by Course Class
        const courseClassesMap = new Map();

        processedSessions.forEach(session => {
            const key = session.classCode;
            if (!courseClassesMap.has(key)) {
                let plannedHours = 0;
                for (const [prefix, hours] of Object.entries(plannedHoursMap)) {
                    if (session.classCode.includes(prefix) || session.subjectName.includes(prefix)) {
                        plannedHours = hours;
                        break;
                    }
                }

                courseClassesMap.set(key, {
                    classCode: session.classCode,
                    shortClassCode: session.shortClassCode,
                    fullTitle: session.fullTitle,
                    subjectName: session.subjectName,
                    groupName: session.groupName,
                    studentClasses: session.studentClasses,
                    sessions: [],
                    totalHours: 0,
                    originalTotalHours: 0,
                    plannedHours,
                    actualHoursTotal: 0,
                    startDate: null,
                    endDate: null,
                    isTrimmed: false,
                    totalTrimmedPeriods: 0,
                    daySet: new Set(),
                    morningDays: new Set(),
                    afternoonDays: new Set()
                });
            }
            const cc = courseClassesMap.get(key);
            cc.sessions.push(session);
            cc.totalHours += session.periodCount;
            cc.originalTotalHours += session.originalPeriodCount;
            cc.actualHoursTotal += session.actualHours;
            cc.daySet.add(session.dayOfWeekShort);
            if (session.sessionType === 'Sáng') cc.morningDays.add(session.dayOfWeekShort);
            if (session.sessionType === 'Chiều' || session.sessionType === 'Tối') cc.afternoonDays.add(session.dayOfWeekShort);

            if (!cc.startDate || session.date < cc.startDate) cc.startDate = session.date;
            if (!cc.endDate || session.date > cc.endDate) cc.endDate = session.date;
        });

        // Format and optionally trim excess periods
        const courseClassesList = Array.from(courseClassesMap.values()).map(cc => {
            cc.sessions.sort((a, b) => a.date - b.date || a.startPeriod - b.startPeriod);

            cc.sessions.forEach((s, idx) => {
                s.stt = idx + 1;
            });

            if (autoTrimExcess && cc.plannedHours > 0 && cc.totalHours > cc.plannedHours) {
                let excessToTrim = cc.totalHours - cc.plannedHours;
                cc.totalTrimmedPeriods = excessToTrim;
                cc.isTrimmed = true;

                for (let i = cc.sessions.length - 1; i >= 0 && excessToTrim > 0; i--) {
                    const session = cc.sessions[i];
                    if (session.periodCount <= 0) continue;

                    const trimAmount = Math.min(excessToTrim, session.periodCount);
                    session.periodCount -= trimAmount;
                    session.isTrimmed = true;
                    session.trimmedCount = trimAmount;
                    excessToTrim -= trimAmount;

                    if (session.periodCount > 0) {
                        const newEnd = session.startPeriod + session.periodCount - 1;
                        session.periodStr = `${session.startPeriod}-${newEnd}`;
                    } else {
                        session.periodStr = `${session.startPeriod} (Đã cắt)`;
                    }
                }

                cc.totalHours = cc.sessions.reduce((sum, s) => sum + s.periodCount, 0);
            }

            return {
                ...cc,
                sessionCount: cc.sessions.length,
                startDateFormatted: cc.startDate ? TimetableParser.formatDate(cc.startDate) : '',
                endDateFormatted: cc.endDate ? TimetableParser.formatDate(cc.endDate) : ''
            };
        });

        // Sort classes naturally by classCode (e.g. MHCĐO1023.001, MHCĐO1023.003, MHCĐO1023.005)
        courseClassesList.sort((a, b) => {
            const codeA = a.shortClassCode || a.classCode || '';
            const codeB = b.shortClassCode || b.classCode || '';
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Group subjects and student classes
        const subjectsMap = new Map();
        const studentClassesMap = new Map();

        courseClassesList.forEach(cc => {
            if (!subjectsMap.has(cc.subjectName)) {
                subjectsMap.set(cc.subjectName, {
                    subjectName: cc.subjectName,
                    classes: new Set(),
                    sessions: [],
                    totalHours: 0,
                    daySet: new Set()
                });
            }
            const subj = subjectsMap.get(cc.subjectName);
            subj.classes.add(cc.classCode);
            subj.sessions.push(...cc.sessions);
            subj.totalHours += cc.totalHours;
            cc.daySet.forEach(d => subj.daySet.add(d));

            const classTokens = cc.studentClasses.split(/[,\s]+/).filter(t => t.length > 1);
            const rawClasses = cc.studentClasses ? [cc.studentClasses] : [];
            const allTargetClassKeys = [...new Set([...rawClasses, ...classTokens])];

            allTargetClassKeys.forEach(cls => {
                if (!cls) return;
                if (!studentClassesMap.has(cls)) {
                    studentClassesMap.set(cls, {
                        studentClass: cls,
                        sessions: [],
                        totalHours: 0,
                        daySet: new Set()
                    });
                }
                studentClassesMap.get(cls).sessions.push(...cc.sessions);
                studentClassesMap.get(cls).totalHours += cc.totalHours;
                cc.daySet.forEach(d => studentClassesMap.get(cls).daySet.add(d));
            });
        });

        const totalPeriods = courseClassesList.reduce((sum, c) => sum + c.totalHours, 0);
        const totalActualPeriods = courseClassesList.reduce((sum, c) => sum + c.actualHoursTotal, 0);
        const totalSessions = courseClassesList.reduce((sum, c) => sum + c.sessionCount, 0);
        const totalSubjects = subjectsMap.size;
        const totalCourseClasses = courseClassesList.length;

        const studentClassesList = Array.from(new Set(
            courseClassesList.flatMap(c => c.studentClasses.split(/,\s*/).map(s => s.trim()).filter(Boolean))
        ));

        return {
            pageTitle: rawData.pageTitle,
            heading: rawData.heading,
            academicYear: rawData.academicYear,
            semester: rawData.semester,
            defaultInstructor: rawData.defaultInstructor,
            allTeachers: rawData.allTeachers,
            filteredSessions: processedSessions,
            courseClassesList,
            subjectsList: Array.from(subjectsMap.values()).map(s => {
                const matchedClasses = courseClassesList.filter(c => c.subjectName === s.subjectName);
                const studentClasses = Array.from(new Set(matchedClasses.flatMap(c => (c.studentClasses || '').split(',').map(st => st.trim())))).filter(Boolean);
                const morningDays = new Set(matchedClasses.flatMap(c => Array.from(c.morningDays || [])));
                const afternoonDays = new Set(matchedClasses.flatMap(c => Array.from(c.afternoonDays || [])));

                return {
                    subjectName: s.subjectName,
                    classCount: s.classes.size,
                    sessionCount: s.sessions.length,
                    totalHours: s.totalHours,
                    classes: Array.from(s.classes),
                    courseClasses: matchedClasses,
                    studentClasses,
                    daySet: s.daySet,
                    morningDays,
                    afternoonDays
                };
            }).sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'vi')),
            studentClassesList,
            summary: {
                totalSubjects,
                totalCourseClasses,
                totalStudentClasses: studentClassesList.length,
                totalSessions,
                totalPeriods,
                totalActualPeriods,
                autoTrimExcess
            }
        };
    }

    /**
     * Backward-compatible 1-step parser
     */
    static parse(htmlString, options = {}) {
        const raw = TimetableParser.extractRawData(htmlString);
        return TimetableParser.transform(raw, options);
    }

    static parseDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return new Date();
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }

    static formatDate(d) {
        if (!d || isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

if (typeof window !== 'undefined') {
    window.TimetableParser = TimetableParser;
}
