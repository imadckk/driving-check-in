// Configuration - Use same Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let allCheckins = [];
let currentPDF = null;
const { jsPDF } = window.jspdf;

// Sync date picker to device date
function syncDateToDevice() {
    const dateFilter = document.getElementById('date-filter');
    const deviceDate = new Date().toISOString().split('T')[0];
    
    // If no date is selected, default to device date
    if (!dateFilter.value) {
        dateFilter.value = deviceDate;
    }
}

// Force uppercase for all text inputs
function forceUppercase(input) {
    input.value = input.value.toUpperCase();
}

// Initialize uppercase behavior for all text inputs
function initializeUppercaseInputs() {
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        // Set current value to uppercase
        input.value = input.value.toUpperCase();
        
        // Add event listener for future input
        input.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    
     // Set today's date as default filter using device date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-filter').value = today;
    
    // Initialize uppercase inputs
    initializeUppercaseInputs();
    
    // Auto-refresh every 30 seconds
    setInterval(loadCheckins, 30000);
});

async function loadCheckins() {
    showLoading(true);
    
    try {
        let url = `${SUPABASE_URL}/rest/v1/check_ins?select=*&order=timestamp.desc`;
        
        // Apply filters
        const dateFilter = document.getElementById('date-filter').value;
        const instructorFilter = document.getElementById('instructor-filter').value;
        const carFilter = document.getElementById('car-filter').value;
        const sessionFilter = document.getElementById('session-filter').value; 
        
        if (dateFilter) {
            const nextDay = new Date(dateFilter);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];
            
            url += `&timestamp=gte.${dateFilter}T00:00:00&timestamp=lt.${nextDayStr}T00:00:00`;
        }
        
        if (instructorFilter) {
            url += `&instructor_id=eq.${encodeURIComponent(instructorFilter)}`;
        }
        
        if (carFilter) {
            url += `&car_plate=eq.${encodeURIComponent(carFilter)}`;
        }

        if (sessionFilter) { 
            url += `&session=eq.${encodeURIComponent(sessionFilter)}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            allCheckins = await response.json();
            displayCheckins();
            updateStats();
            document.getElementById('last-updated').textContent = new Date().toLocaleString();
        } else {
            throw new Error('Failed to fetch data');
        }
    } catch (error) {
        console.error('Error loading check-ins:', error);
        alert('Failed to load check-ins. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayCheckins() {
    const tableBody = document.getElementById('checkins-table');
    const mobileCards = document.getElementById('mobile-cards');
    const noDataMessage = document.getElementById('no-data-message');
    
    if (allCheckins.length === 0) {
        tableBody.innerHTML = '';
        mobileCards.innerHTML = '';
        noDataMessage.classList.remove('hidden');
        return;
    }
    
    noDataMessage.classList.add('hidden');
    
    // Desktop Table
    tableBody.innerHTML = allCheckins.map(checkin => `
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
    
    // Mobile Cards
    mobileCards.innerHTML = allCheckins.map(checkin => `
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
    document.getElementById('total-checkins').textContent = allCheckins.length;
}

function clearFilters() {
    document.getElementById('date-filter').value = '';
    document.getElementById('instructor-filter').value = '';
    document.getElementById('car-filter').value = '';
    document.getElementById('session-filter').value = ''; 
    // Sync to device date after clearing
    setTimeout(syncDateToDevice, 100);
    loadCheckins();
}

function showLoading(show) {
    const loading = document.getElementById('loading-message');
    const tableBody = document.getElementById('checkins-table');
    const mobileCards = document.getElementById('mobile-cards');
    
    if (show) {
        loading.classList.remove('hidden');
        tableBody.innerHTML = '';
        mobileCards.innerHTML = '';
    } else {
        loading.classList.add('hidden');
    }
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Convert ISO timestamp to DD/MM/YYYY HH:MM:SS format
function formatToLocalDateTime(isoString) {
    const date = new Date(isoString);
    
    // Get individual date components
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    
    // Get 12-hour format time with AM/PM
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    hours = String(hours).padStart(2, '0');
    
    // Format as DD/MM/YYYY HH:MM AM/PM
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

// Format date only (for filtering)
function formatToLocalDate(isoString) {
    const date = new Date(isoString);
    
    // Get individual date components
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    
    // Format as DD/MM/YYYY
    return `${day}/${month}/${year}`;
}
// Generate PDF and show preview
async function generatePDFPreview() {
    if (allCheckins.length === 0) {
        alert('No data to generate PDF');
        return;
    }

    // Show loading state in modal
    document.getElementById('pdf-preview-modal').classList.remove('hidden');
    document.getElementById('pdf-preview-content').innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Generating PDF preview...</p>
            </div>
        </div>
    `;

    try {
        // Generate PDF
        currentPDF = await createPDF();
        
        // Convert PDF to blob for preview
        const pdfBlob = currentPDF.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Display PDF in iframe
        document.getElementById('pdf-preview-content').innerHTML = `
            <iframe src="${pdfUrl}" class="w-full h-full border-0" id="pdf-iframe"></iframe>
        `;
        
    } catch (error) {
        console.error('Error generating PDF preview:', error);
        document.getElementById('pdf-preview-content').innerHTML = `
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
    }
}

// Create PDF document
function createPDF() {
    return new Promise((resolve) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // === COLOR CONFIGURATION ===
        const colors = {
            headerBg: [59, 130, 246],
            headerText: [255, 255, 255],
            evenRowBg: [249, 250, 251],
            oddRowBg: [255, 255, 255],
            text: [0, 0, 0],
            title: [31, 41, 55],
            summary: [59, 130, 246]
        };

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.title[0], colors.title[1], colors.title[2]);
        doc.text('Driving Lesson Check-In Report', margin, 20);

        // Date range and filters
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const dateFilter = document.getElementById('date-filter').value;
        const instructorFilter = document.getElementById('instructor-filter').value;
        const carFilter = document.getElementById('car-filter').value;
        const sessionFilter = document.getElementById('session-filter').value;
        
        let filterText = `Generated: ${new Date().toLocaleString()}`;
        if (dateFilter) filterText += ` | Date: ${dateFilter}`;
        if (instructorFilter) filterText += ` | Instructor: ${instructorFilter}`;
        if (carFilter) filterText += ` | Car: ${carFilter}`;
        if (sessionFilter) filterText += ` | Session: ${sessionFilter}`;
        
        doc.text(filterText, margin, 28);

        // Summary box
        doc.setFillColor(colors.summary[0], colors.summary[1], colors.summary[2]);
        doc.rect(margin, 33, 50, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Total: ${allCheckins.length}`, margin + 5, 39);

        // Reset text color for table
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

        // Table setup - Use auto column widths
        const columnConfig = [
            { header: 'Date', width: 22 },      // Reduced from 25
            { header: 'Session', width: 12 },   // Same
            { header: 'Instructor', width: 18 }, // Reduced from 20
            { header: 'Student', width: 39 },   // Reduced from 25
            { header: 'Student ID', width: 25 }, // Increased from 20
            { header: 'Car Plate', width: 18 }, // Increased from 15
            { header: 'Duration', width: 15 },  // Same
            { header: 'Time Range', width: 25 } // Increased from 25
        ];

        const rowHeight = 8;
        let yPosition = 50;

        // Draw table headers
        doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
        doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.headerText[0], colors.headerText[1], colors.headerText[2]);
        
        let xPosition = margin + 1;
        columnConfig.forEach((col, index) => {
            doc.text(col.header, xPosition, yPosition + 5);
            xPosition += col.width;
        });

        yPosition += rowHeight;

        // Table rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);

        allCheckins.forEach((checkin, index) => {
            // Check if we need a new page
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
                
                // Redraw headers on new page
                doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
                doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(colors.headerText[0], colors.headerText[1], colors.headerText[2]);
                
                let xPos = margin + 1;
                columnConfig.forEach(col => {
                    doc.text(col.header, xPos, yPosition + 5);
                    xPos += col.width;
                });

                yPosition += rowHeight;
            }

            // Alternate row background
            const isEvenRow = index % 2 === 0;
            if (isEvenRow) {
                doc.setFillColor(colors.evenRowBg[0], colors.evenRowBg[1], colors.evenRowBg[2]);
            } else {
                doc.setFillColor(colors.oddRowBg[0], colors.oddRowBg[1], colors.oddRowBg[2]);
            }
            doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');

            // Row text
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            
            let cellX = margin + 1;
            
            // Time column - Show only time (not full date)
            const timeText = new Date(checkin.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            doc.text(timeText, cellX, yPosition + 5);
            cellX += columnConfig[0].width;

            // Date column - Show date in DD/MM/YYYY format
            const dateText = formatToLocalDate(checkin.timestamp);
            doc.text(dateText, cellX, yPosition + 5);
            cellX += columnConfig[0].width;
            
            // Session column
            doc.text(checkin.session || 'N/A', cellX, yPosition + 5);
            cellX += columnConfig[1].width;
            
            // Instructor column - No truncation
            doc.text(checkin.instructor_id || 'N/A', cellX, yPosition + 5);
            cellX += columnConfig[2].width;
            
            // Student Name column - No truncation
            doc.text(checkin.student_name || 'N/A', cellX, yPosition + 5);
            cellX += columnConfig[3].width;
            
            // Student ID column - No truncation, full display
            doc.text(checkin.student_id || 'N/A', cellX, yPosition + 5);
            cellX += columnConfig[4].width;
            
            // Car Plate column - No truncation, full display
            doc.text(checkin.car_plate || 'N/A', cellX, yPosition + 5);
            cellX += columnConfig[5].width;
            
            // Duration column
            doc.text(checkin.duration ? checkin.duration + 'h' : 'N/A', cellX, yPosition + 5);
            cellX += columnConfig[6].width;
            
            // Time Range column - No truncation, full display
            const timeRange = checkin.start_time && checkin.end_time ? 
                `${checkin.start_time} - ${checkin.end_time}` : 'N/A';
            doc.text(timeRange, cellX, yPosition + 5);

            yPosition += rowHeight;
        });

        // Add page numbers
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

// Download the current PDF
function downloadPDF() {
    if (!currentPDF) {
        alert('No PDF generated yet');
        return;
    }
    
    const fileName = `driving-lessons-report-${new Date().toISOString().split('T')[0]}.pdf`;
    currentPDF.save(fileName);
    closePDFPreview();
}

// Close PDF preview modal
function closePDFPreview() {
    document.getElementById('pdf-preview-modal').classList.add('hidden');
    
    // Clean up blob URLs to prevent memory leaks
    const iframe = document.getElementById('pdf-iframe');
    if (iframe) {
        const src = iframe.src;
        if (src.startsWith('blob:')) {
            URL.revokeObjectURL(src);
        }
    }
    
    currentPDF = null;
}



// Alternative: Generate PDF using HTML content for better styling (optional)
async function generateStyledPDFPreview() {
    if (allCheckins.length === 0) {
        alert('No data to generate PDF');
        return;
    }

    document.getElementById('pdf-preview-modal').classList.remove('hidden');
    document.getElementById('pdf-preview-content').innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Generating styled PDF preview...</p>
            </div>
        </div>
    `;

    try {
        // Create a temporary div with the report content
        const reportDiv = document.createElement('div');
        reportDiv.style.padding = '20px';
        reportDiv.style.backgroundColor = 'white';
        reportDiv.style.fontFamily = 'Arial, sans-serif';
        reportDiv.style.width = '210mm'; // A4 width
        reportDiv.style.minHeight = '297mm'; // A4 height
        
        const dateFilter = document.getElementById('date-filter').value;
        const instructorFilter = document.getElementById('instructor-filter').value;
        const carFilter = document.getElementById('car-filter').value;

        reportDiv.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
                    Driving Lesson Check-In Report
                </h1>
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px;">
                    Generated: ${new Date().toLocaleString()}
                    ${dateFilter ? ` | Date: ${dateFilter}` : ''}
                    ${instructorFilter ? ` | Instructor: ${instructorFilter}` : ''}
                    ${carFilter ? ` | Car: ${carFilter}` : ''}
                </p>
                <div style="background: #3b82f6; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 18px; font-weight: bold;">Total Check-Ins: ${allCheckins.length}</div>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Time</th>
                        <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Instructor</th>
                        <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Student</th>
                        <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Student ID</th>
                        <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Car Plate</th>
                    </tr>
                </thead>
                <tbody>
                    ${allCheckins.map((checkin, index) => `
                        <tr style="${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                            <td style="border: 1px solid #d1d5db; padding: 6px;">${formatToLocalDateTime(checkin.timestamp)}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px;">${escapeHtml(checkin.instructor_id)}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px;">${escapeHtml(checkin.student_name)}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px;">${escapeHtml(checkin.student_id)}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px;">${escapeHtml(checkin.car_plate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.body.appendChild(reportDiv);

        const canvas = await html2canvas(reportDiv, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        document.body.removeChild(reportDiv);

        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Calculate dimensions to fit the image on the page
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        const pdfWidth = pageWidth - 20; // margin
        const pdfHeight = pdfWidth / ratio;
        
        doc.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
        
        currentPDF = doc;
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        document.getElementById('pdf-preview-content').innerHTML = `
            <iframe src="${pdfUrl}" class="w-full h-full border-0" id="pdf-iframe"></iframe>
        `;
        
    } catch (error) {
        console.error('Error generating styled PDF:', error);
        document.getElementById('pdf-preview-content').innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center text-red-600">
                    <p>Error generating PDF preview</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            </div>
        `;
    }
}
