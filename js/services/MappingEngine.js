/** Mapper Engine extracted from mapper.js */

const TimetableMapper = {
parseCurriculum(mdText) {
        const lines = mdText.split('\n');
        const subjects = [];
        let currentSubject = null;
        let parsingTable = false;

        for (let rawLine of lines) {
            let line = rawLine.trim();
            if (!line) continue;

            if (line.startsWith('#') && !line.startsWith('##')) {
                let title = line.replace(/^#+\s*/, '').trim();
                let cleanName = title.replace(/\(LT\s*\+\s*TH.*$/i, '').trim();
                if (!cleanName) cleanName = title;

                if (currentSubject) subjects.push(currentSubject);
                currentSubject = { name: cleanName, rawTitle: title, lessons: [] };
                parsingTable = false;
                continue;
            }

            if (currentSubject && line.startsWith('|')) {
                const cells = line.split('|').map(c => c.trim());
                if (cells.some(c => c.toUpperCase() === 'STT') && cells.some(c => /tên bài|ten bai/i.test(c))) {
                    parsingTable = true;
                    continue;
                }

                if (parsingTable && cells.length >= 5) {
                    let stt = cells[1];
                    let tenBai = cells[2];
                    let lt = parseInt(cells[3]);
                    let th = parseInt(cells[4]);

                    if (stt.includes('-') || stt.toUpperCase() === 'STT') continue;
                    if (stt.toLowerCase().includes('tổng') || tenBai.toLowerCase().includes('tổng')) continue;

                    if (stt && tenBai && (!isNaN(lt) || !isNaN(th))) {
                        currentSubject.lessons.push({
                            stt: stt.replace(/\*/g, '').trim(),
                            tenBai: tenBai.replace(/\*/g, '').trim(),
                            lt: isNaN(lt) ? 0 : lt,
                            th: isNaN(th) ? 0 : th,
                            total: (isNaN(lt) ? 0 : lt) + (isNaN(th) ? 0 : th)
                        });
                    }
                }
            }
        }
        if (currentSubject) subjects.push(currentSubject);
        return subjects;
    },

    parseCurriculumTable(subjectName, rows) {
        // rows is an array of objects: { 'STT': '1', 'Tên bài': 'Bài 1', 'LT': 2, 'TH': 0 }
        let currentSubject = { name: subjectName, rawTitle: subjectName, lessons: [] };
        
        for (let row of rows) {
            // Find keys safely (case insensitive)
            let sttKey = Object.keys(row).find(k => k.toLowerCase().includes('stt'));
            let nameKey = Object.keys(row).find(k => k.toLowerCase().includes('tên bài') || k.toLowerCase().includes('ten bai'));
            let ltKey = Object.keys(row).find(k => k.toLowerCase() === 'lt');
            let thKey = Object.keys(row).find(k => k.toLowerCase() === 'th');

            if (!nameKey) continue;

            let stt = String(row[sttKey] || '').trim();
            let tenBai = String(row[nameKey] || '').trim();
            let lt = parseInt(row[ltKey] || 0);
            let th = parseInt(row[thKey] || 0);

            if (stt.includes('-') || stt.toUpperCase() === 'STT') continue;
            if (stt.toLowerCase().includes('tổng') || tenBai.toLowerCase().includes('tổng')) continue;

            if (tenBai && (!isNaN(lt) || !isNaN(th))) {
                currentSubject.lessons.push({
                    stt: stt,
                    tenBai: tenBai,
                    lt: isNaN(lt) ? 0 : lt,
                    th: isNaN(th) ? 0 : th,
                    total: (isNaN(lt) ? 0 : lt) + (isNaN(th) ? 0 : th)
                });
            }
        }
        
        return [currentSubject]; // Returns array to match format
    },

parseSchedule(mdText) {
        const lines = mdText.split('\n');
        const result = {
            teacher: '',
            semester: '',
            year: '',
            classes: []
        };

        let currentClass = null;
        let parsingTable = false;

        for (let rawLine of lines) {
            let line = rawLine.trim();
            if (!line) continue;

            if (line.includes('**Giảng viên**:')) {
                let m = line.match(/\*\*Giảng viên\*\*:\s*([^*\n]+?)(?:\s*-\s*\*|$)/);
                if (m) result.teacher = m[1].trim();
            }
            if (line.includes('**Năm học**:')) {
                let my = line.match(/\*\*Năm học\*\*:\s*(.*?)(?:\s*-\s*\*\*Học kỳ\*\*|$)/);
                let ms = line.match(/\*\*Học kỳ\*\*:\s*([0-9A-Za-z]+)/);
                if (my) result.year = my[1].trim();
                if (ms) result.semester = ms[1].trim();
            }

            let h3Match = line.match(/^###\s*\d+\.\s*Lớp học phần:\s*(.*)/);
            if (h3Match) {
                if (currentClass) result.classes.push(currentClass);
                
                let rawName = h3Match[1].trim();
                let parts = rawName.split('-').map(p => p.trim());
                let subjectPart = parts[0] || rawName;
                let groupPart = parts.find(p => /nhóm/i.test(p)) || '--';
                let classPart = parts.find(p => !/nhóm/i.test(p) && p !== parts[0]) || (parts.length > 2 ? parts.slice(2).join(' - ') : '--');
                
                groupPart = groupPart.replace(/nhóm/i, '').trim();

                currentClass = {
                    name: rawName,
                    subjectPart: subjectPart,
                    group: groupPart,
                    studentClass: classPart,
                    periods: []
                };
                parsingTable = false;
                continue;
            }

            if (currentClass && line.startsWith('|')) {
                const cells = line.split('|').map(c => c.trim());
                if (cells.some(c => c.toUpperCase() === 'STT') && cells.some(c => /thứ|thu/i.test(c))) {
                    parsingTable = true;
                    continue;
                }

                if (parsingTable && cells.length >= 8) {
                    let stt = cells[1];
                    let thu = cells[2];
                    let ngay = cells[3];
                    let buoi = cells[4];
                    let tiet = cells[5];
                    let soTiet = parseInt(cells[6]);
                    let phong = cells[7];

                    if (stt.includes('-') || stt.toUpperCase() === 'STT') continue;

                    if (!isNaN(soTiet) && ngay && buoi) {
                        currentClass.periods.push({
                            stt: stt.trim(),
                            thu: thu.trim(),
                            ngay: ngay.trim(),
                            buoi: buoi.trim(),
                            tiet: tiet.trim(),
                            soTiet: soTiet,
                            phong: phong.trim()
                        });
                    }
                }
            }
        }
        if (currentClass) result.classes.push(currentClass);
        return result;
    },

performMapping(classData, subjectData) {
        let reportRows = [];
        let lessonIdx = 0;
        let seenLessonNames = new Set();
        let lastSeenDate = ''; // Track the date across all rows

        let workLessons = subjectData.lessons.map(l => ({
            ...l, 
            remLT: l.lt, 
            remTH: l.th
        }));

        for (let period of classData.sessions) {
            let periodHours = parseInt(period.periodCount);
            let firstRowForPeriod = true;
            let periodDate = period.dateFormatted;
            let periodSession = period.sessionType;

            while (periodHours > 0 && lessonIdx < workLessons.length) {
                let lesson = workLessons[lessonIdx];
                let usedLT = 0;
                let usedTH = 0;

                if (lesson.remLT > 0) {
                    let take = Math.min(periodHours, lesson.remLT);
                    usedLT = take;
                    lesson.remLT -= take;
                    periodHours -= take;
                }

                if (periodHours > 0 && lesson.remTH > 0) {
                    let take = Math.min(periodHours, lesson.remTH);
                    usedTH = take;
                    lesson.remTH -= take;
                    periodHours -= take;
                }

                if (usedLT > 0 || usedTH > 0) {
                    let baseTitle = lesson.name;
                    let displayTitle = baseTitle;
                    
                    if (seenLessonNames.has(baseTitle) && !baseTitle.toLowerCase().includes('(tt)') && !baseTitle.toLowerCase().includes('kiểm tra')) {
                        displayTitle = `${baseTitle} (tt)`;
                    }
                    seenLessonNames.add(baseTitle);

                    let showDate = (periodDate !== lastSeenDate);
                    
                    reportRows.push({
                        ngay: showDate ? periodDate : '',
                        rawNgay: periodDate, 
                        buoi: periodSession,
                        lt: usedLT,
                        th: usedTH,
                        tenBai: displayTitle,
                        isFirst: firstRowForPeriod
                    });
                    lastSeenDate = periodDate;
                    firstRowForPeriod = false;
                }

                if (lesson.remLT === 0 && lesson.remTH === 0) {
                    lessonIdx++;
                }
            }

            if (periodHours > 0) {
                let showDate = (periodDate !== lastSeenDate);
                reportRows.push({
                    ngay: showDate ? periodDate : '',
                    rawNgay: periodDate,
                    buoi: periodSession,
                    lt: 0,
                    th: periodHours,
                    tenBai: '(Ngoài chương trình khung / Tự chọn / Bổ trợ)',
                    isFirst: firstRowForPeriod
                });
                lastSeenDate = periodDate;
                periodHours = 0;
            }
        }
        return reportRows;
    },

    removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
    },

    extractAcronym(str) {
        if (!str) return { full: '', stopless: '' };
        let clean = str.replace(/[()\-–—,.:;&/]/g, ' ').trim();
        let rawWords = clean.split(/\s+/).filter(w => w.length > 0);
        
        let stopwords = new Set(['va', 'và', 'voi', 'với', 'cho', 'cua', 'của', 'trong', 'la', 'là']);
        let fullAcr = '';
        let stoplessAcr = '';

        for (let word of rawWords) {
            let isStop = stopwords.has(word.toLowerCase());
            if (/^[A-ZĐĂÂÁÀẢÃẠÉÈẺẼẸÍÌỈĨỊÓÒỎÕỌÔƠÚÙỦŨỤƯÝ]{2,}$/.test(word)) {
                let normWord = TimetableMapper.removeAccents(word).toUpperCase();
                fullAcr += normWord;
                if (!isStop) stoplessAcr += normWord;
            } else {
                let firstChar = TimetableMapper.removeAccents(word.charAt(0)).toUpperCase();
                if (firstChar >= 'A' && firstChar <= 'Z') {
                    fullAcr += firstChar;
                    if (!isStop) stoplessAcr += firstChar;
                }
            }
        }

        return { full: fullAcr, stopless: stoplessAcr };
    },

    findBestMatch(className, subjects) {
        if (!subjects || subjects.length === 0) {
            return { index: -1, score: 0, matchedSubject: null };
        }

        let classSubjectPart = String(className).split('-')[0].trim();
        let cleanClass = TimetableMapper.removeAccents(classSubjectPart).replace(/\s+/g, ' ');
        let classAcr = TimetableMapper.extractAcronym(classSubjectPart);

        let bestMatchIdx = -1;
        let maxScore = -1;

        subjects.forEach((sub, idx) => {
            let subName = typeof sub === 'string' ? sub : (sub.name || '');
            let cleanSub = TimetableMapper.removeAccents(subName).replace(/\s+/g, ' ');
            let subAcr = TimetableMapper.extractAcronym(subName);
            let score = 0;

            if (cleanClass === cleanSub) score += 1000;
            if (classAcr.full && subAcr.full && classAcr.full === subAcr.full) score += 800;
            if (classAcr.stopless && subAcr.stopless && classAcr.stopless === subAcr.stopless) score += 800;

            if (classAcr.stopless && subAcr.stopless) {
                if (subAcr.stopless.includes(classAcr.stopless) || classAcr.stopless.includes(subAcr.stopless)) {
                    let ratio = Math.min(classAcr.stopless.length, subAcr.stopless.length) / Math.max(classAcr.stopless.length, subAcr.stopless.length);
                    score += Math.round(300 * ratio);
                }
            }

            if (cleanSub.includes(cleanClass) || cleanClass.includes(cleanSub)) {
                let lenRatio = Math.min(cleanClass.length, cleanSub.length) / Math.max(cleanClass.length, cleanSub.length);
                score += Math.round(200 * lenRatio);
            }

            let classWords = cleanClass.split(' ').filter(w => w.length > 1);
            let subWords = new Set(cleanSub.split(' ').filter(w => w.length > 1));
            let matchCount = classWords.filter(w => subWords.has(w)).length;
            score += matchCount * 20;

            if (score > maxScore) {
                maxScore = score;
                bestMatchIdx = idx;
            }
        });

        return {
            index: bestMatchIdx,
            score: maxScore,
            matchedSubject: bestMatchIdx >= 0 ? subjects[bestMatchIdx] : null
        };
    },

    findBestMatchIndex(className, subjects) {
        return TimetableMapper.findBestMatch(className, subjects).index;
    },

};

export default TimetableMapper;
