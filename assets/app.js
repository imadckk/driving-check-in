// Configuration - Replace with your Supabase details
const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

let pendingCheckins = JSON.parse(localStorage.getItem('pendingCheckins') || '[]');

// Add these variables at the top
let scene, camera, renderer, plateMesh;
let currentPlateText = '';

// Initialize Three.js for car plate
function initCarPlate() {
    const container = document.getElementById('plate-container');
    
    // Scene
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    scene.add(directionalLight);
    
    // Create initial plate
    updateCarPlate3D('');
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('plate-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function updateCarPlate3D(plateText) {
    // Clear existing plate
    if (plateMesh) {
        scene.remove(plateMesh);
    }
    
    // Create plate geometry with extrude
    const plateGeometry = new THREE.BoxGeometry(4, 1, 0.1);
    
    // Create black material with some shine
    const plateMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x000000,
        shininess: 30,
        specular: 0x222222
    });
    
    plateMesh = new THREE.Mesh(plateGeometry, plateMaterial);
    scene.add(plateMesh);
    
    // Add text if plate number exists
    if (plateText && plateText.trim() !== '') {
        addTextToPlate(plateText);
    }
    
    animate();
}

function addTextToPlate(text) {
    // Simple canvas-based text for 3D (for simplicity)
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    // Black background
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // White text
    context.fillStyle = '#ffffff';
    context.font = 'bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create text geometry
    const textGeometry = new THREE.PlaneGeometry(3, 0.6);
    const textMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.06; // Slightly above the plate surface
    plateMesh.add(textMesh);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Gentle rotation for 3D effect
    if (plateMesh) {
        plateMesh.rotation.y = Math.sin(Date.now() * 0.001) * 0.1;
    }
    
    renderer.render(scene, camera);
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    initCarPlate();
    // Get car plate from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const carPlate = urlParams.get('car');
    
    if (carPlate) {
        setCarPlate(carPlate);
    }

    // Load pending check-ins count
    updatePendingCount();
});

// New function to set car plate
function setCarPlate(plate) {
    document.getElementById('car-plate').value = plate;
    currentPlateText = plate;
    updateCarPlate3D(plate);
}

// Update the showManualEntry function
function showManualEntry() {
    const plate = prompt('Enter Car Plate Number:');
    if (plate) {
        setCarPlate(plate);
    }
}

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

// Update the closeSuccessModal function to clear the plate
function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
    document.getElementById('checkin-form').reset();
    
    // Clear URL parameters but keep the page
    window.history.replaceState({}, '', window.location.pathname);
    
    // Clear car plate display
    setCarPlate('');
    
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
