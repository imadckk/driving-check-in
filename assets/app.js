// Configuration - Replace with your Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let pendingCheckins = JSON.parse(localStorage.getItem('pendingCheckins') || '[]');
let pendingFormData = null; // Store form data when duplicate is detected
let duplicateCheckTimeout = null; // For debouncing duplicate checks
let currentDuplicateWarning = null; // Track current duplicate warning

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get car plate from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const carPlate = urlParams.get('car');
    
    if (carPlate) {
        setCarPlate(carPlate);
    }
    initializeSessionToggle();
    initializeDuplicateCheck();
    initializeFormSubmitHandling();

    // Load pending check-ins count
    updatePendingCount();
});

// Function to set car plate display
function setCarPlate(plate) {
    const plateInput = document.getElementById('car-plate');
    const headerPlateText = document.getElementById('header-plate-text');
    
    if (plateInput) {
        plateInput.value = plate;
    }
    
    if (headerPlateText) {
        headerPlateText.textContent = plate || '---';
    }
}

// Add after the configuration section
function formatTimeAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutes} ${ampm}`;
}

function calculateEndTime(startTime, durationHours) {
    const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000));
    return endTime;
}

function updateTotalTimeDisplay() {
    const durationSelect = document.getElementById('duration');
    const totalTimeDisplay = document.getElementById('total-time-display');
    const timeDisplayContainer = document.getElementById('time-display-container');
    
    if (durationSelect.value) {
        const now = new Date();
        const duration = parseFloat(durationSelect.value);
        const endTime = calculateEndTime(now, duration);
        
        const startTimeFormatted = formatTimeAMPM(now);
        const endTimeFormatted = formatTimeAMPM(endTime);
        
        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = `${startTimeFormatted} - ${endTimeFormatted}`;
        }
        
        if (timeDisplayContainer) {
            timeDisplayContainer.classList.remove('hidden');
        }
    } else {
        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = 'Select duration to see time range';
        }
        
        if (timeDisplayContainer) {
            timeDisplayContainer.classList.add('hidden');
        }
    }
}

// Initialize session toggle
function initializeSessionToggle() {
    const sessionRadios = document.querySelectorAll('input[name="session"]');
    
    sessionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            console.log('Session selected:', this.value);
        });
        
        // Add keyboard navigation
        radio.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const currentIndex = Array.from(sessionRadios).indexOf(this);
                const nextIndex = e.key === 'ArrowRight' 
                    ? (currentIndex + 1) % sessionRadios.length 
                    : (currentIndex - 1 + sessionRadios.length) % sessionRadios.length;
                sessionRadios[nextIndex].checked = true;
                sessionRadios[nextIndex].focus();
            }
        });
    });
    
    // Set default to KPP02
    if (!document.querySelector('input[name="session"]:checked')) {
        const kpp02 = document.getElementById('session-kpp02');
        if (kpp02) {
            kpp02.checked = true;
        }
    }
}

// Initialize real-time duplicate checking
function initializeDuplicateCheck() {
    const studentIdInput = document.getElementById('student-id');
    if (!studentIdInput) return;
    
    const studentIdContainer = studentIdInput.parentElement;
    
    // Create warning element if it doesn't exist
    if (!document.getElementById('duplicate-warning')) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'duplicate-warning';
        warningDiv.className = 'hidden';
        studentIdContainer.appendChild(warningDiv);
    }
    
    studentIdInput.addEventListener('input', function() {
        const studentId = this.value.trim();
        
        // Clear previous timeout
        if (duplicateCheckTimeout) {
            clearTimeout(duplicateCheckTimeout);
        }
        
        // Hide warning if input is too short
        if (studentId.length < 4) {
            hideDuplicateWarning();
            return;
        }
        
        // Debounce: wait 500ms after user stops typing
        duplicateCheckTimeout = setTimeout(async () => {
            await checkAndDisplayDuplicate(studentId);
        }, 500);
    });
}

// Check for duplicate and display warning
async function checkAndDisplayDuplicate(studentId) {
    const warningDiv = document.getElementById('duplicate-warning');
    if (!warningDiv) return;
    
    // Show loading state
    warningDiv.className = 'warning-banner';
    warningDiv.innerHTML = '<span class="text-sm text-gray-600">Checking for duplicates...</span>';
    
    try {
        const duplicateInfo = await checkDuplicateCheckinWithDetails(studentId);
        
        if (duplicateInfo) {
            currentDuplicateWarning = duplicateInfo;
            // Show warning with details
            warningDiv.className = 'warning-banner';
            warningDiv.innerHTML = `
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="flex-1">
                        <p class="text-sm font-semibold text-amber-900">Duplicate Check-In Detected</p>
                        <p class="text-xs text-amber-800 mt-1">
                            ${duplicateInfo.student_name} already checked in today at ${duplicateInfo.start_time} 
                            (${duplicateInfo.session}, ${duplicateInfo.duration} hours)
                        </p>
                        <p class="text-xs text-amber-700 mt-1">You can still proceed if needed.</p>
                    </div>
                </div>
            `;
        } else {
            currentDuplicateWarning = null;
            hideDuplicateWarning();
        }
    } catch (error) {
        console.error('Error checking duplicate:', error);
        hideDuplicateWarning();
    }
}

// Hide duplicate warning
function hideDuplicateWarning() {
    const warningDiv = document.getElementById('duplicate-warning');
    if (warningDiv) {
        warningDiv.className = 'hidden';
        warningDiv.innerHTML = '';
    }
    currentDuplicateWarning = null;
}

// Initialize form submit handling with loading states
function initializeFormSubmitHandling() {
    const form = document.getElementById('checkin-form');
    const submitButton = document.getElementById('submit-btn') || form.querySelector('button[type="submit"]');
    
    if (!form || !submitButton) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable button and show loading state
        submitButton.disabled = true;
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = `
            <svg class="spinner w-5 h-5 text-current inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking in...
        `;
        
        try {
            // Use device's local date and time
            const now = new Date();
            const duration = parseFloat(document.getElementById('duration').value);
            const endTime = calculateEndTime(now, duration);
            const formData = {
                car_plate: document.getElementById('car-plate').value,
                instructor_id: document.getElementById('instructor-id').value,
                student_name: document.getElementById('student-name').value,
                student_id: document.getElementById('student-id').value,
                session: document.querySelector('input[name="session"]:checked')?.value,
                duration: duration,
                start_time: formatTimeAMPM(now),
                end_time: formatTimeAMPM(endTime),
                timestamp: now.toISOString(),
            };

            // Validate car plate
            if (!formData.car_plate || formData.car_plate === '- - - - -' || formData.car_plate === '---') {
                showErrorMessage('Please scan the car QR code first');
                return;
            }
            
            if (!formData.session) {
                showErrorMessage('Please select a session (KPP02 or KPP03)');
                return;
            }
            
            if (!formData.duration) {
                showErrorMessage('Please select a lesson duration');
                return;
            }

            // If duplicate warning is showing, ask for confirmation
            if (currentDuplicateWarning) {
                pendingFormData = formData;
                showDuplicateModal();
            } else {
                // No duplicate, proceed with submission
                await processCheckin(formData);
            }
        } finally {
            // Re-enable button and restore original text
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

// Show error message
function showErrorMessage(message) {
    // Check if using mobile modal style or desktop alert
    let errorModal = document.getElementById('error-modal');
    
    if (errorModal) {
        // Mobile style - use modal
        const messageEl = document.getElementById('error-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        errorModal.classList.remove('hidden');
        
        // If using bottom sheet style, add active class
        const content = errorModal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
    } else {
        // Fallback to alert if modal doesn't exist
        alert(message);
    }
}

// Close error modal
function closeErrorModal() {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        const content = errorModal.querySelector('.modal-mobile');
        if (content) {
            content.classList.remove('active');
            setTimeout(() => errorModal.classList.add('hidden'), 300);
        } else {
            errorModal.classList.add('hidden');
        }
    }
}

// Check if student already has a check-in today (simple boolean)
async function checkDuplicateCheckin(studentId) {
    try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/check_ins?student_id=eq.${studentId}&timestamp=gte.${todayStart.toISOString()}&timestamp=lt.${todayEnd.toISOString()}&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            const existingCheckins = await response.json();
            return existingCheckins.length > 0;
        }
        return false;
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return false;
    }
}

// Check for duplicate with full details for real-time warning
async function checkDuplicateCheckinWithDetails(studentId) {
    try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/check_ins?student_id=eq.${studentId}&timestamp=gte.${todayStart.toISOString()}&timestamp=lt.${todayEnd.toISOString()}&order=timestamp.desc&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            const existingCheckins = await response.json();
            return existingCheckins.length > 0 ? existingCheckins[0] : null;
        }
        return null;
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return null;
    }
}

// Process check-in (online or offline)
async function processCheckin(formData) {
    if (navigator.onLine) {
        const success = await submitCheckin(formData);
        if (success) {
            showSuccessModal();
        } else {
            showErrorMessage('Failed to submit check-in. Please check your connection and try again.');
        }
    } else {
        // Store for later submission
        pendingCheckins.push(formData);
        localStorage.setItem('pendingCheckins', JSON.stringify(pendingCheckins));
        updatePendingCount();
        showSuccessModal();
    }
}

// Submit check-in to Supabase
async function submitCheckin(data) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/check_ins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error('Submission error:', error);
        return false;
    }
}

// Get today's check-in history
async function getTodayCheckins() {
    try {
        const currentCarPlate = document.getElementById('car-plate').value;
        
        // If no car plate is set, return empty
        if (!currentCarPlate || currentCarPlate === '- - - - -' || currentCarPlate === '---') {
            showErrorMessage('No car plate detected. Please scan the QR code.');
            return [];
        }
        
        // Get today's date range in local timezone
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/check_ins?car_plate=eq.${currentCarPlate}&timestamp=gte.${todayStart.toISOString()}&timestamp=lt.${todayEnd.toISOString()}&order=timestamp.desc`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            return await response.json();
        }
        return [];
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
}

// Show history modal
async function showHistoryModal() {
    const modal = document.getElementById('history-modal');
    const content = document.getElementById('history-content');
    const currentCarPlate = document.getElementById('car-plate').value;
    
    if (!modal || !content) return;
    
    // Check if car plate is set
    if (!currentCarPlate || currentCarPlate === '- - - - -' || currentCarPlate === '---') {
        content.innerHTML = '<div class="text-center py-8 text-gray-500">Please set a car plate first to view history.</div>';
        modal.classList.remove('hidden');
        return;
    }
    
    // Show loading state
    content.innerHTML = '<div class="text-center py-8 text-gray-500">Loading history...</div>';
    modal.classList.remove('hidden');
    
    try {
        const checkins = await getTodayCheckins();
        
        if (checkins.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    No check-ins found for today for car plate:<br>
                    <span class="font-semibold mt-2 block">${currentCarPlate}</span>
                </div>`;
            return;
        }
        
        let html = `
            <div class="text-sm text-gray-600 mb-4 text-center bg-blue-50 p-3 rounded-lg">
                Showing history for: <span class="font-semibold text-blue-900">${currentCarPlate}</span>
            </div>
            <div class="space-y-3">
        `;
        
        checkins.forEach(checkin => {
            const time = new Date(checkin.timestamp).toLocaleTimeString();
            html += `
                <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-semibold text-gray-900">${checkin.student_name}</h4>
                            <p class="text-sm text-gray-600">${checkin.student_id}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">${checkin.session}</span>
                            <div class="text-xs text-gray-500 mt-1">${checkin.start_time} - ${checkin.end_time}</div>
                        </div>
                    </div>
                    <div class="flex justify-between text-sm text-gray-700">
                        <span>Instructor: <span class="font-medium">${checkin.instructor_id}</span></span>
                        <span>Duration: <span class="font-medium">${checkin.duration}h</span></span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        content.innerHTML = html;
    } catch (error) {
        content.innerHTML = '<div class="text-center py-8 text-red-500">Error loading history.</div>';
    }
}

// Close history modal
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Show duplicate confirmation modal
function showDuplicateModal() {
    const modal = document.getElementById('duplicate-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // If using bottom sheet style, add active class
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
    }
}

// Close duplicate modal
function closeDuplicateModal() {
    const modal = document.getElementById('duplicate-modal');
    if (modal) {
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            content.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 300);
        } else {
            modal.classList.add('hidden');
        }
    }
    pendingFormData = null;
}

// Confirm duplicate check-in
async function confirmDuplicateCheckin() {
    if (pendingFormData) {
        // Disable the button to prevent double-clicks
        const confirmButton = document.querySelector('#duplicate-modal button[onclick*="confirmDuplicateCheckin"]');
        if (confirmButton) {
            const originalText = confirmButton.innerHTML;
            confirmButton.disabled = true;
            confirmButton.innerHTML = 'Processing...';
            
            try {
                await processCheckin(pendingFormData);
                closeDuplicateModal();
            } finally {
                confirmButton.disabled = false;
                confirmButton.innerHTML = originalText;
            }
        } else {
            await processCheckin(pendingFormData);
            closeDuplicateModal();
        }
    }
}

function showSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // If using bottom sheet style, add active class
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
        
        // Auto-dismiss after 2 seconds
        setTimeout(() => {
            closeSuccessModal();
        }, 2000);
    }
}

// Add event listener for duration change
document.addEventListener('DOMContentLoaded', function() {
    const durationSelect = document.getElementById('duration');
    if (durationSelect) {
        durationSelect.addEventListener('change', updateTotalTimeDisplay);
    }
});

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            content.classList.remove('active');
            setTimeout(() => {
                modal.classList.add('hidden');
                resetForm();
            }, 300);
        } else {
            modal.classList.add('hidden');
            resetForm();
        }
    }
}

function resetForm() {
    const form = document.getElementById('checkin-form');
    if (form) {
        form.reset();
    }
    
    // Get current car plate before clearing
    const currentCarPlate = document.getElementById('car-plate').value;
    
    // Keep the car plate in URL parameters
    if (currentCarPlate && currentCarPlate !== '- - - - -' && currentCarPlate !== '---') {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('car', currentCarPlate);
        window.history.replaceState({}, '', newUrl);
        
        // Restore the car plate value
        setCarPlate(currentCarPlate);
    }
    
    // Reset session to default
    const kpp02 = document.getElementById('session-kpp02');
    if (kpp02) {
        kpp02.checked = true;
    }
    
    // Clear form fields
    const instructorId = document.getElementById('instructor-id');
    const studentName = document.getElementById('student-name');
    const studentId = document.getElementById('student-id');
    const totalTimeDisplay = document.getElementById('total-time-display');
    const timeDisplayContainer = document.getElementById('time-display-container');
    
    if (instructorId) instructorId.value = '';
    if (studentName) studentName.value = '';
    if (studentId) studentId.value = '';
    if (totalTimeDisplay) totalTimeDisplay.textContent = 'Select duration to see time range';
    if (timeDisplayContainer) timeDisplayContainer.classList.add('hidden');
    
    // Hide any duplicate warnings
    hideDuplicateWarning();
    
    updatePendingCount();
}

function updatePendingCount() {
    // You could add a badge showing pending sync count
    const pending = pendingCheckins.length;
    if (pending > 0) {
        console.log(`${pending} check-ins pending sync`);
        // TODO: Add visual indicator for pending syncs
    }
}

// Sync pending check-ins when coming online
window.addEventListener('online', async function() {
    const failed = [];
    
    for (const checkin of pendingCheckins) {
        const success = await submitCheckin(checkin);
        if (!success) {
            failed.push(checkin);
        }
    }
    
    pendingCheckins = failed;
    localStorage.setItem('pendingCheckins', JSON.stringify(pendingCheckins));
    updatePendingCount();
    
    if (failed.length === 0 && pendingCheckins.length > 0) {
        console.log('All pending check-ins synced successfully');
    }
});
