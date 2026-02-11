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
    initializeDuplicateCheck(); // NEW: Initialize real-time duplicate checking
    initializeFormSubmitHandling(); // NEW: Initialize loading states

    // Load pending check-ins count
    updatePendingCount();
    
    // Initialize 3D logo
    init3DLogo();
});

// Three.js 3D Logo initialization
function init3DLogo() {
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded');
        document.getElementById('fallback-logo').style.display = 'flex';
        return;
    }

    const container = document.getElementById("logo-3d");
    if (!container) {
        console.error('Logo container not found');
        return;
    }

    try {
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = null; // Transparent background

        // Renderer
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.style.borderRadius = '8px'; // Match your design
        container.appendChild(renderer.domElement);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            35, // Slightly wider angle for better view
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 4);
        camera.lookAt(0, 0, 0);

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(2, 3, 4);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-2, -1, -3);
        scene.add(directionalLight2);

        // Load your logo model
        let logo = null;
        const loader = new THREE.GLTFLoader();
        
        // Update this path to your actual logo location
        const LOGO_PATH = 'assets/logo.glb';
        
        loader.load(
            LOGO_PATH,
            (gltf) => {
                logo = gltf.scene;

                // Normalize size and center
                const box = new THREE.Box3().setFromObject(logo);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2.0 / (maxDim || 1);
                logo.scale.setScalar(scale);

                // Center the model
                const center = new THREE.Vector3();
                box.getCenter(center);
                logo.position.sub(center);

                // Initial rotation for better presentation
                logo.rotation.x = 0.1;
                logo.rotation.y = 0.2;

                scene.add(logo);
            },
            undefined,
            (error) => {
                console.error('Error loading 3D logo:', error);
                document.getElementById('fallback-logo').style.display = 'flex';
            }
        );

        // Handle resize
        function handleResize() {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            if (width === 0 || height === 0) return;
            
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        // Animation
        let animationId;
        function animate() {
            animationId = requestAnimationFrame(animate);
            
            if (logo) {
                // Smooth rotation
                logo.rotation.y += 0.008; // Slower rotation for elegance
            }
            
            renderer.render(scene, camera);
        }
        animate();

        // Cleanup function
        window.cleanupLogo = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            resizeObserver.disconnect();
            renderer.dispose();
        };

    } catch (error) {
        console.error('Error initializing 3D logo:', error);
        document.getElementById('fallback-logo').style.display = 'flex';
    }
}

// Add cleanup when leaving the page
window.addEventListener('beforeunload', () => {
    if (window.cleanupLogo) {
        window.cleanupLogo();
    }
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
    
    // Set initial state - DEFAULT TO KPP02
    if (!document.querySelector('input[name="session"]:checked')) {
        document.getElementById('session-kpp02').checked = true;
    }
}

// NEW: Initialize real-time duplicate checking
function initializeDuplicateCheck() {
    const studentIdInput = document.getElementById('student-id');
    const studentIdContainer = studentIdInput.parentElement;
    
    // Create warning element if it doesn't exist
    if (!document.getElementById('duplicate-warning')) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'duplicate-warning';
        warningDiv.className = 'hidden mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md';
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

// NEW: Check for duplicate and display warning
async function checkAndDisplayDuplicate(studentId) {
    const warningDiv = document.getElementById('duplicate-warning');
    
    // Show loading state
    warningDiv.className = 'mt-2 p-3 bg-gray-50 border border-gray-300 rounded-md';
    warningDiv.innerHTML = '<span class="text-sm text-gray-600">Checking for duplicates...</span>';
    
    try {
        const duplicateInfo = await checkDuplicateCheckinWithDetails(studentId);
        
        if (duplicateInfo) {
            currentDuplicateWarning = duplicateInfo;
            // Show warning with details
            warningDiv.className = 'mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md';
            warningDiv.innerHTML = `
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                        <p class="text-sm font-medium text-yellow-800">Duplicate Check-In Detected</p>
                        <p class="text-xs text-yellow-700 mt-1">
                            ${duplicateInfo.student_name} already checked in today at ${duplicateInfo.start_time} 
                            (${duplicateInfo.session}, ${duplicateInfo.duration} hours)
                        </p>
                        <p class="text-xs text-yellow-600 mt-1">You can still proceed if needed.</p>
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

// NEW: Hide duplicate warning
function hideDuplicateWarning() {
    const warningDiv = document.getElementById('duplicate-warning');
    if (warningDiv) {
        warningDiv.className = 'hidden mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md';
        warningDiv.innerHTML = '';
    }
    currentDuplicateWarning = null;
}

// NEW: Initialize form submit handling with loading states
function initializeFormSubmitHandling() {
    const form = document.getElementById('checkin-form');
    const submitButton = form.querySelector('button[type="submit"]');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable button and show loading state
        submitButton.disabled = true;
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            if (!formData.car_plate || formData.car_plate === '- - - - -') {
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

// NEW: Show error message (better than alert)
function showErrorMessage(message) {
    // Create error modal if it doesn't exist
    let errorModal = document.getElementById('error-modal');
    if (!errorModal) {
        errorModal = document.createElement('div');
        errorModal.id = 'error-modal';
        errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50';
        errorModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 mx-4 max-w-sm w-full">
                <div class="text-center">
                    <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p id="error-message" class="text-gray-600 mb-4"></p>
                    <button onclick="closeErrorModal()" 
                            class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium transition duration-200">
                        OK
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(errorModal);
    }
    
    document.getElementById('error-message').textContent = message;
    errorModal.classList.remove('hidden');
}

// NEW: Close error modal
function closeErrorModal() {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        errorModal.classList.add('hidden');
    }
}

// Check if student already has a check-in today (original version)
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

// NEW: Check for duplicate with full details for real-time warning
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
        if (!currentCarPlate || currentCarPlate === '- - - - -') {
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
async function confirmDuplicateCheckin() {
    if (pendingFormData) {
        // Disable the button to prevent double-clicks
        const confirmButton = document.querySelector('#duplicate-modal button[onclick="confirmDuplicateCheckin()"]');
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
    
    // Auto-dismiss after 2 seconds
    setTimeout(() => {
        closeSuccessModal();
    }, 2000);
}

// Add event listener for duration change
document.addEventListener('DOMContentLoaded', function() {
    const durationSelect = document.getElementById('duration');
    if (durationSelect) {
        durationSelect.addEventListener('change', updateTotalTimeDisplay);
    }
});

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
    
    // Reset session to default
    document.getElementById('session-kpp02').checked = true;
    
    // Clear form fields except car plate
    document.getElementById('instructor-id').value = '';
    document.getElementById('student-name').value = '';
    document.getElementById('student-id').value = '';
    document.getElementById('total-time-display').textContent = 'Select duration to see time range';
    
    // Hide any duplicate warnings
    hideDuplicateWarning();
    
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
