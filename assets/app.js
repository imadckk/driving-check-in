// Configuration - Replace with your Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let pendingCheckins = JSON.parse(localStorage.getItem('pendingCheckins') || '[]');
let pendingFormData = null; // Store form data when duplicate is detected

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get car plate from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const carPlate = urlParams.get('car');
    
    if (carPlate) {
        setCarPlate(carPlate);
    }
    initializeSessionToggle();

    // Load pending check-ins count
    updatePendingCount();
});

// Function to set car plate display
function setCarPlate(plate) {
    const plateInput = document.getElementById('car-plate');
    const plateText = document.getElementById('plate-text');
    const plateContainer = document.getElementById('css-plate');
    
    plateInput.value = plate;
    
    if (plate && plate.trim() !== '') {
        plateText.textContent = plate;
        plateContainer.classList.remove('empty');
    } else {
        plateText.textContent = '- - - - -';
        plateContainer.classList.add('empty');
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
    
    if (durationSelect.value) {
        const now = new Date();
        const duration = parseFloat(durationSelect.value);
        const endTime = calculateEndTime(now, duration);
        
        const startTimeFormatted = formatTimeAMPM(now);
        const endTimeFormatted = formatTimeAMPM(endTime);
        
        totalTimeDisplay.textContent = `${startTimeFormatted} - ${endTimeFormatted}`;
    } else {
        totalTimeDisplay.textContent = 'Select duration to see time range';
    }
}

// Add after the configuration section
function initializeSessionToggle() {
    const sessionRadios = document.querySelectorAll('input[name="session"]');
    const sessionSlider = document.querySelector('.session-slider');
    
    sessionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // The CSS handles the visual movement through the transform property
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
    
    // Set initial state if needed
    if (!document.querySelector('input[name="session"]:checked')) {
        sessionRadios[0].checked = true;
    }
}

// Form submission handler
document.getElementById('checkin-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
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
        timestamp: now.toISOString(), // Store as ISO string for consistency
    };

    // Validate car plate
    if (!formData.car_plate || formData.car_plate === '- - - - -') {
        alert('Please enter car plate or scan QR code');
        return;
    }
     if (!formData.session) {
        alert('Please select a session');
        return;
    }
    
    if (!formData.duration) {
        alert('Please select duration');
        return;
    }

    // Check for duplicate student ID for today
    const hasDuplicate = await checkDuplicateCheckin(formData.student_id);
    
    if (hasDuplicate) {
        // Show duplicate confirmation modal
        pendingFormData = formData;
        showDuplicateModal();
    } else {
        // No duplicate, proceed with submission
        await processCheckin(formData);
    }
});

// Check if student already has a check-in today
async function checkDuplicateCheckin(studentId) {
    try {
        // Get today's date range in local timezone
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

// Process check-in (online or offline)
async function processCheckin(formData) {
    if (navigator.onLine) {
        const success = await submitCheckin(formData);
        if (success) {
            showSuccessModal();
        } else {
            alert('Failed to submit check-in. Please try again.');
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
        if (!currentCarPlate || currentCarPlate === '- - - - -') {
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
    
    // Check if car plate is set
    if (!currentCarPlate || currentCarPlate === '- - - - -') {
        content.innerHTML = '<div class="text-center py-8 text-gray-500">Please set a car plate first to view history.</div>';
        modal.classList.remove('hidden');
        return;
    }
    
    // Update modal title to show current car plate
    const modalTitle = modal.querySelector('h3');
    modalTitle.textContent = `Today's History - ${currentCarPlate}`;
    
    // Show loading state
    content.innerHTML = '<div class="text-center py-8 text-gray-500">Loading history...</div>';
    modal.classList.remove('hidden');
    
    try {
        const checkins = await getTodayCheckins();
        
        if (checkins.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    No check-ins found for today for car plate:<br>
                    <span class="font-medium">${currentCarPlate}</span>
                </div>`;
            return;
        }
        
        let html = `
            <div class="text-sm text-gray-600 mb-3 text-center">
                Showing history for: <span class="font-medium">${currentCarPlate}</span>
            </div>
            <div class="space-y-3">
        `;
        
        checkins.forEach(checkin => {
            const time = new Date(checkin.timestamp).toLocaleTimeString();
            html += `
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-medium text-gray-900">${checkin.student_name}</h4>
                            <p class="text-sm text-gray-600">${checkin.student_id}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${checkin.session}</span>
                            <div class="text-xs text-gray-500 mt-1">${checkin.start_time} - ${checkin.end_time}</div>
                        </div>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-700">Instructor: ${checkin.instructor_id}</span>
                        <span class="text-gray-700">Duration: ${checkin.duration} hours</span>
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
    document.getElementById('history-modal').classList.add('hidden');
}

// Show duplicate confirmation modal
function showDuplicateModal() {
    document.getElementById('duplicate-modal').classList.remove('hidden');
}

// Close duplicate modal
function closeDuplicateModal() {
    document.getElementById('duplicate-modal').classList.add('hidden');
    pendingFormData = null;
}

// Confirm duplicate check-in
function confirmDuplicateCheckin() {
    if (pendingFormData) {
        processCheckin(pendingFormData);
        closeDuplicateModal();
    }
}

function showManualEntry() {
    const plate = prompt('Enter Car Plate Number:');
    if (plate) {
        setCarPlate(plate);
    }
}

function showSuccessModal() {
    document.getElementById('success-modal').classList.remove('hidden');
}

// Add event listener for duration change
document.getElementById('duration').addEventListener('change', updateTotalTimeDisplay);

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
    document.getElementById('checkin-form').reset();
    
    // Get current car plate before clearing
    const currentCarPlate = document.getElementById('car-plate').value;
    
    // Keep the car plate in URL parameters instead of clearing them
    if (currentCarPlate && currentCarPlate !== '- - - - -') {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('car', currentCarPlate);
        window.history.replaceState({}, '', newUrl);
    }
    
    // Clear form fields except car plate
    document.getElementById('instructor-id').value = '';
    document.getElementById('student-name').value = '';
    document.getElementById('student-id').value = '';
    document.getElementById('total-time-display').textContent = 'Select duration to see time range';
    
    updatePendingCount();
}

function updatePendingCount() {
    // You could add a badge showing pending sync count
    const pending = pendingCheckins.length;
    if (pending > 0) {
        console.log(`${pending} check-ins pending sync`);
    }
}

// Format local date and time for display
function formatLocalDateTime(date) {
    return date.toLocaleString();
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
