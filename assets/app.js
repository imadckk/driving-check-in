// Configuration - Replace with your Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let pendingCheckins = JSON.parse(localStorage.getItem('pendingCheckins') || '[]');
let pendingFormData = null;
let duplicateCheckTimeout = null;
let currentDuplicateWarning = null;
let agentCache = {}; // Cache for agent names

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
    initializeAgentCheck();

    // Load pending check-ins count
    updatePendingCount();
});

// ============================================
// AGENT MANAGEMENT
// ============================================

/**
 * Initialize agent checking on instructor ID field
 */
function initializeAgentCheck() {
    const instructorInput = document.getElementById('instructor-id');
    if (!instructorInput) return;
    
    // Check on blur (when user leaves the field)
    instructorInput.addEventListener('blur', async function() {
        const instructorId = this.value.trim().toUpperCase();
        if (instructorId && instructorId.length >= 2) {
            await checkAndPromptAgent(instructorId);
        }
    });
    
    // Also check on Enter key
    instructorInput.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const instructorId = this.value.trim().toUpperCase();
            if (instructorId && instructorId.length >= 2) {
                await checkAndPromptAgent(instructorId);
            }
        }
    });
}

/**
 * Check if agent exists, if not prompt to add
 */
async function checkAndPromptAgent(instructorId) {
    // Check cache first
    if (agentCache[instructorId]) {
        return;
    }
    
    try {
        const exists = await checkAgentExists(instructorId);
        if (!exists) {
            // Show the agent modal
            await showAgentModalWithPromise(instructorId);
        } else {
            // Fetch and cache the agent name
            await fetchAgentName(instructorId);
        }
    } catch (error) {
        console.error('Error checking agent:', error);
    }
}

/**
 * Check if an agent exists in Supabase
 */
async function checkAgentExists(instructorId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/agents?instructor_id=eq.${encodeURIComponent(instructorId)}&select=id`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            return data.length > 0;
        }
        return false;
    } catch (error) {
        console.error('Error checking agent:', error);
        return false;
    }
}

/**
 * Fetch agent name and IC from Supabase
 */
async function fetchAgentName(instructorId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/agents?instructor_id=eq.${encodeURIComponent(instructorId)}&select=agent_name,icno`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                agentCache[instructorId] = {
                    name: data[0].agent_name,
                    icno: data[0].icno
                };
                // Show a subtle confirmation
                showAgentFoundNotification(instructorId, data[0].agent_name);
            }
        }
    } catch (error) {
        console.error('Error fetching agent:', error);
    }
}

/**
 * Show agent modal and return a promise that resolves when saved
 */
function showAgentModalWithPromise(instructorId) {
    return new Promise((resolve) => {
        const modal = document.getElementById('agent-modal');
        if (!modal) {
            resolve();
            return;
        }
        
        document.getElementById('agent-modal-instructor-id').textContent = instructorId;
        const nameInput = document.getElementById('agent-modal-input');
        const icInput = document.getElementById('agent-modal-ic');
        nameInput.value = '';
        icInput.value = '';
        
        // Clear validation states
        nameInput.classList.remove('border-red-500', 'bg-red-50');
        icInput.classList.remove('ic-valid', 'ic-invalid');
        const helper = document.getElementById('agent-modal-ic-helper');
        if (helper) {
            helper.textContent = '';
            helper.className = 'ic-helper-text';
        }
        
        // Focus on name input first
        setTimeout(() => nameInput.focus(), 100);
        
        modal.classList.remove('hidden');
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
        
        modal.dataset.instructorId = instructorId;
        
        // Store resolve function to be called when modal is saved
        window._resolveAgentPrompt = resolve;
        
        // Auto-save on Enter key (from either input)
        const saveOnEnter = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveAgentName();
            }
        };
        nameInput.addEventListener('keydown', saveOnEnter);
        icInput.addEventListener('keydown', saveOnEnter);
        
        // Store reference to remove listeners later
        modal.dataset._nameListener = saveOnEnter;
    });
}

/**
 * Close agent modal (only called when saved)
 */
function closeAgentModal() {
    const modal = document.getElementById('agent-modal');
    if (modal) {
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            content.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 300);
        } else {
            modal.classList.add('hidden');
        }
        delete modal.dataset.instructorId;
        
        // Remove event listeners
        const nameInput = document.getElementById('agent-modal-input');
        const icInput = document.getElementById('agent-modal-ic');
        if (nameInput && modal.dataset._nameListener) {
            nameInput.removeEventListener('keydown', modal.dataset._nameListener);
        }
        if (icInput && modal.dataset._nameListener) {
            icInput.removeEventListener('keydown', modal.dataset._nameListener);
        }
        delete modal.dataset._nameListener;
    }
    // Clear inputs
    const nameInput = document.getElementById('agent-modal-input');
    const icInput = document.getElementById('agent-modal-ic');
    if (nameInput) {
        nameInput.value = '';
        nameInput.classList.remove('border-red-500', 'bg-red-50');
    }
    if (icInput) {
        icInput.value = '';
        icInput.classList.remove('ic-valid', 'ic-invalid');
    }
    const helper = document.getElementById('agent-modal-ic-helper');
    if (helper) {
        helper.textContent = '';
        helper.className = 'ic-helper-text';
    }
    const error = document.getElementById('agent-modal-error');
    if (error) error.remove();
}

/**
 * Save agent name - REQUIRED action (no skip)
 */
async function saveAgentName() {
    const modal = document.getElementById('agent-modal');
    const instructorId = modal?.dataset?.instructorId;
    const agentNameInput = document.getElementById('agent-modal-input');
    const agentIcInput = document.getElementById('agent-modal-ic');
    const agentName = agentNameInput?.value?.trim() || '';
    const agentIc = agentIcInput?.value?.trim() || '';
    const saveBtn = document.getElementById('agent-modal-save-btn');
    
    // Remove existing error messages
    const existingErrors = document.querySelectorAll('#agent-modal-error');
    existingErrors.forEach(el => el.remove());
    
    // Clear previous error styling
    agentNameInput.classList.remove('border-red-500', 'bg-red-50');
    agentIcInput.classList.remove('border-red-500', 'bg-red-50');
    
    let hasError = false;
    
    // Validate name
    if (!agentName) {
        agentNameInput.classList.add('border-red-500', 'bg-red-50');
        agentNameInput.focus();
        hasError = true;
    }
    
    // Validate IC (must be numeric only)
    if (!agentIc) {
        agentIcInput.classList.add('border-red-500', 'bg-red-50');
        if (!hasError) agentIcInput.focus();
        hasError = true;
    } else if (!/^[0-9]+$/.test(agentIc)) {
        agentIcInput.classList.add('border-red-500', 'bg-red-50');
        const helper = document.getElementById('agent-modal-ic-helper');
        if (helper) {
            helper.textContent = '❌ Please enter numbers only';
            helper.className = 'ic-helper-text invalid';
        }
        if (!hasError) agentIcInput.focus();
        hasError = true;
    }
    
    if (hasError) {
        // Show error message
        const errorMsg = document.createElement('p');
        errorMsg.id = 'agent-modal-error';
        errorMsg.className = 'text-red-500 text-sm mt-2 text-center';
        errorMsg.textContent = 'Please fill in all required fields correctly';
        const container = agentNameInput.parentElement.parentElement;
        container.appendChild(errorMsg);
        
        // Auto-remove error styling after 3 seconds
        setTimeout(() => {
            agentNameInput.classList.remove('border-red-500', 'bg-red-50');
            agentIcInput.classList.remove('border-red-500', 'bg-red-50');
            const error = document.getElementById('agent-modal-error');
            if (error) error.remove();
        }, 3000);
        return;
    }
    
    // Show loading state on button
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <svg class="spinner w-5 h-5 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Saving...
    `;
    
    try {
        // Save to Supabase with icno
        const response = await fetch(`${SUPABASE_URL}/rest/v1/agents`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                instructor_id: instructorId,
                agent_name: agentName,
                icno: agentIc
            })
        });
        
        if (response.ok) {
            // Cache the agent data
            agentCache[instructorId] = {
                name: agentName,
                icno: agentIc
            };
            
            // Show success notification
            showAgentSavedNotification(instructorId, agentName);
            
            // Close modal and resolve promise
            closeAgentModal();
            if (window._resolveAgentPrompt) {
                window._resolveAgentPrompt();
                window._resolveAgentPrompt = null;
            }
        } else {
            const error = await response.text();
            throw new Error(error);
        }
    } catch (error) {
        console.error('Error saving agent:', error);
        // Show error on button
        saveBtn.innerHTML = '❌ Failed - Try Again';
        saveBtn.disabled = false;
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }, 3000);
    } finally {
        // Restore button if not already restored
        if (saveBtn.disabled) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

/**
 * Show notification that agent was found
 */
function showAgentFoundNotification(instructorId, agentName) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 z-50 bg-green-100 border-l-4 border-green-500 p-4 rounded-lg shadow-lg transition-all duration-300 max-w-xs';
    notification.innerHTML = `
        <div class="flex items-start">
            <svg class="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
                <p class="text-sm font-medium text-green-800">Agent Found</p>
                <p class="text-xs text-green-700">${agentName}</p>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Show notification that agent was saved
 */
function showAgentSavedNotification(instructorId, agentName) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 z-50 bg-blue-100 border-l-4 border-blue-500 p-4 rounded-lg shadow-lg transition-all duration-300 max-w-xs';
    notification.innerHTML = `
        <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
                <p class="text-sm font-medium text-blue-800">Agent Registered</p>
                <p class="text-xs text-blue-700">${agentName} (${instructorId})</p>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// EXISTING FUNCTIONS (UPDATED)
// ============================================

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

function formatTimeAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
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

function initializeSessionToggle() {
    const sessionRadios = document.querySelectorAll('input[name="session"]');
    
    sessionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            console.log('Session selected:', this.value);
        });
        
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
    
    if (!document.querySelector('input[name="session"]:checked')) {
        const kpp02 = document.getElementById('session-kpp02');
        if (kpp02) {
            kpp02.checked = true;
        }
    }
}

function initializeDuplicateCheck() {
    const studentIdInput = document.getElementById('student-id');
    if (!studentIdInput) return;
    
    const studentIdContainer = studentIdInput.parentElement;
    
    if (!document.getElementById('duplicate-warning')) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'duplicate-warning';
        warningDiv.className = 'hidden';
        studentIdContainer.appendChild(warningDiv);
    }
    
    studentIdInput.addEventListener('input', function() {
        const studentId = this.value.trim();
        
        if (duplicateCheckTimeout) {
            clearTimeout(duplicateCheckTimeout);
        }
        
        if (studentId.length < 4) {
            hideDuplicateWarning();
            return;
        }
        
        duplicateCheckTimeout = setTimeout(async () => {
            await checkAndDisplayDuplicate(studentId);
        }, 500);
    });
}

async function checkAndDisplayDuplicate(studentId) {
    const warningDiv = document.getElementById('duplicate-warning');
    if (!warningDiv) return;
    
    warningDiv.className = 'warning-banner';
    warningDiv.innerHTML = '<span class="text-sm text-gray-600">Checking for duplicates...</span>';
    
    try {
        const duplicateInfo = await checkDuplicateCheckinWithDetails(studentId);
        
        if (duplicateInfo) {
            currentDuplicateWarning = duplicateInfo;
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

function hideDuplicateWarning() {
    const warningDiv = document.getElementById('duplicate-warning');
    if (warningDiv) {
        warningDiv.className = 'hidden';
        warningDiv.innerHTML = '';
    }
    currentDuplicateWarning = null;
}

function initializeFormSubmitHandling() {
    const form = document.getElementById('checkin-form');
    const submitButton = document.getElementById('submit-btn') || form.querySelector('button[type="submit"]');
    
    if (!form || !submitButton) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
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
            const now = new Date();
            const duration = parseFloat(document.getElementById('duration').value);
            const endTime = calculateEndTime(now, duration);
            
            // Get instructor ID
            const instructorId = document.getElementById('instructor-id').value.trim().toUpperCase();
            
            const formData = {
                car_plate: document.getElementById('car-plate').value,
                instructor_id: instructorId,
                student_name: document.getElementById('student-name').value.trim().toUpperCase(),
                student_id: document.getElementById('student-id').value.trim().toUpperCase(),
                session: document.querySelector('input[name="session"]:checked')?.value,
                duration: duration,
                start_time: formatTimeAMPM(now),
                end_time: formatTimeAMPM(endTime),
                timestamp: now.toISOString(),
            };

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
            
            if (!instructorId || instructorId.length < 2) {
                showErrorMessage('Please enter a valid instructor ID');
                return;
            }
            
            // Check if agent exists - THIS WILL PROMPT MODAL IF NOT FOUND (NO SKIP)
            const exists = await checkAgentExists(instructorId);
            if (!exists) {
                // Show agent modal and WAIT for user to save (no skip option)
                await showAgentModalWithPromise(instructorId);
                // After saving, refresh agent cache
                await fetchAgentName(instructorId);
            } else {
                // Fetch and cache the agent data (including IC)
                await fetchAgentName(instructorId);
            }

            if (currentDuplicateWarning) {
                pendingFormData = formData;
                showDuplicateModal();
            } else {
                await processCheckin(formData);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showErrorMessage('An error occurred. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

function showErrorMessage(message) {
    let errorModal = document.getElementById('error-modal');
    
    if (errorModal) {
        const messageEl = document.getElementById('error-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        errorModal.classList.remove('hidden');
        
        const content = errorModal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
    } else {
        alert(message);
    }
}

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

async function processCheckin(formData) {
    if (navigator.onLine) {
        const success = await submitCheckin(formData);
        if (success) {
            showSuccessModal();
        } else {
            showErrorMessage('Failed to submit check-in. Please check your connection and try again.');
        }
    } else {
        pendingCheckins.push(formData);
        localStorage.setItem('pendingCheckins', JSON.stringify(pendingCheckins));
        updatePendingCount();
        showSuccessModal();
    }
}

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

async function getTodayCheckins() {
    try {
        const currentCarPlate = document.getElementById('car-plate').value;
        
        if (!currentCarPlate || currentCarPlate === '- - - - -' || currentCarPlate === '---') {
            showErrorMessage('No car plate detected. Please scan the QR code.');
            return [];
        }
        
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

async function showHistoryModal() {
    const modal = document.getElementById('history-modal');
    const content = document.getElementById('history-content');
    const currentCarPlate = document.getElementById('car-plate').value;
    
    if (!modal || !content) return;
    
    if (!currentCarPlate || currentCarPlate === '- - - - -' || currentCarPlate === '---') {
        content.innerHTML = '<div class="text-center py-8 text-gray-500">Please set a car plate first to view history.</div>';
        modal.classList.remove('hidden');
        return;
    }
    
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

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showDuplicateModal() {
    const modal = document.getElementById('duplicate-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
    }
}

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

async function confirmDuplicateCheckin() {
    if (pendingFormData) {
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
        const content = modal.querySelector('.modal-mobile');
        if (content) {
            setTimeout(() => content.classList.add('active'), 10);
        }
        
        setTimeout(() => {
            closeSuccessModal();
        }, 2000);
    }
}

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
    
    const currentCarPlate = document.getElementById('car-plate').value;
    
    if (currentCarPlate && currentCarPlate !== '- - - - -' && currentCarPlate !== '---') {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('car', currentCarPlate);
        window.history.replaceState({}, '', newUrl);
        setCarPlate(currentCarPlate);
    }
    
    const kpp02 = document.getElementById('session-kpp02');
    if (kpp02) {
        kpp02.checked = true;
    }
    
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
    
    hideDuplicateWarning();
    updatePendingCount();
}

function updatePendingCount() {
    const pending = pendingCheckins.length;
    if (pending > 0) {
        console.log(`${pending} check-ins pending sync`);
    }
}

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
