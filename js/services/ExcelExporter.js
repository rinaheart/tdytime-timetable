/**
 * Exporter Engine for University Timetable Reports
 * Includes Security Sanitization for CSV Formula Injection (CWE-1236)
 * Supports: Multi-sheet Excel (.xlsx), UTF-8 BOM CSV, Markdown (.md), Clipboard, and Print.
 * Output standard: "Thứ | Ngày" separated columns, no unused notes/exam badges.
 */

let xlsxLoadingPromise = null;
let excelJsLoadingPromise = null;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Không thể nạp thư viện: ${src}`));
        document.head.appendChild(script);
    });
}

export default class TimetableExporter {
    /**
     * Nạp ngầm thư viện SheetJS (XLSX) theo nhu cầu (Lazy Load)
     */
    static async ensureXlsxLoaded() {
        if (typeof XLSX !== 'undefined') return;
        if (!xlsxLoadingPromise) {
            xlsxLoadingPromise = loadScript('vendor/xlsx.full.min.js');
        }
        await xlsxLoadingPromise;
        if (typeof XLSX === 'undefined') {
            throw new Error('Thư viện SheetJS chưa sẵn sàng.');
        }
    }

    /**
     * Nạp ngầm thư viện ExcelJS theo nhu cầu (Lazy Load)
     */
    static async ensureExcelJsLoaded() {
        if (typeof ExcelJS !== 'undefined') return;
        if (!excelJsLoadingPromise) {
            excelJsLoadingPromise = loadScript('vendor/exceljs.min.js');
        }
        await excelJsLoadingPromise;
        if (typeof ExcelJS === 'undefined') {
            throw new Error('Thư viện ExcelJS chưa sẵn sàng.');
        }
    }

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
     * Sanitize CSV cells against CSV Formula Injection (Excel DDE Execution).
     * Neutralizes characters: =, +, -, @, \t, \r
     */
    static sanitizeCsvCell(cell) {
        let str = String(cell ?? '');
        // If string begins with dangerous formula triggers, prepend a single quote
        if (/^[=+\-@\t\r]/.test(str)) {
            str = "'" + str;
        }
        if (/[",\r\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    /**
     * Sanitize cell strings against spreadsheet formula injection (CWE-1236).
     */
    static sanitizeFormula(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (/^[=+\-@\t\r]/.test(str)) {
            return "'" + str;
        }
        return str;
    }

    /**
     * Generate structured markdown report for a single course class.
     */
    static generateCourseClassMarkdown(courseClass) {
        const lines = [];
        lines.push(`Tên lớp học phần: ${courseClass.fullTitle}`);
        lines.push('');
        lines.push(`Tổng số giờ: ${courseClass.totalHours} giờ`);
        lines.push(`Tổng số buổi: ${courseClass.sessionCount} buổi`);
        lines.push(`Từ ngày ${courseClass.startDateFormatted} đến ngày ${courseClass.endDateFormatted}`);
        lines.push('Lịch giảng chi tiết:');
        lines.push('');
        lines.push('| STT | Thứ | Ngày | Buổi | Tiết | Số tiết | Phòng học |');
        lines.push('|:---:|:---:|:---:|:---:|:---:|:---:|:---|');

        courseClass.sessions.forEach((s, idx) => {
            lines.push(`| ${idx + 1} | ${s.dayOfWeekShort} | ${s.dateFormatted} | ${s.sessionType} | ${s.periodStr} | ${s.periodCount} | ${s.room} |`);
        });

        return lines.join('\n');
    }

    /**
     * Generate full markdown report for all course classes of an instructor.
     */
    static generateAllClassesMarkdown(parsedData, selectedClassCodes = null) {
        const targetClasses = selectedClassCodes 
            ? parsedData.courseClassesList.filter(c => selectedClassCodes.has ? selectedClassCodes.has(c.classCode) : selectedClassCodes.includes(c.classCode))
            : parsedData.courseClassesList;

        const totalSubjects = new Set(targetClasses.map(c => c.subjectName)).size;
        const totalCourseClasses = targetClasses.length;
        const studentClassesList = Array.from(new Set(targetClasses.flatMap(c => (c.studentClasses || '').split(',').map(s => s.trim())))).filter(Boolean);
        const totalStudentClasses = studentClassesList.length;
        const totalSessions = targetClasses.reduce((sum, c) => sum + c.sessionCount, 0);
        const totalPeriods = targetClasses.reduce((sum, c) => sum + c.totalHours, 0);

        const lines = [];
        lines.push(`# BÁO CÁO LỊCH TRÌNH GIẢNG DẠY`);
        lines.push('');
        lines.push(`- **Giảng viên**: ${parsedData.defaultInstructor}`);
        lines.push(`- **Năm học**: ${parsedData.academicYear} - **Học kỳ**: ${parsedData.semester}`);
        lines.push(`- **Tổng số môn**: ${totalSubjects} môn`);
        lines.push(`- **Tổng số lớp học phần**: ${totalCourseClasses} lớp học phần`);
        lines.push(`- **Tổng số lớp SV**: ${totalStudentClasses} lớp sinh viên (${studentClassesList.join(', ')})`);
        lines.push(`- **Tổng số buổi lên lớp**: ${totalSessions} buổi`);
        lines.push(`- **Tổng số giờ (tiết)**: ${totalPeriods} tiết`);
        lines.push('');
        lines.push('---');
        lines.push('');
        lines.push('## I. BẢNG TỔNG HỢP & ĐỐI SOÁT WEB TÍN CHỈ');
        lines.push('');
        lines.push('| STT | Mã Lớp Học Phần | Tên Lớp Học Phần | Lớp SV | Ngày Bắt Đầu | Ngày Kết Thúc | Tổng Buổi | Tổng Tiết |');
        lines.push('|:---:|:---|:---|:---|:---:|:---:|:---:|:---:|');

        targetClasses.forEach((c, idx) => {
            const shortCode = c.shortClassCode || c.classCode;
            lines.push(`| ${idx + 1} | \`${shortCode}\` | ${c.fullTitle} | ${c.studentClasses} | ${c.startDateFormatted} | ${c.endDateFormatted} | ${c.sessionCount} | ${c.totalHours} |`);
        });

        lines.push(`| **Tổng** | | **${totalSubjects} môn** | **${totalStudentClasses} lớp SV** | | | **${totalSessions}** | **${totalPeriods}** |`);
        lines.push('');
        lines.push('---');
        lines.push('');
        lines.push('## II. LỊCH GIẢNG CHI TIẾT TỪNG LỚP HỌC PHẦN');
        lines.push('');

        targetClasses.forEach((c, idx) => {
            lines.push(`### ${idx + 1}. Lớp học phần: ${c.fullTitle}`);
            lines.push('');
            lines.push(TimetableExporter.generateCourseClassMarkdown(c));
            lines.push('');
            lines.push('---');
            lines.push('');
        });

        return lines.join('\n');
    }

    /**
     * Export sessions dataset to CSV file with UTF-8 BOM and Formula Sanitization.
     */
    static exportToCSV(sessions, filename = 'LichGiangDay.csv') {
        const headers = ['STT', 'Mã Lớp HP', 'Tên Lớp Học Phần', 'Thứ', 'Ngày', 'Buổi', 'Tiết', 'Số Tiết', 'Phòng Học', 'Giáo Viên'];
        const rows = [headers];

        sessions.forEach((s, idx) => {
            rows.push([
                idx + 1,
                s.shortClassCode || s.classCode,
                s.fullTitle,
                s.dayOfWeekShort,
                s.dateFormatted,
                s.sessionType,
                s.periodStr,
                s.periodCount,
                s.room,
                s.teacher
            ]);
        });

        const csvContent = rows.map(r => r.map(cell => TimetableExporter.sanitizeCsvCell(cell)).join(',')).join('\r\n');

        // Prepend UTF-8 BOM (\uFEFF)
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        TimetableExporter.triggerDownload(blob, filename);
    }

    /**
     * Export to Excel (.xlsx) workbook with SheetJS (Lazy-loaded).
     */
    static async exportToExcel(parsedData, singleClassCode = null, selectedClassCodes = null) {
        try {
            await TimetableExporter.ensureXlsxLoaded();
        } catch (err) {
            console.error('Lỗi nạp SheetJS:', err);
            alert('Không thể nạp thư viện SheetJS. Vui lòng thử lại!');
            return;
        }

        const wb = XLSX.utils.book_new();
        const teacherName = parsedData.defaultInstructor || 'GV';
        const teacherSlug = TimetableExporter.removeTones(teacherName);

        if (singleClassCode) {
            const cc = parsedData.courseClassesList.find(c => c.classCode === singleClassCode);
            if (!cc) return;

            const sheetData = [
                ['BÁO CÁO LỊCH GIẢNG DẠY LỚP HỌC PHẦN'],
                ['Giảng viên:', TimetableExporter.sanitizeFormula(teacherName)],
                ['Năm học:', TimetableExporter.sanitizeFormula(`${parsedData.academicYear} - Học kỳ: ${parsedData.semester}`)],
                ['Tên lớp học phần:', TimetableExporter.sanitizeFormula(cc.fullTitle)],
                ['Mã lớp học phần:', TimetableExporter.sanitizeFormula(cc.shortClassCode || cc.classCode)],
                ['Tổng số giờ:', `${cc.totalHours} giờ`],
                ['Tổng số buổi:', `${cc.sessionCount} buổi`],
                ['Thời gian:', `Từ ${cc.startDateFormatted} đến ${cc.endDateFormatted}`],
                ['Lớp sinh viên:', TimetableExporter.sanitizeFormula(cc.studentClasses)],
                [],
                ['STT', 'Thứ', 'Ngày', 'Buổi', 'Tiết', 'Số tiết', 'Phòng học']
            ];

            cc.sessions.forEach((s, idx) => {
                sheetData.push([
                    idx + 1,
                    s.dayOfWeekShort,
                    s.dateFormatted,
                    s.sessionType,
                    s.periodStr,
                    s.periodCount,
                    TimetableExporter.sanitizeFormula(s.room)
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            const shortName = (cc.shortClassCode || 'LHP').slice(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, shortName);
            const filename = `LichGiang_${teacherSlug}_${TimetableExporter.removeTones(cc.shortClassCode || 'Lop')}.xlsx`;
            XLSX.writeFile(wb, filename);
        } else {
            const targetClasses = selectedClassCodes 
                ? parsedData.courseClassesList.filter(c => selectedClassCodes.has ? selectedClassCodes.has(c.classCode) : selectedClassCodes.includes(c.classCode))
                : parsedData.courseClassesList;

            const totalSubjects = new Set(targetClasses.map(c => c.subjectName)).size;
            const totalCourseClasses = targetClasses.length;
            const totalSessions = targetClasses.reduce((sum, c) => sum + c.sessionCount, 0);
            const totalPeriods = targetClasses.reduce((sum, c) => sum + c.totalHours, 0);

            // Multi-sheet workbook
            const overviewData = [
                ['BẢNG TỔNG HỢP LỊCH TRÌNH GIẢNG DẠY HỌC KỲ'],
                ['Giảng viên:', TimetableExporter.sanitizeFormula(teacherName)],
                ['Năm học:', TimetableExporter.sanitizeFormula(`${parsedData.academicYear} - Học kỳ: ${parsedData.semester}`)],
                ['Tổng số môn:', totalSubjects],
                ['Tổng số lớp học phần:', totalCourseClasses],
                ['Tổng số buổi:', totalSessions],
                ['Tổng số giờ (tiết):', totalPeriods],
                [],
                ['STT', 'Mã Lớp HP', 'Tên Lớp Học Phần', 'Lớp Sinh Viên', 'Ngày Bắt Đầu', 'Ngày Kết Thúc', 'Số Buổi', 'Tổng Số Giờ', 'Trạng Thái']
            ];

            targetClasses.forEach((c, idx) => {
                let statusText = 'Khớp chuẩn';
                if (c.isTrimmed) {
                    statusText = `Đã cắt ${c.totalTrimmedPeriods}t thừa`;
                } else if (c.plannedHours > 0 && c.totalHours > c.plannedHours) {
                    statusText = `Thừa ${c.totalHours - c.plannedHours}t`;
                } else if (c.plannedHours > 0 && c.totalHours < c.plannedHours) {
                    statusText = `Thiếu ${c.plannedHours - c.totalHours}t`;
                }

                overviewData.push([
                    idx + 1,
                    TimetableExporter.sanitizeFormula(c.shortClassCode || c.classCode),
                    TimetableExporter.sanitizeFormula(c.fullTitle),
                    TimetableExporter.sanitizeFormula(c.studentClasses),
                    c.startDateFormatted,
                    c.endDateFormatted,
                    c.sessionCount,
                    c.totalHours,
                    statusText
                ]);
            });

            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            XLSX.utils.book_append_sheet(wb, wsOverview, 'Tong hop');

            // Individual Sheets
            const usedNames = new Set(['Tong hop']);
            targetClasses.forEach(c => {
                const sheetRows = [
                    ['Tên lớp học phần:', c.fullTitle],
                    ['Mã lớp học phần:', c.shortClassCode || c.classCode],
                    ['Tổng số giờ:', `${c.totalHours} giờ`],
                    ['Tổng số buổi:', `${c.sessionCount} buổi`],
                    ['Từ ngày:', c.startDateFormatted, 'Đến ngày:', c.endDateFormatted],
                    ['Lớp sinh viên:', c.studentClasses],
                    [],
                    ['STT', 'Thứ', 'Ngày', 'Buổi', 'Tiết', 'Số tiết', 'Phòng học']
                ];

                c.sessions.forEach((s, idx) => {
                    sheetRows.push([
                        idx + 1,
                        s.dayOfWeekShort,
                        s.dateFormatted,
                        s.sessionType,
                        s.periodStr,
                        s.periodCount,
                        s.room
                    ]);
                });

                const wsClass = XLSX.utils.aoa_to_sheet(sheetRows);
                let cleanName = (c.shortClassCode || 'Lop').replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
                let safeName = cleanName;
                let count = 1;
                while (usedNames.has(safeName)) {
                    safeName = `${cleanName.slice(0, 27)}_${count++}`;
                }
                usedNames.add(safeName);

                XLSX.utils.book_append_sheet(wb, wsClass, safeName);
            });

            const countSuffix = selectedClassCodes && targetClasses.length !== parsedData.courseClassesList.length ? `_DaChon_${targetClasses.length}Lop` : '_ToanBo';
            const filename = `LichGiang_${teacherSlug}${countSuffix}_${parsedData.academicYear}_HK${parsedData.semester}.xlsx`;
            XLSX.writeFile(wb, filename);
        }
    }

    /**
     * Copy text content to system clipboard.
     * Robust implementation supporting https, localhost, file:///, and execCommand fallback.
     */
    static async copyToClipboard(text) {
        if (!text) return false;
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('navigator.clipboard failed, attempting execCommand fallback:', err);
            }
        }

        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            textArea.setAttribute('readonly', '');
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            textArea.remove();
            if (successful) return true;
        } catch (fallbackErr) {
            console.error('Fallback execCommand failed:', fallbackErr);
        }
        throw new Error('Không thể sao chép văn bản vào clipboard');
    }

    /**
     * Copy markdown content to clipboard (alias for copyToClipboard).
     */
    static async copyMarkdownToClipboard(text) {
        return this.copyToClipboard(text);
    }

    static triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Export syllabus template with ExcelJS to preserve styles.
     */
    static generateMappedSheet(workbook, classData) {
        let safeName = (classData.classCode || 'Class').replace(/[\\/?*\[\]]/g, '').substring(0, 31);
        const ws = workbook.addWorksheet(safeName);

        // Header Rows
        ws.addRow(['KẾ HOẠCH GIẢNG DẠY']).font = { bold: true, size: 14 };
        ws.mergeCells('A1:E1');
        ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        ws.addRow([TimetableExporter.sanitizeFormula(`Lớp: ${classData.classCode || ''}`)]).font = { bold: true };
        ws.mergeCells('A2:E2');
        ws.getCell('A2').alignment = { horizontal: 'center' };
        
        ws.addRow([TimetableExporter.sanitizeFormula(`Học phần: ${classData.subjectName || ''}`)]).font = { bold: true };
        ws.mergeCells('A3:E3');
        ws.getCell('A3').alignment = { horizontal: 'center' };

        ws.addRow([]); // empty row

        // Table Header
        const headerRow = ws.addRow(['Ngày', 'Buổi', 'Nội dung (Tên bài)', 'LT', 'TH']);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Borders for header
        headerRow.eachCell(cell => {
            cell.border = {
                top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
            };
        });

        // Data Rows
        const rowsToProcess = classData.mappedSchedule || classData.mappedReport || [];
        rowsToProcess.forEach((row) => {
            const dataRow = ws.addRow([
                TimetableExporter.sanitizeFormula(row.ngay || ''), 
                TimetableExporter.sanitizeFormula(row.buoi || ''), 
                TimetableExporter.sanitizeFormula(row.tenBai || ''), 
                row.lt > 0 ? row.lt : '', 
                row.th > 0 ? row.th : ''
            ]);

            dataRow.eachCell({ includeEmpty: true }, cell => {
                cell.border = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
                cell.alignment = { vertical: 'middle' };
            });

            // Center align LT TH
            dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
            dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
            dataRow.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
        });

        // Cell merging logic for Date and Session
        let lastDate = null;
        let lastSession = null;
        let dateStart = 0;
        let sessionStart = 0;

        for (let r = 6; r <= ws.rowCount; r++) {
            let row = ws.getRow(r);
            let d = row.getCell(1).value;
            let s = row.getCell(2).value;
            let isLast = r === ws.rowCount;

            if (d !== '' && d !== lastDate) {
                if (lastDate !== null && r - 1 > dateStart) {
                    ws.mergeCells(`A${dateStart}:A${r - 1}`);
                }
                lastDate = d;
                dateStart = r;
            } else if (d === '') {
                // If it's empty, it belongs to the previous date
                row.getCell(1).value = lastDate;
                row.getCell(1).font = { color: { argb: 'FFFFFFFF' } }; // Hide text visually if merging fails, but we will merge
            }

            if (s !== '' && s !== lastSession) {
                if (lastSession !== null && r - 1 > sessionStart) {
                    ws.mergeCells(`B${sessionStart}:B${r - 1}`);
                }
                lastSession = s;
                sessionStart = r;
            } else if (s === '') {
                row.getCell(2).value = lastSession;
                row.getCell(2).font = { color: { argb: 'FFFFFFFF' } }; 
            }

            if (isLast) {
                if (r > dateStart) ws.mergeCells(`A${dateStart}:A${r}`);
                if (r > sessionStart) ws.mergeCells(`B${sessionStart}:B${r}`);
            }
        }

        // Wipe hidden values after merging so it looks clean
        for (let r = 6; r <= ws.rowCount; r++) {
            ws.getRow(r).getCell(1).font = { color: { argb: 'FF000000' } };
            ws.getRow(r).getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(r).getCell(2).font = { color: { argb: 'FF000000' } };
            ws.getRow(r).getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Set column widths
        ws.getColumn(1).width = 12; // Ngày
        ws.getColumn(2).width = 10; // Buổi
        ws.getColumn(3).width = 50; // Nội dung
        ws.getColumn(4).width = 5;  // LT
        ws.getColumn(5).width = 5;  // TH
    }

    static async exportMappedTimetableToExcel(classData) {
        try {
            await TimetableExporter.ensureExcelJsLoaded();
        } catch (err) {
            console.error('Lỗi nạp ExcelJS:', err);
            alert('Không thể nạp thư viện ExcelJS. Vui lòng thử lại!');
            return;
        }
        const workbook = new ExcelJS.Workbook();
        TimetableExporter.generateMappedSheet(workbook, classData);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const safeName = TimetableExporter.removeTones(classData.classCode || 'Lop');
        TimetableExporter.triggerDownload(blob, `KeHoachGiangDay_${safeName}.xlsx`);
    }

    static async exportAllMappedClasses(mappedClassesList) {
        try {
            await TimetableExporter.ensureExcelJsLoaded();
        } catch (err) {
            console.error('Lỗi nạp ExcelJS:', err);
            alert('Không thể nạp thư viện ExcelJS. Vui lòng thử lại!');
            return;
        }
        const workbook = new ExcelJS.Workbook();
        mappedClassesList.forEach(classData => {
            TimetableExporter.generateMappedSheet(workbook, classData);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        TimetableExporter.triggerDownload(blob, `KeHoachGiangDay_TatCa_CacLop.xlsx`);
    }

    static async exportSyllabusTemplate(uniqueSubjects) {
        try {
            await TimetableExporter.ensureExcelJsLoaded();
        } catch (err) {
            console.error('Lỗi nạp ExcelJS:', err);
            alert('Không thể nạp thư viện ExcelJS. Vui lòng thử lại!');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Chương trình khung');

        // Set column widths
        worksheet.getColumn('A').width = 10;
        worksheet.getColumn('B').width = 45;
        worksheet.getColumn('C').width = 10;
        worksheet.getColumn('D').width = 10;
        worksheet.getColumn('E').width = 10;

        // Row 1: Header
        const headerRow = worksheet.addRow(['STT', 'Tên bài', 'LT', 'TH', 'Tổng']);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };
        worksheet.getCell('B1').alignment = { horizontal: 'left' };

        // Background color for header
        const headerFill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' }
        };
        for (let i = 1; i <= 5; i++) {
            headerRow.getCell(i).fill = headerFill;
        }

        // Demo block fill
        const demoFill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' } // Yellow
        };
        const demoFill2 = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' } // Light Blue
        };

        const demoSubjectRow = worksheet.addRow(['Chăm sóc sức khỏe cộng đồng - Lý thuyết']);
        demoSubjectRow.font = { bold: true, color: { argb: 'FFFF0000' } };
        // The user said: "tô màu thêm các ô A3:E8 để làm nổi bật môn demo."
        // We will just color everything from row 3 to 8.

        const demoLessons = [
            [1, 'Bài 1. Khái niệm về điều dưỡng cộng đồng', 2, 0, 2],
            [2, 'Bài 2. Thu thập và xử lý thông tin', 4, 0, 4],
            [3, 'Bài 3. Xác định nhu cầu chăm sóc sức khỏe cộng đồng', 4, 0, 4],
            [4, 'Bài 4. Lập kế hoạch chăm sóc sức khỏe cộng đồng', 4, 0, 4],
            [5, 'Kiểm tra', 1, 0, 1],
        ];

        demoLessons.forEach(lesson => {
            const r = worksheet.addRow(lesson);
            for (let i = 1; i <= 5; i++) {
                r.getCell(i).fill = demoFill;
            }
        });

        // Row 8
        const demoSubjectRow2 = worksheet.addRow(['Học phần B']);
        demoSubjectRow2.font = { bold: true, color: { argb: 'FFFF0000' } };
        for (let i = 1; i <= 5; i++) {
            demoSubjectRow2.getCell(i).fill = demoFill2;
        }

        // Actual subjects
        uniqueSubjects.forEach(subj => {
            const safeName = TimetableExporter.sanitizeFormula(subj.name);
            const subjRow = worksheet.addRow([safeName]);
            subjRow.font = { bold: true, color: { argb: 'FFFF0000' } };

            for (let i = 1; i <= 9; i++) {
                worksheet.addRow([i, '', '', '', '']);
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        TimetableExporter.triggerDownload(blob, 'Template_ChuongTrinhKhung.xlsx');
    }
}

if (typeof window !== 'undefined') {
    window.TimetableExporter = TimetableExporter;
}
