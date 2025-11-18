// Configuration - Use same Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let allCheckins = [];
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', function() {
    loadCheckins();
    
    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-filter').value = today;
    
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
        </tr>
    `).join('');
    
    // Mobile Cards
    mobileCards.innerHTML = allCheckins.map(checkin => `
        <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div class="flex justify-between items-start mb-2">
                <div class="text-sm text-gray-500">${formatToLocalDateTime(checkin.timestamp)}</div>
                <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                    ${escapeHtml(checkin.car_plate)}
                </span>
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

// Convert ISO timestamp to device's local date and time
function formatToLocalDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

// Format date only (for filtering)
function formatToLocalDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString();
}

function generatePDF() {
    if (allCheckins.length === 0) {
        alert('No data to generate PDF');
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Driving Lesson Check-In Report', margin, 25);

    // Date range and filters
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateFilter = document.getElementById('date-filter').value;
    const instructorFilter = document.getElementById('instructor-filter').value;
    const carFilter = document.getElementById('car-filter').value;
    
    let filterText = `Generated: ${new Date().toLocaleString()}`;
    if (dateFilter) filterText += ` | Date: ${dateFilter}`;
    if (instructorFilter) filterText += ` | Instructor: ${instructorFilter}`;
    if (carFilter) filterText += ` | Car: ${carFilter}`;
    
    doc.text(filterText, margin, 35);

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Check-Ins: ${allCheckins.length}`, margin, 50);

    // Table headers
    let yPosition = 65;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, contentWidth, 10, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Time', margin + 2, yPosition + 7);
    doc.text('Instructor', margin + 40, yPosition + 7);
    doc.text('Student', margin + 80, yPosition + 7);
    doc.text('Student ID', margin + 120, yPosition + 7);
    doc.text('Car Plate', margin + 160, yPosition + 7);

    yPosition += 12;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    allCheckins.forEach((checkin, index) => {
        // Check if we need a new page
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
            
            // Add header on new page
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Time', margin + 2, yPosition);
            doc.text('Instructor', margin + 40, yPosition);
            doc.text('Student', margin + 80, yPosition);
            doc.text('Student ID', margin + 120, yPosition);
            doc.text('Car Plate', margin + 160, yPosition);
            yPosition += 10;
        }

        // Alternate row background
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPosition - 4, contentWidth, 8, 'F');
        }

        doc.text(formatToLocalDateTime(checkin.timestamp), margin + 2, yPosition);
        doc.text(truncateText(checkin.instructor_id, 15), margin + 40, yPosition);
        doc.text(truncateText(checkin.student_name, 15), margin + 80, yPosition);
        doc.text(truncateText(checkin.student_id, 15), margin + 120, yPosition);
        doc.text(truncateText(checkin.car_plate, 10), margin + 160, yPosition);

        yPosition += 8;
    });

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, 290);
    }

    // Save the PDF
    const fileName = `driving-lessons-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
