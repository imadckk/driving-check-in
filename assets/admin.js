/**
 * Admin Report - Driving School
 * Version 3.0 - Fixed date filtering
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    SUPABASE_URL: 'https://dorkygsgobhcagtqydjb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0',
    AUTO_REFRESH_INTERVAL: 30000,
    TIMEZONE: 'Asia/Kuala_Lumpur'
};

// ============================================
// STATE MANAGEMENT
// ============================================
const State = {
    checkins: [],
    agents: {},
    currentPDF: null,
    isLoading: false,
    refreshTimer: null,
    pdfLibraryLoaded: false
};

// ============================================
// DOM REFERENCES
// ============================================
const DOM = {
    totalCheckins: document.getElementById('total-checkins'),
    totalAgents: document.getElementById('total-agents'),
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
// TIMEZONE UTILITY FUNCTIONS (FIXED)
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

/**
 * FIXED: Get date range in Malaysia timezone
 * This properly handles the date filtering for Supabase
 */
function getMalaysiaDateRange(dateStr) {
    // Malaysia is UTC+8
    // To query a full day in Malaysia timezone, we need to query:
    // Start: previous day 16:00 UTC (which is 00:00 MYT)
    // End: current day 15:59:59 UTC (which is 23:59:59 MYT)
    
    const date = new Date(dateStr + 'T00:00:00+08:00');
    
    // Start of day in Malaysia (00:00:00 MYT)
    const startUTC = new Date(date);
    startUTC.setHours(16, 0, 0, 0);
    startUTC.setDate(startUTC.getDate() - 1); // Previous day 16:00 UTC
    
    // End of day in Malaysia (23:59:59 MYT)
    const endUTC = new Date(date);
    endUTC.setHours(15, 59, 59, 999);
    // Keep the same day for end
    
    console.log('Date filter:', dateStr);
    console.log('UTC start:', startUTC.toISOString());
    console.log('UTC end:', endUTC.toISOString());
    
    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

/**
 * FIXED: Get date range extended in Malaysia timezone
 */
function getMalaysiaDateRangeExtended(fromDate, toDate) {
    const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
    
    // Start of from date in Malaysia (00:00:00)
    const startUTC = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0));
    startUTC.setHours(startUTC.getHours() - 8);
    
    // End of to date in Malaysia (23:59:59.999)
    const endUTC = new Date(Date.UTC(toYear, toMonth - 1, toDay, 23, 59, 59, 999));
    endUTC.setHours(endUTC.getHours() - 8);
    
    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

/**
 * Format date from YYYY-MM-DD to DD-MM-YYYY
 */
function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
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

/**
 * Get date key for grouping
 */
function getDateKey(isoString) {
    const date = new Date(isoString);
    const malaysiaTime = new Date(date.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    const day = String(malaysiaTime.getDate()).padStart(2, '0');
    const month = String(malaysiaTime.getMonth() + 1).padStart(2, '0');
    const year = malaysiaTime.getFullYear();
    return `${year}-${month}-${day}`;
}

function sanitizeForPDF(text) {
    if (text == null) return 'N/A';
    let clean = String(text);
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
// AGENT MANAGEMENT
// ============================================

async function loadAgents() {
    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/agents?select=*`, {
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const agents = await response.json();
            State.agents = {};
            agents.forEach(agent => {
                State.agents[agent.instructor_id] = agent.agent_name;
            });
            updateAgentStats();
        }
    } catch (error) {
        console.error('Error loading agents:', error);
    }
}

function getAgentName(instructorId) {
    return State.agents[instructorId] || 'Not Registered';
}

function hasAgentName(instructorId) {
    return State.agents[instructorId] !== undefined && State.agents[instructorId] !== null;
}

function updateAgentStats() {
    const count = Object.keys(State.agents).length;
    if (DOM.totalAgents) {
        DOM.totalAgents.textContent = count;
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
// DATA LOADING (FIXED)
// ============================================

function buildQueryURL() {
    let url = `${CONFIG.SUPABASE_URL}/rest/v1/check_ins?select=*&order=timestamp.desc`;
    const mode = getDateMode();
    
    if (mode === 'single') {
        const dateVal = DOM.dateFilter.value;
        if (dateVal) {
            const range = getMalaysiaDateRange(dateVal);
            // Use the UTC range for Supabase query
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
    
    console.log('Query URL:', url);
    return url;
}

async function loadCheckins() {
    if (State.isLoading) return;
    
    State.isLoading = true;
    showLoading(true);
    
    try {
        if (Object.keys(State.agents).length === 0) {
            await loadAgents();
        }
        
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
        
        // Debug: Log the first few records to see the dates
        if (State.checkins.length > 0) {
            console.log('First 3 records timestamps:');
            State.checkins.slice(0, 3).forEach((c, i) => {
                console.log(`Record ${i + 1}:`, c.timestamp);
                console.log(`  Malaysia date:`, formatToLocalDateTime(c.timestamp));
            });
        }
        
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
    
    DOM.tableBody.innerHTML = checkins.map(checkin => {
        const agentName = getAgentName(checkin.instructor_id);
        const hasName = hasAgentName(checkin.instructor_id);
        return `
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
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${escapeHtml(checkin.instructor_id)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span class="${hasName ? 'text-green-600' : 'text-red-500'}">
                    ${escapeHtml(agentName)}
                    ${!hasName ? ' ⚠️' : ''}
                </span>
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
    `}).join('');
    
    DOM.mobileCards.innerHTML = checkins.map(checkin => {
        const agentName = getAgentName(checkin.instructor_id);
        const hasName = hasAgentName(checkin.instructor_id);
        return `
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
                <div>
                    <div class="text-xs text-gray-500">Agent Name</div>
                    <div class="font-medium ${hasName ? 'text-green-600' : 'text-red-500'}">
                        ${escapeHtml(agentName)}
                        ${!hasName ? ' ⚠️' : ''}
                    </div>
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
    `}).join('');
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
// PDF GENERATION
// ============================================

function isJsPDFLoaded() {
    return typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined';
}

function getJsPDF() {
    if (isJsPDFLoaded()) {
        return window.jspdf.jsPDF;
    }
    if (typeof jsPDF !== 'undefined') {
        return jsPDF;
    }
    return null;
}

async function generatePDFPreview() {
    if (State.checkins.length === 0) {
        alert('No data to generate PDF');
        return;
    }

    if (!isJsPDFLoaded()) {
        alert('PDF library is still loading. Please wait a moment and try again.');
        try {
            await loadJsPDFLibrary();
        } catch (error) {
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

function retryPDFGeneration() {
    generatePDFPreview();
}

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
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text('Driving Lesson Check-In Report', margin, 20);
            
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
            
            doc.setFillColor(59, 130, 246);
            doc.rect(margin, 33, 50, 8, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`Total: ${State.checkins.length}`, margin + 5, 39);
            
            const groupedData = groupCheckinsByDate(State.checkins);
            const dateKeys = Object.keys(groupedData);
            
            const columnConfig = [
                { header: 'Session', width: 15 },
                { header: 'Instructor', width: 18 },
                { header: 'Agent Name', width: 25 },
                { header: 'Student', width: 30 },
                { header: 'Student ID', width: 20 },
                { header: 'Car Plate', width: 18 },
                { header: 'Duration', width: 15 },
                { header: 'Time Range', width: 25 }
            ];
            
            const rowHeight = 8;
            let yPosition = 50;
            
            dateKeys.forEach((dateKey) => {
                const checkinsForDate = groupedData[dateKey];
                const dateDisplay = formatDateDisplay(dateKey);
                
                if (yPosition > 260) {
                    doc.addPage();
                    yPosition = 20;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                }
                
                doc.setFillColor(243, 244, 246);
                doc.rect(margin, yPosition, contentWidth, rowHeight + 2, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(31, 41, 55);
                doc.text(`Date: ${dateDisplay} (${checkinsForDate.length} records)`, margin + 5, yPosition + 6);
                yPosition += rowHeight + 2;
                
                if (yPosition > 260) {
                    doc.addPage();
                    yPosition = 20;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                }
                
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
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6);
                doc.setTextColor(0, 0, 0);
                
                checkinsForDate.forEach((checkin, index) => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(0, 0, 0);
                        
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
                        
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6);
                        doc.setTextColor(0, 0, 0);
                    }
                    
                    const isEven = index % 2 === 0;
                    doc.setFillColor(isEven ? 249 : 255, isEven ? 250 : 255, isEven ? 251 : 255);
                    doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                    
                    const agentName = getAgentName(checkin.instructor_id);
                    
                    let cellX = margin + 1;
                    
                    doc.text(sanitizeForPDF(checkin.session || 'N/A'), cellX, yPosition + 5);
                    cellX += columnConfig[0].width;
                    
                    doc.text(sanitizeForPDF(checkin.instructor_id || 'N/A'), cellX, yPosition + 5);
                    cellX += columnConfig[1].width;
                    
                    doc.text(sanitizeForPDF(agentName), cellX, yPosition + 5);
                    cellX += columnConfig[2].width;
                    
                    doc.text(sanitizeForPDF(checkin.student_name || 'N/A'), cellX, yPosition + 5);
                    cellX += columnConfig[3].width;
                    
                    doc.text(sanitizeForPDF(checkin.student_id || 'N/A'), cellX, yPosition + 5);
                    cellX += columnConfig[4].width;
                    
                    doc.text(sanitizeForPDF(checkin.car_plate || 'N/A'), cellX, yPosition + 5);
                    cellX += columnConfig[5].width;
                    
                    doc.text(checkin.duration ? sanitizeForPDF(checkin.duration + 'h') : 'N/A', cellX, yPosition + 5);
                    cellX += columnConfig[6].width;
                    
                    const timeRange = checkin.start_time && checkin.end_time ? 
                        `${checkin.start_time} - ${checkin.end_time}` : 'N/A';
                    doc.text(sanitizeForPDF(timeRange), cellX, yPosition + 5);
                    
                    yPosition += rowHeight;
                });
                
                yPosition += 4;
            });
            
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

function groupCheckinsByDate(checkins) {
    const grouped = {};
    checkins.forEach(checkin => {
        const dateKey = getDateKey(checkin.timestamp);
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(checkin);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const result = {};
    sortedDates.forEach(date => {
        result[date] = grouped[date];
    });
    return result;
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
            console.warn('jsPDF not loaded after 5 seconds');
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
    
    loadAgents();
    loadCheckins();
    startAutoRefresh();
    
    console.log('Admin Report initialized successfully (Malaysia Timezone)');
    console.log(`Timezone: ${CONFIG.TIMEZONE}`);
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
