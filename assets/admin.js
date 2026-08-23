/**
 * Admin Report - Driving School
 * Complete rewrite with date range support
 * Malaysia Timezone (UTC+8)
 * Version 2.2 - Fixed date filtering
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    SUPABASE_URL: 'https://dorkygsgobhcagtqydjb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0',
    AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
    TIMEZONE: 'Asia/Kuala_Lumpur', // Malaysia timezone
    DATE_FORMAT: 'DD-MM-YYYY',
    TABLE_COLUMNS: [
        { header: 'Date', width: 22 },
        { header: 'Session', width: 12 },
        { header: 'Instructor', width: 18 },
        { header: 'Student', width: 39 },
        { header: 'Student ID', width: 25 },
        { header: 'Car Plate', width: 18 },
        { header: 'Duration', width: 15 },
        { header: 'Time Range', width: 25 }
    ],
    PDF_COLORS: {
        headerBg: [59, 130, 246],
        headerText: [255, 255, 255],
        evenRowBg: [249, 250, 251],
        oddRowBg: [255, 255, 255],
        text: [0, 0, 0],
        title: [31, 41, 55],
        summary: [59, 130, 246]
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================
const State = {
    checkins: [],
    currentPDF: null,
    isLoading: false,
    refreshTimer: null
};

// ============================================
// DOM REFERENCES (cached for performance)
// ============================================
const DOM = {
    // Stats
    totalCheckins: document.getElementById('total-checkins'),
    
    // Filters
    dateFilter: document.getElementById('date-filter'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    instructorFilter: document.getElementById('instructor-filter'),
    carFilter: document.getElementById('car-filter'),
    sessionFilter: document.getElementById('session-filter'),
    dateModeRadios: document.querySelectorAll('input[name="dateMode"]'),
    
    // Display
    tableBody: document.getElementById('checkins-table'),
    mobileCards: document.getElementById('mobile-cards'),
    loadingMessage: document.getElementById('loading-message'),
    noDataMessage: document.getElementById('no-data-message'),
    lastUpdated: document.getElementById('last-updated'),
    
    // Modal
    pdfModal: document.getElementById('pdf-preview-modal'),
    pdfContent: document.getElementById('pdf-preview-content'),
    pdfIframe: document.getElementById('pdf-iframe'),
    
    // Groups
    singleDateGroup: document.getElementById('single-date-group'),
    dateRangeGroup: document.getElementById('date-range-group')
};

// ============================================
// TIMEZONE UTILITY FUNCTIONS
// ============================================

/**
 * Get current date in Malaysia timezone (YYYY-MM-DD format for input fields)
 */
function getMalaysiaDate() {
    const now = new Date();
    const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    return malaysiaTime.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in Malaysia timezone (YYYY-MM-DD format)
 */
function getMalaysiaTomorrow() {
    const now = new Date();
    const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    malaysiaTime.setDate(malaysiaTime.getDate() + 1);
    return malaysiaTime.toISOString().split('T')[0];
}

/**
 * Get date range in Malaysia timezone for a specific date
 * Returns start and end of day in UTC for Supabase query
 */
function getMalaysiaDateRange(dateStr) {
    // Parse the date string in Malaysia timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Create date in Malaysia timezone
    const malaysiaDate = new Date(year, month - 1, day);
    
    // Convert to UTC for Supabase query
    // Start of day in Malaysia = 00:00:00 MYT = previous day 16:00:00 UTC
    const startUTC = new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0));
    // End of day in Malaysia = 23:59:59 MYT = current day 15:59:59 UTC
    const endUTC = new Date(Date.UTC(year, month - 1, day, 15, 59, 59));
    
    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

/**
 * Get date range in Malaysia timezone for a date range
 */
function getMalaysiaDateRangeExtended(fromDate, toDate) {
    const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
    
    // Start of from date in Malaysia (00:00:00 MYT)
    const startUTC = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay - 1, 16, 0, 0));
    
    // End of to date in Malaysia (23:59:59 MYT)
    const endUTC = new Date(Date.UTC(toYear, toMonth - 1, toDay, 15, 59, 59));
    
    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

/**
 * Format date to DD-MM-YYYY for display
 */
function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD to DD-MM-YYYY
    }
    return dateString;
}

/**
 * Format ISO timestamp to local date/time with Malaysia timezone
 */
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

/**
 * Format ISO timestamp to date only (DD/MM/YYYY) with Malaysia timezone
 */
function formatToLocalDate(isoString) {
    const date = new Date(isoString);
    const malaysiaTime = new Date(date.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    
    const day = String(malaysiaTime.getDate()).padStart(2, '0');
    const month = String(malaysiaTime.getMonth() + 1).padStart(2, '0');
    const year = malaysiaTime.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML special characters
 */
function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Force uppercase on input
 */
function forceUppercase(input) {
    if (input) {
        input.value = input.value.toUpperCase();
    }
}

// ============================================
// DATE MODE MANAGEMENT
// ============================================

/**
 * Get current date mode ('single' or 'range')
 */
function getDateMode() {
    const checked = document.querySelector('input[name="dateMode"]:checked');
    return checked ? checked.value : 'single';
}

/**
 * Toggle between single date and date range modes
 */
function toggleDateMode() {
    const mode = getDateMode();
    const isSingle = mode === 'single';
    
    // Toggle visibility
    DOM.singleDateGroup.classList.toggle('hidden', !isSingle);
    DOM.dateRangeGroup.classList.toggle('hidden', isSingle);
    
    // Set defaults if empty (using Malaysia timezone)
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
    
    // Refresh data
    loadCheckins();
}

/**
 * Initialize date mode on page load
 */
function initDateMode() {
    // Set default to single mode
    document.querySelector('input[name="dateMode"][value="single"]').checked = true;
    
    // Set default dates (Malaysia timezone)
    const today = getMalaysiaDate();
    DOM.dateFilter.value = today;
    DOM.dateFrom.value = today;
    DOM.dateTo.value = getMalaysiaTomorrow();
    
    // Apply toggle
    toggleDateMode();
}

// ============================================
// DATA LOADING (FIXED DATE FILTERING)
// ============================================

/**
 * Build the Supabase query URL with filters
 * Fixed to properly handle Malaysia timezone
 */
function buildQueryURL() {
    let url = `${CONFIG.SUPABASE_URL}/rest/v1/check_ins?select=*&order=timestamp.desc`;
    const mode = getDateMode();
    
    // Date filtering with Malaysia timezone
    if (mode === 'single') {
        const dateVal = DOM.dateFilter.value;
        if (dateVal) {
            // Get Malaysia timezone date range
            const range = getMalaysiaDateRange(dateVal);
            // Use ISO strings for Supabase query
            url += `&timestamp=gte.${range.start}&timestamp=lt.${range.end}`;
        }
    } else {
        const from = DOM.dateFrom.value;
        const to = DOM.dateTo.value;
        if (from && to) {
            // Get Malaysia timezone date range for the period
            const range = getMalaysiaDateRangeExtended(from, to);
            url += `&timestamp=gte.${range.start}&timestamp=lt.${range.end}`;
        }
    }
    
    // Other filters
    const instructor = DOM.instructorFilter.value.trim();
    const car = DOM.carFilter.value.trim();
    const session = DOM.sessionFilter.value;
    
    if (instructor) url += `&instructor_id=eq.${encodeURIComponent(instructor)}`;
    if (car) url += `&car_plate=eq.${encodeURIComponent(car)}`;
    if (session) url += `&session=eq.${encodeURIComponent(session)}`;
    
    console.log('Query URL:', url); // Debug log
    return url;
}

/**
 * Load check-ins from Supabase
 */
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
        
        // Update last updated with Malaysia time
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
        
        // Log the number of records and their dates for debugging
        console.log(`Loaded ${State.checkins.length} records`);
        if (State.checkins.length > 0) {
            console.log('Sample timestamps:', State.checkins.slice(0, 3).map(c => c.timestamp));
        }
        
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

/**
 * Render check-ins to desktop table and mobile cards
 */
function renderCheckins() {
    const { checkins } = State;
    const hasData = checkins.length > 0;
    
    // Show/hide no data message
    DOM.noDataMessage.classList.toggle('hidden', hasData);
    
    if (!hasData) {
        DOM.tableBody.innerHTML = '';
        DOM.mobileCards.innerHTML = '';
        return;
    }
    
    // Render desktop table
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
    
    // Render mobile cards
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

/**
 * Update statistics display
 */
function updateStats() {
    DOM.totalCheckins.textContent = State.checkins.length;
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    if (show) {
        DOM.loadingMessage.classList.remove('hidden');
        DOM.tableBody.innerHTML = '';
        DOM.mobileCards.innerHTML = '';
    } else {
        DOM.loadingMessage.classList.add('hidden');
    }
}

// ============================================
// FILTER MANAGEMENT
// ============================================

/**
 * Clear all filters and reset to defaults
 */
function clearFilters() {
    // Clear text filters
    DOM.instructorFilter.value = '';
    DOM.carFilter.value = '';
    DOM.sessionFilter.value = '';
    
    // Reset date mode to single
    document.querySelector('input[name="dateMode"][value="single"]').checked = true;
    const today = getMalaysiaDate();
    DOM.dateFilter.value = today;
    DOM.dateFrom.value = today;
    DOM.dateTo.value = getMalaysiaTomorrow();
    
    // Apply toggle and reload
    toggleDateMode();
}

// ============================================
// PDF GENERATION (unchanged)
// ============================================

/**
 * Generate and preview PDF
 */
function generatePDFPreview() {
    if (State.checkins.length === 0) {
        alert('No data to generate PDF');
        return;
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
    
    createPDF()
        .then(doc => {
            State.currentPDF = doc;
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            DOM.pdfContent.innerHTML = `
                <iframe src="${pdfUrl}" class="w-full h-full border-0" id="pdf-iframe"></iframe>
            `;
        })
        .catch(error => {
            console.error('PDF generation error:', error);
            DOM.pdfContent.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center text-red-600">
                        <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p>Error generating PDF preview</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                </div>
            `;
        });
}

/**
 * Create PDF document
 */
function createPDF() {
    return new Promise((resolve) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        const { PDF_COLORS, TABLE_COLUMNS } = CONFIG;
        
        // --- Title ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PDF_COLORS.title[0], PDF_COLORS.title[1], PDF_COLORS.title[2]);
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
        doc.text(filterText, margin, 28);
        
        // --- Summary box ---
        doc.setFillColor(PDF_COLORS.summary[0], PDF_COLORS.summary[1], PDF_COLORS.summary[2]);
        doc.rect(margin, 33, 50, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Total: ${State.checkins.length}`, margin + 5, 39);
        
        // --- Table ---
        const rowHeight = 8;
        let yPosition = 50;
        
        // Draw header
        doc.setFillColor(PDF_COLORS.headerBg[0], PDF_COLORS.headerBg[1], PDF_COLORS.headerBg[2]);
        doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PDF_COLORS.headerText[0], PDF_COLORS.headerText[1], PDF_COLORS.headerText[2]);
        
        let xPos = margin + 1;
        TABLE_COLUMNS.forEach(col => {
            doc.text(col.header, xPos, yPosition + 5);
            xPos += col.width;
        });
        yPosition += rowHeight;
        
        // Draw rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        
        State.checkins.forEach((checkin, index) => {
            // Check page break
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
                
                // Redraw header
                doc.setFillColor(PDF_COLORS.headerBg[0], PDF_COLORS.headerBg[1], PDF_COLORS.headerBg[2]);
                doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(PDF_COLORS.headerText[0], PDF_COLORS.headerText[1], PDF_COLORS.headerText[2]);
                
                let x = margin + 1;
                TABLE_COLUMNS.forEach(col => {
                    doc.text(col.header, x, yPosition + 5);
                    x += col.width;
                });
                yPosition += rowHeight;
            }
            
            // Row background
            const isEven = index % 2 === 0;
            doc.setFillColor(isEven ? PDF_COLORS.evenRowBg : PDF_COLORS.oddRowBg);
            doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
            doc.setTextColor(PDF_COLORS.text[0], PDF_COLORS.text[1], PDF_COLORS.text[2]);
            
            // Row data
            let cellX = margin + 1;
            doc.text(formatToLocalDate(checkin.timestamp), cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[0].width;
            
            doc.text(checkin.session || 'N/A', cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[1].width;
            
            doc.text(checkin.instructor_id || 'N/A', cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[2].width;
            
            doc.text(checkin.student_name || 'N/A', cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[3].width;
            
            doc.text(checkin.student_id || 'N/A', cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[4].width;
            
            doc.text(checkin.car_plate || 'N/A', cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[5].width;
            
            doc.text(checkin.duration ? checkin.duration + 'h' : 'N/A', cellX, yPosition + 5);
            cellX += TABLE_COLUMNS[6].width;
            
            const timeRange = checkin.start_time && checkin.end_time ? 
                `${checkin.start_time} - ${checkin.end_time}` : 'N/A';
            doc.text(timeRange, cellX, yPosition + 5);
            
            yPosition += rowHeight;
        });
        
        // --- Page numbers ---
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 15, 290);
        }
        
        resolve(doc);
    });
}

/**
 * Download the current PDF
 */
function downloadPDF() {
    if (!State.currentPDF) {
        alert('No PDF generated yet');
        return;
    }
    const fileName = `driving-lessons-report-${getMalaysiaDate()}.pdf`;
    State.currentPDF.save(fileName);
    closePDFPreview();
}

/**
 * Close PDF preview modal
 */
function closePDFPreview() {
    DOM.pdfModal.classList.add('hidden');
    
    // Clean up blob URL
    const iframe = DOM.pdfIframe;
    if (iframe && iframe.src && iframe.src.startsWith('blob:')) {
        URL.revokeObjectURL(iframe.src);
    }
    State.currentPDF = null;
}

// ============================================
// AUTO-REFRESH
// ============================================

/**
 * Start auto-refresh timer
 */
function startAutoRefresh() {
    if (State.refreshTimer) {
        clearInterval(State.refreshTimer);
    }
    State.refreshTimer = setInterval(loadCheckins, CONFIG.AUTO_REFRESH_INTERVAL);
}

/**
 * Stop auto-refresh timer
 */
function stopAutoRefresh() {
    if (State.refreshTimer) {
        clearInterval(State.refreshTimer);
        State.refreshTimer = null;
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application
 */
function init() {
    // Initialize date mode with Malaysia timezone
    initDateMode();
    
    // Set up uppercase conversion on text inputs
    document.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('input', function() {
            forceUppercase(this);
        });
    });
    
    // Set up date mode radio listeners
    document.querySelectorAll('input[name="dateMode"]').forEach(radio => {
        radio.addEventListener('change', toggleDateMode);
    });
    
    // Load initial data
    loadCheckins();
    
    // Start auto-refresh
    startAutoRefresh();
    
    console.log('Admin Report initialized successfully (Malaysia Timezone)');
    console.log(`Timezone: ${CONFIG.TIMEZONE}`);
    console.log(`Auto-refresh interval: ${CONFIG.AUTO_REFRESH_INTERVAL / 1000} seconds`);
}

// ============================================
// EXPOSE GLOBAL FUNCTIONS (for HTML onclick)
// ============================================
window.loadCheckins = loadCheckins;
window.clearFilters = clearFilters;
window.toggleDateMode = toggleDateMode;
window.generatePDFPreview = generatePDFPreview;
window.downloadPDF = downloadPDF;
window.closePDFPreview = closePDFPreview;

// ============================================
// START APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', init);

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});
