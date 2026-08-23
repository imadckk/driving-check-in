/**
 * Admin Report - Driving School
 * Complete rewrite with date range support
 * Malaysia Timezone (UTC+8)
 * Version 2.7 - Fixed date headers (no emojis)
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    SUPABASE_URL: 'https://dorkygsgobhcagtqydjb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0',
    AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
    TIMEZONE: 'Asia/Kuala_Lumpur', // Malaysia timezone
    TABLE_COLUMNS: [
        { header: 'Session', width: 15 },
        { header: 'Instructor', width: 20 },
        { header: 'Student', width: 35 },
        { header: 'Student ID', width: 22 },
        { header: 'Car Plate', width: 18 },
        { header: 'Duration', width: 15 },
        { header: 'Time Range', width: 30 }
    ],
    PDF_COLORS: {
        headerBg: [59, 130, 246],
        headerText: [255, 255, 255],
        evenRowBg: [249, 250, 251],
        oddRowBg: [255, 255, 255],
        text: [0, 0, 0],
        title: [31, 41, 55],
        summary: [59, 130, 246],
        dateGroupBg: [243, 244, 246],
        dateGroupText: [31, 41, 55]
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================
const State = {
    checkins: [],
    currentPDF: null,
    isLoading: false,
    refreshTimer: null,
    pdfLibraryLoaded: false
};

// ============================================
// DOM REFERENCES (cached for performance)
// ============================================
const DOM = {
    totalCheckins: document.getElementById('total-checkins'),
    dateFilter: document.getElementById('date-filter'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    instructorFilter: document.getElementById('instructor-filter'),
    carFilter: document.getElementById('car-filter'),
    sessionFilter: document.getElementById('session-filter'),
    tableBody: document.getElementById('checkins-table'),
    mobileCards: document.getElementById('mobile-cards'),
    loadingMessage: document.getElementById('loading-message'),
    noDataMessage: document.getElementById('no-data-message'),
    lastUpdated: document.getElementById('last-updated'),
    pdfModal: document.getElementById('pdf-preview-modal'),
    pdfContent: document.getElementById('pdf-preview-content'),
    pdfIframe: document.getElementById('pdf-iframe'),
    singleDateGroup: document.getElementById('single-date-group'),
    dateRangeGroup: document.getElementById('date-range-group')
};

// ============================================
// TIMEZONE UTILITY FUNCTIONS
// ============================================

function getMalaysiaDate() {
    const now = new Date();
    const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    return malaysiaTime.toISOString().split('T')[0];
}

function getMalaysiaTomorrow() {
    const now = new Date();
    const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    malaysiaTime.setDate(malaysiaTime.getDate() + 1);
    return malaysiaTime.toISOString().split('T')[0];
}

function getMalaysiaDateRange(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const startUTC = new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0));
    const endUTC = new Date(Date.UTC(year, month - 1, day, 15, 59, 59));
    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

function getMalaysiaDateRangeExtended(fromDate, toDate) {
    const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
    const startUTC = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay - 1, 16, 0, 0));
    const endUTC = new Date(Date.UTC(toYear, toMonth - 1, toDay, 15, 59, 59));
    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
}

function formatToLocalDateTime(isoString) {
    const date = new Date(isoString);
    const malaysiaTime = new Date(date.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    const day = String(malaysiaTime.getDate()).padStart(2, '0');
    const month = String(malaysiaTime.getMonth() + 1).padStart(2, '0');
    const year = malaysiaTime.getFullYear();
    let hours = malaysiaTime.getHours();
    const minutes = String(malaysiaTime.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function formatToLocalDate(isoString) {
    const date = new Date(isoString);
    const malaysiaTime = new Date(date.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    const day = String(malaysiaTime.getDate()).padStart(2, '0');
    const month = String(malaysiaTime.getMonth() + 1).padStart(2, '0');
    const year = malaysiaTime.getFullYear();
    return `${day}/${month}/${year}`;
}

function getDateKey(isoString) {
    const date = new Date(isoString);
    const malaysiaTime = new Date(date.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    const day = String(malaysiaTime.getDate()).padStart(2, '0');
    const month = String(malaysiaTime.getMonth() + 1).padStart(2, '0');
    const year = malaysiaTime.getFullYear();
    return `${year}-${month}-${day}`;
}

/**
 * Sanitize text for PDF - removes special characters that might cause issues
 */
function sanitizeForPDF(text) {
    if (text == null) return 'N/A';
    let clean = String(text);
    // Remove emojis and other non-printable characters
    clean = clean.replace(/[^\x20-\x7E]/g, '');
    if (clean.length > 50) {
        clean = clean.substring(0, 47) + '...';
    }
    return clean || 'N/A';
}

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function forceUppercase(input) {
    if (input) {
        input.value = input.value.toUpperCase();
    }
}

// ============================================
// DATE MODE MANAGEMENT
// ============================================

function getDateMode() {
    const checked = document.querySelector('input[name="dateMode"]:checked');
    return checked ? checked.value : 'single';
}

function toggleDateMode() {
    const mode = getDateMode();
    const isSingle = mode === 'single';
    
    DOM.singleDateGroup.classList.toggle('hidden', !isSingle);
    DOM.dateRangeGroup.classList.toggle('hidden', isSingle);
    
    if (isSingle) {
        if (!DOM.dateFilter.value) {
            DOM.dateFilter.value = getMalaysiaDate();
        }
    } else {
        if (!DOM.dateFrom.value) {
            DOM.dateFrom.value = getMalaysiaDate();
        }
        if (!DOM.dateTo.value) {
            DOM.dateTo.value = getMalaysiaTomorrow();
        }
    }
    
    loadCheckins();
}

function initDateMode() {
    document.querySelector('input[name="dateMode"][value="single"]').checked = true;
    const today = getMalaysiaDate();
    DOM.dateFilter.value = today;
    DOM.dateFrom.value = today;
    DOM.dateTo.value = getMalaysiaTomorrow();
    toggleDateMode();
}

// ============================================
// DATA LOADING
// ============================================

function buildQueryURL() {
    let url = `${CONFIG.SUPABASE_URL}/rest/v1/check_ins?select=*&order=timestamp.desc`;
    const mode = getDateMode();
    
    if (mode === 'single') {
        const dateVal = DOM.dateFilter.value;
        if (dateVal) {
            const range = getMalaysiaDateRange(dateVal);
            url += `&timestamp=gte.${range.start}&timestamp=lt.${range.end}`;
        }
    } else {
        const from = DOM.dateFrom.value;
        const to = DOM.dateTo.value;
        if (from && to) {
            const range = getMalaysiaDateRangeExtended(from, to);
            url += `&timestamp=gte.${range.start}&timestamp=lt.${range.end}`;
        }
    }
    
    const instructor = DOM.instructorFilter.value.trim();
    const car = DOM.carFilter.value.trim();
    const session = DOM.sessionFilter.value;
    
    if (instructor) url += `&instructor_id=eq.${encodeURIComponent(instructor)}`;
    if (car) url += `&car_plate=eq.${encodeURIComponent(car)}`;
    if (session) url += `&session=eq.${encodeURIComponent(session)}`;
    
    return url;
}

async function loadCheckins() {
    if (State.isLoading) return;
    
    State.isLoading = true;
    showLoading(true);
    
    try {
        const url = buildQueryURL();
        const response = await fetch(url, {
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        State.checkins = await response.json();
        renderCheckins();
        updateStats();
        
        const now = new Date();
        const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
        DOM.lastUpdated.textContent = malaysiaTime.toLocaleString('en-US', {
            timeZone: CONFIG.TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
    } catch (error) {
        console.error('Error loading check-ins:', error);
        alert('Failed to load check-ins. Please try again.');
    } finally {
        State.isLoading = false;
        showLoading(false);
    }
}

// ============================================
// RENDERING
// ============================================

function renderCheckins() {
    const { checkins } = State;
    const hasData = checkins.length > 0;
    
    DOM.noDataMessage.classList.toggle('hidden', hasData);
    
    if (!hasData) {
        DOM.tableBody.innerHTML = '';
        DOM.mobileCards.innerHTML = '';
        return;
    }
    
    DOM.tableBody.innerHTML = checkins.map(checkin => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatToLocalDateTime(checkin.timestamp)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    checkin.session === 'KPP02' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }">
                    ${escapeHtml(checkin.session || 'N/A')}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(checkin.instructor_id)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(checkin.student_name)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(checkin.student_id)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${escapeHtml(checkin.car_plate)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${checkin.duration ? checkin.duration + ' hours' : 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${checkin.start_time && checkin.end_time ? 
                    `${escapeHtml(checkin.start_time)} - ${escapeHtml(checkin.end_time)}` : 'N/A'}
            </td>
        </tr>
    `).join('');
    
    DOM.mobileCards.innerHTML = checkins.map(checkin => `
        <div class="bg-white rounded-lg shadow-md p-4 border-l-4 ${
            checkin.session === 'KPP02' ? 'border-blue-500' : 'border-green-500'
        }">
            <div class="flex justify-between items-start mb-2">
                <div class="text-sm text-gray-500">${formatToLocalDateTime(checkin.timestamp)}</div>
                <div class="flex flex-col items-end gap-1">
                    <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                        ${escapeHtml(checkin.car_plate)}
                    </span>
                    <span class="text-xs font-medium ${
                        checkin.session === 'KPP02' ? 'text-blue-600' : 'text-green-600'
                    }">
                        ${escapeHtml(checkin.session || 'N/A')}
                    </span>
                </div>
            </div>
            <div class="space-y-2">
                <div>
                    <div class="text-xs text-gray-500">Instructor ID</div>
                    <div class="font-medium">${escapeHtml(checkin.instructor_id)}</div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-xs text-gray-500">Student Name</div>
                        <div class="font-medium">${escapeHtml(checkin.student_name)}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Student ID</div>
                        <div class="font-medium">${escapeHtml(checkin.student_id)}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-xs text-gray-500">Duration</div>
                        <div class="font-medium">${checkin.duration ? checkin.duration + ' hours' : 'N/A'}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Time Range</div>
                        <div class="font-medium text-sm">${checkin.start_time && checkin.end_time ? 
                            `${escapeHtml(checkin.start_time)} - ${escapeHtml(checkin.end_time)}` : 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    DOM.totalCheckins.textContent = State.checkins.length;
}

function showLoading(show) {
    if (show) {
        DOM.loadingMessage.classList.remove('hidden');
        DOM.tableBody.innerHTML = '';
        DOM.mobileCards.innerHTML = '';
    } else {
        DOM.loadingMessage.classList.add('hidden');
    }
}

function clearFilters() {
    DOM.instructorFilter.value = '';
    DOM.carFilter.value = '';
    DOM.sessionFilter.value = '';
    
    document.querySelector('input[name="dateMode"][value="single"]').checked = true;
    const today = getMalaysiaDate();
    DOM.dateFilter.value = today;
    DOM.dateFrom.value = today;
    DOM.dateTo.value = getMalaysiaTomorrow();
    
    toggleDateMode();
}

// ============================================
// GROUP CHECKINS BY DATE
// ============================================

function groupCheckinsByDate(checkins) {
    const grouped = {};
    checkins.forEach(checkin => {
        const dateKey = getDateKey(checkin.timestamp);
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(checkin);
    });
    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const result = {};
    sortedDates.forEach(date => {
        result[date] = grouped[date];
    });
    return result;
}

// ============================================
// PDF GENERATION (Grouped by Date - No Emojis)
// ============================================

/**
 * Check if jsPDF is loaded
 */
function isJsPDFLoaded() {
    return typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined';
}

/**
 * Get jsPDF instance safely
 */
function getJsPDF() {
    if (isJsPDFLoaded()) {
        return window.jspdf.jsPDF;
    }
    if (typeof jsPDF !== 'undefined') {
        return jsPDF;
    }
    return null;
}

/**
 * Generate and preview PDF
 */
async function generatePDFPreview() {
    if (State.checkins.length === 0) {
        alert('No data to generate PDF');
        return;
    }

    if (!isJsPDFLoaded()) {
        console.error('jsPDF library not loaded');
        alert('PDF library is still loading. Please wait a moment and try again.');
        
        try {
            await loadJsPDFLibrary();
        } catch (error) {
            console.error('Failed to load jsPDF:', error);
            alert('Failed to load PDF library. Please refresh the page and try again.');
            return;
        }
    }
    
    DOM.pdfModal.classList.remove('hidden');
    DOM.pdfContent.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Generating PDF preview...</p>
            </div>
        </div>
    `;
    
    try {
        const doc = await createPDF();
        State.currentPDF = doc;
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        DOM.pdfContent.innerHTML = `
            <iframe src="${pdfUrl}" class="w-full h-full border-0" id="pdf-iframe"></iframe>
        `;
    } catch (error) {
        console.error('PDF generation error:', error);
        DOM.pdfContent.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center text-red-600">
                    <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>Error generating PDF preview</p>
                    <p class="text-sm mt-2">${error.message}</p>
                    <button onclick="retryPDFGeneration()" 
                            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Load jsPDF library dynamically if not already loaded
 */
function loadJsPDFLibrary() {
    return new Promise((resolve, reject) => {
        if (isJsPDFLoaded()) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            if (isJsPDFLoaded()) {
                resolve();
            } else {
                reject(new Error('jsPDF loaded but not available'));
            }
        };
        script.onerror = () => {
            reject(new Error('Failed to load jsPDF library'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Retry PDF generation
 */
function retryPDFGeneration() {
    generatePDFPreview();
}

/**
 * Create PDF document - Grouped by Date (No Emojis)
 */
function createPDF() {
    return new Promise((resolve, reject) => {
        try {
            const JsPDF = getJsPDF();
            if (!JsPDF) {
                reject(new Error('jsPDF library not available'));
                return;
            }
            
            const doc = new JsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            
            // --- Title ---
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text('Driving Lesson Check-In Report', margin, 20);
            
            // --- Filter info ---
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            
            const now = new Date();
            const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
            let filterText = `Generated: ${malaysiaTime.toLocaleString('en-US', {
                timeZone: CONFIG.TIMEZONE,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            })} (Malaysia Time)`;
            
            const mode = getDateMode();
            if (mode === 'single') {
                const d = DOM.dateFilter.value;
                if (d) filterText += ` | Date: ${formatDateDisplay(d)}`;
            } else {
                const from = DOM.dateFrom.value;
                const to = DOM.dateTo.value;
                if (from) filterText += ` | From: ${formatDateDisplay(from)}`;
                if (to) filterText += ` | To: ${formatDateDisplay(to)}`;
            }
            
            const instr = DOM.instructorFilter.value;
            const car = DOM.carFilter.value;
            const sess = DOM.sessionFilter.value;
            if (instr) filterText += ` | Instructor: ${instr}`;
            if (car) filterText += ` | Car: ${car}`;
            if (sess) filterText += ` | Session: ${sess}`;
            
            filterText = sanitizeForPDF(filterText);
            doc.text(filterText, margin, 28);
            
            // --- Summary box ---
            doc.setFillColor(59, 130, 246);
            doc.rect(margin, 33, 50, 8, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`Total: ${State.checkins.length}`, margin + 5, 39);
            
            // --- Group checkins by date ---
            const groupedData = groupCheckinsByDate(State.checkins);
            const dateKeys = Object.keys(groupedData);
            
            // --- Table columns (excluding Date column since we group by date) ---
            const columnConfig = [
                { header: 'Session', width: 15 },
                { header: 'Instructor', width: 20 },
                { header: 'Student', width: 35 },
                { header: 'Student ID', width: 22 },
                { header: 'Car Plate', width: 18 },
                { header: 'Duration', width: 15 },
                { header: 'Time Range', width: 30 }
            ];
            
            const rowHeight = 8;
            let yPosition = 50;
            
            // Process each date group
            dateKeys.forEach((dateKey, dateIndex) => {
                const checkinsForDate = groupedData[dateKey];
                // Format date as DD-MM-YYYY for display
                const dateDisplay = formatDateDisplay(dateKey);
                
                // Check if we need a new page for the date header
                if (yPosition > 260) {
                    doc.addPage();
                    yPosition = 20;
                    // Reset font settings
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                }
                
                // --- Date Group Header (No emoji) ---
                doc.setFillColor(243, 244, 246);
                doc.rect(margin, yPosition, contentWidth, rowHeight + 2, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(31, 41, 55);
                // Plain text date header - no emoji
                const headerText = `Date: ${dateDisplay} (${checkinsForDate.length} records)`;
                doc.text(headerText, margin + 5, yPosition + 6);
                yPosition += rowHeight + 2;
                
                // Check if we need a new page for the table
                if (yPosition > 260) {
                    doc.addPage();
                    yPosition = 20;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                }
                
                // --- Table Header for this date group ---
                doc.setFillColor(59, 130, 246);
                doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                
                let xPos = margin + 1;
                columnConfig.forEach(col => {
                    doc.text(col.header, xPos, yPosition + 5);
                    xPos += col.width;
                });
                yPosition += rowHeight;
                
                // Reset font for data rows
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6);
                doc.setTextColor(0, 0, 0);
                
                // --- Data rows for this date ---
                checkinsForDate.forEach((checkin, index) => {
                    // Check page break
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                        
                        // Reset font settings
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(0, 0, 0);
                        
                        // Redraw table header on new page
                        doc.setFillColor(59, 130, 246);
                        doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(255, 255, 255);
                        
                        let x = margin + 1;
                        columnConfig.forEach(col => {
                            doc.text(col.header, x, yPosition + 5);
                            x += col.width;
                        });
                        yPosition += rowHeight;
                        
                        // Reset font for data rows
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6);
                        doc.setTextColor(0, 0, 0);
                    }
                    
                    // Row background
                    const isEven = index % 2 === 0;
                    doc.setFillColor(isEven ? 249 : 255, isEven ? 250 : 255, isEven ? 251 : 255);
                    doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
                    
                    // Reset text color and font for each row
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                    
                    // Row data
                    let cellX = margin + 1;
                    
                    // Session
                    const sessionText = sanitizeForPDF(checkin.session || 'N/A');
                    doc.text(sessionText, cellX, yPosition + 5);
                    cellX += columnConfig[0].width;
                    
                    // Instructor
                    const instructorText = sanitizeForPDF(checkin.instructor_id || 'N/A');
                    doc.text(instructorText, cellX, yPosition + 5);
                    cellX += columnConfig[1].width;
                    
                    // Student Name
                    const studentNameText = sanitizeForPDF(checkin.student_name || 'N/A');
                    doc.text(studentNameText, cellX, yPosition + 5);
                    cellX += columnConfig[2].width;
                    
                    // Student ID
                    const studentIdText = sanitizeForPDF(checkin.student_id || 'N/A');
                    doc.text(studentIdText, cellX, yPosition + 5);
                    cellX += columnConfig[3].width;
                    
                    // Car Plate
                    const carPlateText = sanitizeForPDF(checkin.car_plate || 'N/A');
                    doc.text(carPlateText, cellX, yPosition + 5);
                    cellX += columnConfig[4].width;
                    
                    // Duration
                    const durationText = checkin.duration ? sanitizeForPDF(checkin.duration + 'h') : 'N/A';
                    doc.text(durationText, cellX, yPosition + 5);
                    cellX += columnConfig[5].width;
                    
                    // Time Range
                    const timeRangeText = checkin.start_time && checkin.end_time ? 
                        sanitizeForPDF(`${checkin.start_time} - ${checkin.end_time}`) : 'N/A';
                    doc.text(timeRangeText, cellX, yPosition + 5);
                    
                    yPosition += rowHeight;
                });
                
                // Add a small gap between date groups
                yPosition += 4;
            });
            
            // --- Page numbers ---
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 15, 290);
            }
            
            resolve(doc);
        } catch (error) {
            reject(error);
        }
    });
}

function downloadPDF() {
    if (!State.currentPDF) {
        alert('No PDF generated yet');
        return;
    }
    const fileName = `driving-lessons-report-${getMalaysiaDate()}.pdf`;
    State.currentPDF.save(fileName);
    closePDFPreview();
}

function closePDFPreview() {
    DOM.pdfModal.classList.add('hidden');
    const iframe = DOM.pdfIframe;
    if (iframe && iframe.src && iframe.src.startsWith('blob:')) {
        URL.revokeObjectURL(iframe.src);
    }
    State.currentPDF = null;
}

// ============================================
// AUTO-REFRESH
// ============================================

function startAutoRefresh() {
    if (State.refreshTimer) {
        clearInterval(State.refreshTimer);
    }
    State.refreshTimer = setInterval(loadCheckins, CONFIG.AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (State.refreshTimer) {
        clearInterval(State.refreshTimer);
        State.refreshTimer = null;
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    const checkLibraries = setInterval(() => {
        if (isJsPDFLoaded()) {
            State.pdfLibraryLoaded = true;
            clearInterval(checkLibraries);
            console.log('jsPDF loaded successfully');
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLibraries);
        if (!State.pdfLibraryLoaded) {
            console.warn('jsPDF not loaded after 5 seconds, will try dynamic loading');
        }
    }, 5000);
    
    initDateMode();
    
    document.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('input', function() {
            forceUppercase(this);
        });
    });
    
    document.querySelectorAll('input[name="dateMode"]').forEach(radio => {
        radio.addEventListener('change', toggleDateMode);
    });
    
    loadCheckins();
    startAutoRefresh();
    
    console.log('Admin Report initialized successfully (Malaysia Timezone)');
    console.log(`Timezone: ${CONFIG.TIMEZONE}`);
    console.log(`Auto-refresh interval: ${CONFIG.AUTO_REFRESH_INTERVAL / 1000} seconds`);
}

// ============================================
// EXPOSE GLOBAL FUNCTIONS
// ============================================
window.loadCheckins = loadCheckins;
window.clearFilters = clearFilters;
window.toggleDateMode = toggleDateMode;
window.generatePDFPreview = generatePDFPreview;
window.downloadPDF = downloadPDF;
window.closePDFPreview = closePDFPreview;
window.retryPDFGeneration = retryPDFGeneration;

// ============================================
// START APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});
