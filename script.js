// Navigation Logic
const navLinks = document.querySelectorAll('.nav-links li');
const views = document.querySelectorAll('.view');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const targetId = link.getAttribute('data-target');
        views.forEach(v => {
            v.classList.remove('active-view');
            if (v.id === targetId) {
                v.classList.add('active-view');
                if (targetId === 'dashboard-view') {
                    fetchReports();
                    if (map) map.invalidateSize();
                }
            }
        });
    });
});

// File Upload Preview
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const dropZoneLabel = document.getElementById('drop-zone-label');

imageUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            dropZoneLabel.classList.add('hidden');
        }
        reader.readAsDataURL(file);
    }
});

// Drag and drop for the file drop zone
dropZoneLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZoneLabel.style.borderColor = 'var(--text-primary)';
    dropZoneLabel.style.background = 'rgba(59, 130, 246, 0.2)';
});

dropZoneLabel.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZoneLabel.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    dropZoneLabel.style.background = 'rgba(59, 130, 246, 0.05)';
});

dropZoneLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZoneLabel.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    dropZoneLabel.style.background = 'rgba(59, 130, 246, 0.05)';
    
    if (e.dataTransfer.files.length) {
        imageUpload.files = e.dataTransfer.files;
        // Trigger change event manually
        const event = new Event('change');
        imageUpload.dispatchEvent(event);
    }
});

// Geolocation
const getLocationBtn = document.getElementById('get-location-btn');
const latInput = document.getElementById('latitude');
const lngInput = document.getElementById('longitude');
const latDisplay = document.getElementById('lat-display');
const lngDisplay = document.getElementById('lng-display');
const submitBtn = document.getElementById('submit-btn');

getLocationBtn.addEventListener('click', () => {
    if ("geolocation" in navigator) {
        getLocationBtn.innerHTML = '<span class="material-icons-outlined">satellite_alt</span> Locating...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                latInput.value = lat;
                lngInput.value = lng;
                
                latDisplay.textContent = `Lat: ${lat.toFixed(6)}`;
                lngDisplay.textContent = `Lng: ${lng.toFixed(6)}`;
                
                getLocationBtn.innerHTML = '<span class="material-icons-outlined">check_circle</span> Location Found';
                getLocationBtn.style.background = "rgba(16, 185, 129, 0.2)"; // Soft green
                getLocationBtn.style.borderColor = "var(--success)";
                getLocationBtn.style.color = "var(--success)";
                
                submitBtn.disabled = false;
            },
            (error) => {
                alert("Error getting location. Please enable location services.");
                getLocationBtn.innerHTML = '<span class="material-icons-outlined">refresh</span> Retry Location';
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
});

// Form Submission
const reportForm = document.getElementById('report-form');
const statusText = document.getElementById('submission-status');

reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Submitting...';
    submitBtn.disabled = true;

    const formData = new FormData(reportForm);

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            statusText.innerHTML = '<span class="material-icons-outlined" style="vertical-align: middle;">check_circle</span> Report submitted successfully! ML analysis completed.';
            statusText.style.color = "var(--success)";
            reportForm.reset();
            imagePreview.classList.add('hidden');
            dropZoneLabel.classList.remove('hidden');
            getLocationBtn.innerHTML = '<span class="material-icons-outlined">my_location</span> Get Current Location';
            getLocationBtn.style.background = "";
            getLocationBtn.style.borderColor = "";
            getLocationBtn.style.color = "";
            latDisplay.textContent = `Lat: -`;
            lngDisplay.textContent = `Lng: -`;
        } else {
            throw new Error('Server returned an error');
        }
    } catch (error) {
        statusText.innerHTML = '<span class="material-icons-outlined" style="vertical-align: middle;">error</span> Failed to submit report. Ensure backend is running.';
        statusText.style.color = "var(--danger)";
    } finally {
        submitBtn.innerHTML = '<span class="material-icons-outlined">send</span> Submit Report';
    }
});

// Map Logic
let map;
let markers = [];

function initMap() {
    map = L.map('pothole-map').setView([0, 0], 2);

    // Modern Dark Map Tiles from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    fetchReports();
}

function getMarkerColor(severity) {
    if (severity === 'High') return '#ef4444'; // Red
    if (severity === 'Medium') return '#f59e0b'; // Amber
    return '#10b981'; // Green
}

async function fetchReports() {
    try {
        const response = await fetch('/api/reports');
        if (response.ok) {
            const reports = await response.json();
            updateDashboard(reports);
        }
    } catch (e) {
        console.error("Failed to fetch reports:", e);
    }
}

function updateDashboard(reports) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    let highSevCount = 0;

    reports.forEach(report => {
        if (report.severity_level === 'High') highSevCount++;

        const markerColor = getMarkerColor(report.severity_level);
        const markerHtmlStyles = `
            background-color: ${markerColor};
            width: 18px;
            height: 18px;
            display: block;
            position: relative;
            border-radius: 50%;
            border: 3px solid #1a202c; /* Matches dark theme */
            box-shadow: 0 0 15px ${markerColor}, inset 0 0 5px rgba(255,255,255,0.5);
        `;

        const icon = L.divIcon({
            className: "custom-pin",
            iconAnchor: [9, 9], // Center the circle
            popupAnchor: [0, -10],
            html: `<span style="${markerHtmlStyles}"></span>`
        });

        const popupContent = `
            <div style="color: #f8fafc; font-family: 'Outfit', sans-serif; background: rgba(30, 41, 59, 0.9); padding: 5px; border-radius: 8px;">
                <h4 style="margin:0 0 8px 0; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Report #${report.id}</h4>
                <p style="margin:0 0 5px 0; font-size: 0.9rem;"><strong>Severity:</strong> <span style="color:${markerColor}; font-weight: 600;">${report.severity_level}</span></p>
                <p style="margin:5px 0 0 0; font-size: 0.8rem; color: #94a3b8;">${new Date(report.created_at).toLocaleString()}</p>
                ${report.image_path ? `<img src="/${report.image_path}" style="width:100%; margin-top:12px; border-radius:8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">` : ''}
            </div>
        `;

        const marker = L.marker([report.latitude, report.longitude], {icon: icon})
            .bindPopup(popupContent, {
                className: 'custom-popup'
            })
            .addTo(map);
        
        markers.push(marker);
    });

    document.getElementById('total-reports').textContent = reports.length;
    document.getElementById('high-severity').textContent = highSevCount;

    if (reports.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds(), {padding: [50, 50]});
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
