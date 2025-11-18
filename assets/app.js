// Configuration - Replace with your Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let pendingCheckins = JSON.parse(localStorage.getItem('pendingCheckins') || '[]');

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get car plate from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const carPlate = urlParams.get('car');
    
    if (carPlate) {
        document.getElementById('car-plate').value = carPlate;
    }

    // Load pending check-ins count
    updatePendingCount();
});

// Form submission handler
document.getElementById('checkin-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Use device's local date and time
    const now = new Date();
    const formData = {
        car_plate: document.getElementById('car-plate').value,
        instructor_id: document.getElementById('instructor-id').value,
        student_name: document.getElementById('student-name').value,
        student_id: document.getElementById('student-id').value,
        timestamp: now.toISOString(), // Store as ISO string for consistency
    };

    // Validate car plate
    if (!formData.car_plate) {
        alert('Please enter car plate or scan QR code');
        return;
    }

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
});

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

function showManualEntry() {
    const plate = prompt('Enter Car Plate Number:');
    if (plate) {
        document.getElementById('car-plate').value = plate;
    }
}

function showSuccessModal() {
    document.getElementById('success-modal').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
    document.getElementById('checkin-form').reset();
    
    // Clear URL parameters but keep the page
    window.history.replaceState({}, '', window.location.pathname);
    document.getElementById('car-plate').value = '';
    
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
