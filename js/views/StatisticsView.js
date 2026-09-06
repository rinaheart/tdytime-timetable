import { state } from '../state.js';
import { esc } from '../utils/string-utils.js';

export function renderStatisticsView() {
    const container = document.getElementById('statisticsContainer');
    if (!container) return;

    if (!state.parserData || !state.parserData.courseClassesList || state.parserData.courseClassesList.length === 0) {
        container.innerHTML = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
                <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="bar-chart-3" class="w-6 h-6"></i>
                </div>
                <h3 class="font-heading font-bold text-base text-slate-800 dark:text-slate-100 mb-1">Chưa có dữ liệu thống kê</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Vui lòng nạp file lịch giảng để xem các chỉ số phân tích và tổng hợp.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons({ root: container });
        return;
    }

    const classes = state.parserData.courseClassesList;
    const totalClasses = classes.length;
    const totalCohorts = state.uniqueCohorts ? state.uniqueCohorts.length : 0;
    const totalHours = classes.reduce((sum, c) => sum + (c.actualHoursTotal || c.totalHours || 0), 0);
    
    // Count sessions and shift types
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;
    const roomMap = {};

    classes.forEach(c => {
        (c.sessions || []).forEach(s => {
            if (s.sessionType === 'Sáng') morningCount++;
            else if (s.sessionType === 'Chiều') afternoonCount++;
            else if (s.sessionType === 'Tối') eveningCount++;

            const room = s.room ? s.room.trim() : 'N/A';
            roomMap[room] = (roomMap[room] || 0) + 1;
        });
    });

    const totalSessions = morningCount + afternoonCount + eveningCount;
    const morningPct = totalSessions > 0 ? Math.round((morningCount / totalSessions) * 100) : 0;
    const afternoonPct = totalSessions > 0 ? Math.round((afternoonCount / totalSessions) * 100) : 0;
    const eveningPct = totalSessions > 0 ? Math.max(0, 100 - morningPct - afternoonPct) : 0;

    // Sort rooms by session count
    const sortedRooms = Object.entries(roomMap).sort((a, b) => b[1] - a[1]);

    container.innerHTML = `
        <!-- Top 4 KPI Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span class="text-xs font-heading font-semibold uppercase tracking-wider">Lớp học phần</span>
                    <i data-lucide="layers" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                </div>
                <div class="font-num text-2xl font-bold text-slate-900 dark:text-white">${totalClasses}</div>
                <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Được phân công giảng dạy</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span class="text-xs font-heading font-semibold uppercase tracking-wider">Lớp sinh viên</span>
                    <i data-lucide="users" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                </div>
                <div class="font-num text-2xl font-bold text-slate-900 dark:text-white">${totalCohorts}</div>
                <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Khóa & chuyên ngành SV</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span class="text-xs font-heading font-semibold uppercase tracking-wider">Tổng số tiết</span>
                    <i data-lucide="clock" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                </div>
                <div class="font-num text-2xl font-bold text-slate-900 dark:text-white">${totalHours} <span class="text-sm font-normal text-slate-500 dark:text-slate-400">tiết</span></div>
                <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Khối lượng quy chuẩn</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span class="text-xs font-heading font-semibold uppercase tracking-wider">Tổng số buổi</span>
                    <i data-lucide="calendar" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                </div>
                <div class="font-num text-2xl font-bold text-slate-900 dark:text-white">${totalSessions} <span class="text-sm font-normal text-slate-500 dark:text-slate-400">buổi</span></div>
                <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Thời lượng lên lớp</span>
            </div>
        </div>

        <!-- Middle Row: Ca học & Giảng đường -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Phân bố ca học -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 class="font-heading font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                        <i data-lucide="sun-medium" class="w-4 h-4 text-amber-500"></i> Phân bố ca giảng dạy
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Tỉ lệ ca dạy theo Buổi sáng, Buổi chiều và Buổi tối.</p>
                </div>

                <!-- Multi-segment visual bar -->
                <div class="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-4">
                    <div style="width: ${morningPct}%" class="bg-amber-400 transition-all duration-500" title="Sáng: ${morningCount} buổi (${morningPct}%)"></div>
                    <div style="width: ${afternoonPct}%" class="bg-orange-500 transition-all duration-500" title="Chiều: ${afternoonCount} buổi (${afternoonPct}%)"></div>
                    <div style="width: ${eveningPct}%" class="bg-indigo-600 transition-all duration-500" title="Tối: ${eveningCount} buổi (${eveningPct}%)"></div>
                </div>

                <!-- Legend chips -->
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40">
                        <span class="font-semibold text-amber-800 dark:text-amber-400">Ca Sáng</span>
                        <div class="font-num font-bold text-base text-amber-900 dark:text-amber-200 mt-0.5">${morningCount} <span class="text-[11px] font-normal opacity-75">(${morningPct}%)</span></div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/40">
                        <span class="font-semibold text-orange-800 dark:text-orange-400">Ca Chiều</span>
                        <div class="font-num font-bold text-base text-orange-900 dark:text-orange-200 mt-0.5">${afternoonCount} <span class="text-[11px] font-normal opacity-75">(${afternoonPct}%)</span></div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40">
                        <span class="font-semibold text-indigo-800 dark:text-indigo-400">Ca Tối</span>
                        <div class="font-num font-bold text-base text-indigo-900 dark:text-indigo-200 mt-0.5">${eveningCount} <span class="text-[11px] font-normal opacity-75">(${eveningPct}%)</span></div>
                    </div>
                </div>
            </div>

            <!-- Phân bố Giảng đường -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 class="font-heading font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                        <i data-lucide="map-pin" class="w-4 h-4 text-blue-500"></i> Địa điểm giảng đường
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Tần suất sử dụng các phòng học theo lịch giảng.</p>
                </div>

                <div class="flex flex-wrap gap-2 items-center">
                    ${sortedRooms.map(([room, count]) => `
                        <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <span class="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">${esc(room)}</span>
                            <span class="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-num text-[11px] font-bold">${count} buổi</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Bottom Table: Tổng hợp theo học phần -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 class="font-heading font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <i data-lucide="book-marked" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i> Chi tiết theo từng học phần
                </h3>
            </div>
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left border-collapse text-xs">
                    <thead class="bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th class="py-2.5 px-3 w-12 text-center font-num">STT</th>
                            <th class="py-2.5 px-3">Tên học phần</th>
                            <th class="py-2.5 px-3 w-24 text-center font-num">Số lớp</th>
                            <th class="py-2.5 px-3 w-24 text-center font-num">Tổng tiết</th>
                            <th class="py-2.5 px-3 w-40 text-center">Trạng thái CTK</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                        ${(state.uniqueSubjects || []).map((subj, idx) => {
                            const isLinked = state.mapperData.subjectLinkMap && state.mapperData.subjectLinkMap[subj.name];
                            return `
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td class="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-num">${idx + 1}</td>
                                    <td class="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">${esc(subj.name)}</td>
                                    <td class="py-2.5 px-3 text-center font-num">${subj.classCount} lớp</td>
                                    <td class="py-2.5 px-3 text-center font-num font-semibold text-blue-600 dark:text-blue-400">${subj.totalHours} tiết</td>
                                    <td class="py-2.5 px-3 text-center">
                                        ${isLinked ? `
                                            <span class="badge-semantic badge-exact font-num text-xs">
                                                <span class="semantic-dot"></span>Đã liên kết
                                            </span>
                                        ` : `
                                            <span class="badge-semantic badge-unmapped font-num text-xs">
                                                <span class="semantic-dot"></span>Chưa liên kết
                                            </span>
                                        `}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
}
