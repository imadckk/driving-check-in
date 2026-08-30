// Configuration
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let currentStudentId = '';
let currentCheckins = [];
let instructorCache = {};

// Search on Enter key
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-student-id');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchStudent();
            }
        });
    }

    // Auto-search if URL has student_id parameter
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student_id');
    if (studentId) {
        document.getElementById('search-student-id').value = studentId;
        searchStudent();
    }
});

/**
 * Search for student records
 */
async function searchStudent() {
    const studentId = document.getElementById('search-student-id').value.trim().toUpperCase();
    
    if (!studentId) {
        showToast('Please enter a student IC number', 'warning');
        return;
    }

    if (studentId.length < 4) {
        showToast('Please enter at least 4 characters', 'warning');
        return;
    }

    currentStudentId = studentId;
    
    // Show loading
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('student-info').classList.add('hidden');
    document.getElementById('table-container').classList.add('hidden');
    document.getElementById('no-results').classList.add('hidden');

    try {
        // Fetch check-ins and instructor data in parallel
        const [checkins, instructorMap] = await Promise.all([
            fetchStudentCheckins(studentId),
            fetchAllInstructors()
        ]);
        
        // Cache instructors
        instructorCache = instructorMap;
        
        // Map instructor ICs to checkins
        const checkinsWithInstructor = checkins.map(checkin => {
            const instructor = instructorCache[checkin.instructor_id];
            return {
                ...checkin,
                instructor_ic: instructor ? instructor.icno : checkin.instructor_id
            };
        });
        
        currentCheckins = checkinsWithInstructor;
        
        if (checkinsWithInstructor.length === 0) {
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('no-results').classList.remove('hidden');
            return;
        }

        // Update student info
        displayStudentInfo(checkinsWithInstructor);
        
        // Populate table
        populateTable(checkinsWithInstructor);
        
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('student-info').classList.remove('hidden');
        document.getElementById('table-container').classList.remove('hidden');

    } catch (error) {
        console.error('Error searching:', error);
        document.getElementById('loading-state').classList.add('hidden');
        showToast('Error loading records. Please try again.', 'error');
    }
}

/**
 * Fetch student check-ins from Supabase
 */
async function fetchStudentCheckins(studentId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/check_ins?student_id=eq.${encodeURIComponent(studentId)}&session=eq.KPP03&order=timestamp.asc`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch records');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching checkins:', error);
        throw error;
    }
}

/**
 * Fetch all instructors from agents table
 */
async function fetchAllInstructors() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/agents?select=instructor_id,icno,agent_name`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch instructors');
        }

        const data = await response.json();
        const map = {};
        data.forEach(agent => {
            map[agent.instructor_id] = {
                icno: agent.icno || agent.instructor_id,
                name: agent.agent_name
            };
        });
        return map;
    } catch (error) {
        console.error('Error fetching instructors:', error);
        return {};
    }
}

/**
 * Display student information summary
 */
function displayStudentInfo(checkins) {
    const studentName = checkins[0]?.student_name || 'N/A';
    const studentId = checkins[0]?.student_id || 'N/A';
    const totalLessons = checkins.length;
    const totalHours = checkins.reduce((sum, c) => sum + parseFloat(c.duration || 0), 0);

    document.getElementById('student-name-display').textContent = studentName;
    document.getElementById('student-id-display').textContent = studentId;
    document.getElementById('total-lessons-display').textContent = totalLessons;
    document.getElementById('total-hours-display').textContent = totalHours.toFixed(1);
}

/**
 * Populate the lesson table
 */
function populateTable(checkins) {
    const tbody = document.getElementById('table-body');
    const maxRows = 10;
    let html = '';
    
    for (let i = 0; i < maxRows; i++) {
        if (i < checkins.length) {
            const checkin = checkins[i];
            const date = new Date(checkin.timestamp);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Get instructor IC from cached data
            const instructorIc = checkin.instructor_ic || checkin.instructor_id || '-';
            
            html += `
                <tr class="filled-cell">
                    <td>${formattedDate}</td>
                    <td>${checkin.start_time || '-'}</td>
                    <td>${checkin.end_time || '-'}</td>
                    <td>${checkin.car_plate || '-'}</td>
                    <td>${checkin.duration || 0}</td>
                    <td><strong>KPP03</strong></td>
                    <td class="signature-cell"></td>
                    <td>${instructorIc}</td>
                    <td class="signature-cell"></td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                    <td class="empty-cell"></td>
                </tr>
            `;
        }
    }

    tbody.innerHTML = html;
}

/**
 * Clear search results
 */
function clearSearch() {
    document.getElementById('search-student-id').value = '';
    document.getElementById('student-info').classList.add('hidden');
    document.getElementById('table-container').classList.add('hidden');
    document.getElementById('no-results').classList.add('hidden');
    document.getElementById('loading-state').classList.add('hidden');
    currentStudentId = '';
    currentCheckins = [];
    
    // Reset checkboxes
    document.getElementById('declaration-competency').checked = false;
    document.getElementById('declaration-retraining').checked = false;
    document.getElementById('declaration-confirm').checked = false;
}

/**
 * Print the record
 */
function printRecord() {
    if (currentCheckins.length === 0) {
        showToast('No records to print', 'warning');
        return;
    }
    showPrintModal();
}

/**
 * Show print confirmation modal
 */
function showPrintModal() {
    const modal = document.getElementById('print-modal');
    modal.classList.remove('hidden');
    const content = modal.querySelector('.modal-mobile');
    if (content) {
        setTimeout(() => content.classList.add('active'), 10);
    }
}

/**
 * Close print modal
 */
function closePrintModal() {
    const modal = document.getElementById('print-modal');
    const content = modal.querySelector('.modal-mobile');
    if (content) {
        content.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    } else {
        modal.classList.add('hidden');
    }
}

/**
 * Confirm and execute print
 */
function confirmPrint() {
    closePrintModal();
    setTimeout(() => {
        window.print();
    }, 300);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const colors = {
        info: 'bg-blue-100 border-blue-500 text-blue-800',
        success: 'bg-green-100 border-green-500 text-green-800',
        warning: 'bg-amber-100 border-amber-500 text-amber-800',
        error: 'bg-red-100 border-red-500 text-red-800'
    };

    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-4 right-4 z-50 border-l-4 p-4 rounded-lg shadow-lg transition-all duration-300 ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <div class="flex items-start">
            <div class="flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Toggle declaration checkboxes state
 */
function toggleDeclaration() {
    // This function can be expanded if needed
    console.log('Declaration updated');
}

// Export functions for HTML onclick
window.searchStudent = searchStudent;
window.clearSearch = clearSearch;
window.printRecord = printRecord;
window.closePrintModal = closePrintModal;
window.confirmPrint = confirmPrint;
window.showToast = showToast;
