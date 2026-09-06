import { parseCsvLine } from '../utils/csv-parser.js';
import TimetableMapper from './MappingEngine.js';

export default class CurriculumParser {
    static parseCurriculumData(text, uniqueSubjects = [], savedLinkMap = {}) {
        if (!text || !text.trim()) {
            throw new Error('No data provided');
        }

        const lines = text.split('\n');
        const parsedData = {};
        let currentSubject = null;

        lines.forEach(line => {
            const rawLine = line.trim();
            if (!rawLine) return;
            
            let cols = parseCsvLine(rawLine);
            const stt = parseInt(cols[0]);
            
            // If it's not a number, it's a header row (either "STT" or a Subject Name)
            if (isNaN(stt)) {
                const headerText = cols[0] ? cols[0].trim() : '';
                if (headerText && headerText.toUpperCase() !== 'STT') {
                    currentSubject = headerText;
                    if (!parsedData[currentSubject]) {
                        parsedData[currentSubject] = { lessons: [], lt: 0, th: 0, total: 0 };
                    }
                }
                return;
            }

            // Parse lesson row: STT, Tên bài, LT, TH, Tổng
            if (currentSubject && cols.length >= 2) {
                const lessonName = cols[1];
                if (!lessonName || lessonName.trim().length === 0) return; // Skip blank lines

                const lt = parseInt(cols[2]) || 0;
                const th = parseInt(cols[3]) || 0;
                const total = lt + th;

                if (total > 0) { // Rule: Chỉ lấy các bài có Tổng > 0
                    parsedData[currentSubject].lessons.push({ name: lessonName, lt, th, total });
                    parsedData[currentSubject].lt += lt;
                    parsedData[currentSubject].th += th;
                    parsedData[currentSubject].total += total;
                }
            }
        });

        const matchResult = CurriculumParser.matchSubjects(parsedData, uniqueSubjects, savedLinkMap);

        return {
            parsedData,
            ...matchResult
        };
    }

    static matchSubjects(parsedData, uniqueSubjects = [], savedLinkMap = {}) {
        const curriculumKeys = Object.keys(parsedData || {}).filter(k => parsedData[k] && parsedData[k].total > 0);
        const subjectMatches = [];
        const subjectLinkMap = { ...savedLinkMap };

        uniqueSubjects.forEach(subj => {
            let matchedKey = (savedLinkMap && savedLinkMap[subj.name]) || null;
            let score = 0;
            let status = 'unmapped'; // 'exact' | 'auto' | 'saved' | 'unmapped'

            if (matchedKey && parsedData[matchedKey] && parsedData[matchedKey].total > 0) {
                status = 'saved';
                score = 1000;
            } else {
                // 1. Try Exact match
                const lowerName = subj.name.trim().toLowerCase();
                const exactKey = curriculumKeys.find(k => k.trim().toLowerCase() === lowerName);
                if (exactKey) {
                    matchedKey = exactKey;
                    score = 1000;
                    status = 'exact';
                } else {
                    // 2. Try Smart Fuzzy Match (Acronym + Substring + Tokens)
                    const matchResult = TimetableMapper.findBestMatch(subj.name, curriculumKeys.map(k => ({ name: k })));
                    if (matchResult.index >= 0 && matchResult.score >= 200) {
                        matchedKey = curriculumKeys[matchResult.index];
                        score = matchResult.score;
                        status = 'auto';
                    } else {
                        matchedKey = null;
                        score = matchResult.score || 0;
                        status = 'unmapped';
                    }
                }
            }

            if (matchedKey) {
                subjectLinkMap[subj.name] = matchedKey;
            }

            subjectMatches.push({
                timetableSubject: subj,
                matchedCurriculumKey: matchedKey,
                curriculumData: matchedKey ? parsedData[matchedKey] : null,
                score,
                status
            });
        });

        const mapped = subjectMatches.filter(m => m.matchedCurriculumKey).map(m => ({
            name: m.timetableSubject.name,
            matchedKey: m.matchedCurriculumKey,
            lt: m.curriculumData.lt,
            th: m.curriculumData.th,
            total: m.curriculumData.total,
            status: m.status,
            score: m.score
        }));

        const unmapped = subjectMatches.filter(m => !m.matchedCurriculumKey).map(m => m.timetableSubject);

        return { subjectMatches, subjectLinkMap, mapped, unmapped, curriculumKeys };
    }
}
