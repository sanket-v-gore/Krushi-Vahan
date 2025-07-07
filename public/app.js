// API Configuration
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const roleSelect = document.querySelector('select[name="role"]');
const ownerFields = document.getElementById('ownerFields');
const driverFields = document.getElementById('driverFields');

// Store last farmer search
let lastFarmerSearch = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.target.dataset.page);
        });
    });

    // Login/Register Buttons
    loginBtn.addEventListener('click', () => {
        console.log('Login button clicked');
        loginModal.show();
    });
    registerBtn.addEventListener('click', () => registerModal.show());

    // Role Selection
    roleSelect.addEventListener('change', () => {
        const role = roleSelect.value;
        ownerFields.classList.toggle('d-none', role !== 'owner');
        driverFields.classList.toggle('d-none', role !== 'driver');
    });

    // Form Submissions
    console.log('Setting up login form submit handler');
    loginForm.addEventListener('submit', (e) => {
        console.log('Login form submitted');
        handleLogin(e);
    });
    registerForm.addEventListener('submit', handleRegister);

    // Add Vehicle Form Submission (for owners)
    const addVehicleForm = document.getElementById('addVehicleForm');
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', handleAddVehicle);
    }

    // Initial Page Load
    showPage('home');

    // Assign Driver Modal Logic
    let assignVehicleId = null;
    let allDrivers = [];

    const driverSearchInput = document.getElementById('driverSearchInput');
    if (driverSearchInput) {
        driverSearchInput.addEventListener('input', function() {
            const search = this.value.toLowerCase();
            const filtered = allDrivers.filter(driver =>
                driver.name.toLowerCase().includes(search) ||
                driver.mobileNumber.includes(search) ||
                (driver.licenseNumber && driver.licenseNumber.toLowerCase().includes(search))
            );
            renderDriversTable(filtered);
        });
    }

    const toggleBtn = document.getElementById('toggleAvailabilityBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', async function() {
            try {
                const newStatus = !currentUser.available;
                const response = await makeRequest('POST', '/auth/availability', { available: newStatus }, true);
                currentUser.available = response.user.available;
                updateDriverAvailabilityUI();
                showSuccess('Availability updated!');
            } catch (error) {
                showError('Failed to update availability');
            }
        });
    }

    // Farmer Search Form
    const farmerSearchForm = document.getElementById('farmerSearchForm');
    if (farmerSearchForm) {
        farmerSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const searchData = {
                cropName: formData.get('cropName'),
                delivery: formData.get('delivery'),
                weight: formData.get('weight')
            };

            const searchButton = e.target.querySelector('button[type="submit"]');
            const spinner = searchButton.querySelector('.spinner-border');
            searchButton.disabled = true;
            spinner.classList.remove('d-none');

            try {
                const searchParams = new URLSearchParams(searchData);
                const response = await fetch(`${API_URL}/vehicles/search?${searchParams.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Search failed');
                }
                
                const vehicles = await response.json();
                const searchResults = document.getElementById('searchResults');
                const resultCount = document.getElementById('resultCount');
                
                if (vehicles.length === 0) {
                    showError(`No vehicles found going to ${searchData.delivery}`);
                    searchResults.classList.add('d-none');
                } else {
                    resultCount.textContent = vehicles.length;
                    searchResults.classList.remove('d-none');
                    displayVehicles(vehicles);
                }
            } catch (error) {
                showError('Failed to search vehicles: ' + error.message);
            } finally {
                searchButton.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // Contact Us Button Handler
    const contactUsBtn = document.getElementById('contactUsBtn');
    if (contactUsBtn) {
        contactUsBtn.addEventListener('click', function() {
            document.querySelector('.footer').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Logout Button Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Ensure Home button always shows home page
    const homeNav = document.querySelector('a.nav-link[data-page="home"]');
    if (homeNav) {
        homeNav.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('home');
        });
    }
});

// API Functions
async function makeRequest(method, endpoint, data = null, requiresAuth = false) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (requiresAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.json();
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

// Authentication Functions
async function handleLogin(event) {
    console.log('handleLogin function called');
    event.preventDefault();
    
    const formData = new FormData(loginForm);
    const username = formData.get('username');
    const password = formData.get('password');
    
    console.log('Login attempt with username:', username);

    try {
        console.log('Sending login request to server');
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Received response from server');
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            console.log('Login successful');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            authToken = data.token;
        showPage('home');
            showSuccess('Login successful!');
            loginForm.reset();
            loginModal.hide();
            
            // Show navigation items based on user role
            document.getElementById('vehiclesNav').style.display = 'block';
            document.getElementById('bookingsNav').style.display = 'block';
            document.getElementById('historyNav').style.display = 'block';
            
            if (data.user.role === 'driver') {
                document.getElementById('driverDashboardNav').style.display = 'block';
            }
            
            // Update UI for logged-in state
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('registerBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'block';
        } else {
            console.log('Login failed:', data.message);
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred during login');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());
    console.log('Registration data being sent:', data);

    // Remove unwanted fields if present
    delete data.advanceAmount;
    delete data.rent;
    delete data.routeInfo;

    // Password match check
    if (data.password !== data.reenterPassword) {
        showError('Passwords do not match.');
        return;
    }

    try {
        await makeRequest('POST', '/auth/register', data);
        registerModal.hide();
        showSuccess('Registration successful! Please login.');
    } catch (error) {
        // Try to parse and show backend validation errors
        try {
            const errObj = JSON.parse(error.message);
            if (errObj.errors && Array.isArray(errObj.errors)) {
                const messages = errObj.errors.map(e => e.msg).join('<br>');
                showError(messages);
            } else if (errObj.message) {
                showError(errObj.message);
            } else {
                showError('Registration failed.');
            }
        } catch (parseErr) {
            showError('Registration failed.');
        }
        console.error('Registration failed:', error);
    }
}

// Vehicle Functions
async function loadVehicles() {
    try {
        const vehicles = await makeRequest('GET', '/vehicles', null, true);
        const vehicleList = document.getElementById('vehicleList');
        vehicleList.innerHTML = '';
        if (!vehicles || vehicles.length === 0) {
            vehicleList.innerHTML = '<div class="alert alert-info">No vehicles available.</div>';
            return;
        }
        vehicles.forEach(vehicle => {
            const owner = vehicle.ownerId || {};
            const driver = vehicle.driverId || {};
            let ownerActions = '';
            if (currentUser && currentUser.role === 'owner') {
                ownerActions = `
                    <div class="mb-2">
                        <button class="btn btn-outline-primary btn-sm me-2" onclick='openAssignDriverModal("${vehicle._id}")'>Assign Driver</button>
                        <button class="btn btn-outline-secondary btn-sm me-2" onclick='openEditVehicleModal(${JSON.stringify(vehicle).replace(/'/g, "&apos;")})'>Edit</button>
                        <button class="btn btn-outline-danger btn-sm" onclick='deleteVehicle("${vehicle._id}")'>Delete</button>
                    </div>
                `;
            }
            vehicleList.innerHTML += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${vehicle.vehicleNumber}</h5>
                        <p class="card-text">
                            <strong>Capacity:</strong> ${vehicle.capacity?.weight ?? 'N/A'} kg, ${vehicle.capacity?.height ?? 'N/A'} ft<br>
                            <strong>Remaining Capacity:</strong> ${vehicle.remainingCapacity ?? vehicle.capacity?.weight ?? 'N/A'} kg<br>
                            <strong>Route:</strong> ${vehicle.route ? vehicle.route.join(' → ') : ''}<br>
                            <strong>Owner:</strong> ${owner.name || ''} (${owner.mobileNumber || ''})<br>
                            <strong>Driver:</strong> ${driver.name || ''} (${driver.mobileNumber || ''})<br>
                            <strong>Dispatch Date:</strong> ${vehicle.dispatchDateTime ? new Date(vehicle.dispatchDateTime).toLocaleString() : 'Not set'}<br>
                            <strong>Extra Info:</strong> ${vehicle.extraInfo || 'None'}<br>
                            <strong>Type:</strong> ${vehicle.type || 'N/A'}<br>
                        </p>
                        ${ownerActions}
                        ${currentUser && currentUser.role === 'farmer' ? `
                            <button class="btn btn-primary" onclick="createBooking('${vehicle._id}')">Book Now</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    } catch (error) {
        showError('Failed to load vehicles');
    }
}

async function displayVehicles(vehicles) {
    const vehicleList = document.getElementById('vehicleList');
    vehicleList.innerHTML = '';

    vehicles.forEach(vehicle => {
        const card = document.createElement('div');
        card.className = 'col-md-4';
        let ownerActions = '';
        let ownerInfo = '';
        const ownerRating = vehicle.ownerId?.rating ? `<span class='badge bg-warning text-dark'>⭐ ${vehicle.ownerId.rating.toFixed(1)}</span>` : '';
        const driverRating = vehicle.driverId?.rating ? `<span class='badge bg-warning text-dark'>⭐ ${vehicle.driverId.rating.toFixed(1)}</span>` : '';
        if (vehicle.ownerId) {
            ownerInfo = `<strong>Owner:</strong> ${vehicle.ownerId.name} (${vehicle.ownerId.mobileNumber}) ${ownerRating}<br>`;
        }
        let dispatchInfo = '';
        if (vehicle.dispatchDateTime) {
            const dt = new Date(vehicle.dispatchDateTime);
            dispatchInfo = `<strong>Dispatch:</strong> ${dt.toLocaleString()}<br>`;
        }
        let extraInfo = '';
        if (vehicle.extraInfo) {
            extraInfo = `<strong>Extra Info:</strong> ${vehicle.extraInfo}<br>`;
        }
        if (currentUser && currentUser.role === 'owner') {
            ownerActions = `
                <div class="mb-2">
                    <button class="btn btn-outline-primary btn-sm me-2" onclick='openAssignDriverModal("${vehicle._id}")'>Assign Driver</button>
                    <button class="btn btn-outline-secondary btn-sm me-2" onclick='openEditVehicleModal(${JSON.stringify(vehicle).replace(/'/g, "&apos;")})'>Edit</button>
                    <button class="btn btn-outline-danger btn-sm" onclick='deleteVehicle("${vehicle._id}")'>Delete</button>
                </div>
            `;
        }

        // Calculate remaining capacity
        const totalCapacity = vehicle.capacity?.weight || 0;
        const remainingCapacity = vehicle.remainingCapacity || totalCapacity;
        const usedCapacity = totalCapacity - remainingCapacity;
        const capacityPercentage = (usedCapacity / totalCapacity) * 100;

        // Determine capacity status color
        let capacityStatus = 'success';
        if (capacityPercentage > 80) {
            capacityStatus = 'danger';
        } else if (capacityPercentage > 50) {
            capacityStatus = 'warning';
        }

        card.innerHTML = `
            <div class="card vehicle-card">
                <div class="card-body">
                    <h5 class="card-title">${vehicle.vehicleNumber}</h5>
                    <p class="card-text">
                        <strong>Type:</strong> ${vehicle.type || 'N/A'}<br>
                        <strong>Total Capacity:</strong> ${totalCapacity} kg<br>
                        <strong>Used Capacity:</strong> ${usedCapacity} kg<br>
                        <strong>Remaining Capacity:</strong> 
                        <span class="badge bg-${capacityStatus}">${remainingCapacity} kg</span><br>
                        <div class="progress mb-2">
                            <div class="progress-bar bg-${capacityStatus}" 
                                 role="progressbar" 
                                 style="width: ${capacityPercentage}%" 
                                 aria-valuenow="${capacityPercentage}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${Math.round(capacityPercentage)}%
                            </div>
                        </div>
                        <strong>Route:</strong> ${vehicle.route ? vehicle.route.join(' → ') : ''}<br>
                        <strong>Rent:</strong> ${vehicle.rent}<br>
                        <strong>Advance:</strong> ₹${vehicle.advance}<br>
                        <strong>Status:</strong> ${vehicle.status}<br>
                        ${dispatchInfo}
                        ${extraInfo}
                        ${ownerInfo}
                        ${vehicle.driverId ? `<strong>Driver:</strong> ${vehicle.driverId.name} (${vehicle.driverId.mobileNumber}) ${driverRating}<br>` : ''}
                    </p>
                    ${ownerActions}
                    ${currentUser?.role === 'farmer' ? `
                        <button class="btn btn-primary" onclick="createBooking('${vehicle._id}')">
                            Book Vehicle
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        vehicleList.appendChild(card);
    });
}

window.openAssignDriverModal = function(vehicleId) {
    assignVehicleId = vehicleId;
    // Fetch all drivers
    makeRequest('GET', '/vehicles/drivers', null, true)
        .then(drivers => {
            allDrivers = drivers;
            renderDriversTable(allDrivers);
            document.getElementById('driverSearchInput').value = '';
            const assignDriverModal = new bootstrap.Modal(document.getElementById('assignDriverModal'));
            assignDriverModal.show();
        })
        .catch(() => showError('Could not load drivers'));
};

function renderDriversTable(drivers) {
    const tbody = document.querySelector('#driversTable tbody');
    tbody.innerHTML = '';
    drivers.forEach(driver => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${driver.name}</td>
            <td>${driver.mobileNumber}</td>
            <td>${driver.licenseNumber || ''}</td>
            <td>${driver.experience || 0}</td>
            <td>${driver.available ? 'Available' : 'Not Available'}</td>
            <td><button class="btn btn-sm btn-primary" onclick="assignDriverFromTable('${driver._id}')">Assign</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.assignDriverFromTable = async function(driverId) {
    if (!assignVehicleId) {
        showError('No vehicle selected');
        return;
    }
    console.log('Assigning driver', driverId, 'to vehicle', assignVehicleId);
    try {
        await makeRequest('PUT', `/vehicles/${assignVehicleId}/driver`, { driverId }, true);
        showSuccess('Driver assigned successfully!');
        bootstrap.Modal.getInstance(document.getElementById('assignDriverModal')).hide();
        loadVehicles();
    } catch (error) {
        showError('Failed to assign driver');
    }
};

// Create booking function
window.createBooking = async function(vehicleId) {
    try {
        // Get the vehicle details first
        const vehicleResponse = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!vehicleResponse.ok) {
            throw new Error('Failed to get vehicle details');
        }

        const vehicle = await vehicleResponse.json();
        
        // Get the weight from the search form
        const weight = document.querySelector('#farmerSearchForm input[name="weight"]').value;
        const cropName = document.querySelector('#farmerSearchForm input[name="cropName"]').value;
        
        if (vehicle.remainingCapacity < Number(weight)) {
            showError(`Warning: This vehicle only has ${vehicle.remainingCapacity} kg remaining capacity, but you need ${weight} kg. The booking may be rejected.`);
            if (!confirm('Do you still want to proceed with the booking?')) {
                return;
            }
        }

        // Show booking modal
        const bookingForm = document.getElementById('farmerBookingForm');
        bookingForm.querySelector('[name="vehicleId"]').value = vehicleId;
        bookingForm.querySelector('[name="cropName"]').value = cropName;
        
        const bookingModal = new bootstrap.Modal(document.getElementById('farmerBookingModal'));
        bookingModal.show();
    } catch (error) {
        showError('Failed to prepare booking: ' + error.message);
    }
};

// Handle booking form submission
const farmerBookingForm = document.getElementById('farmerBookingForm');
if (farmerBookingForm) {
    farmerBookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        // Get weight from search form
        const searchWeight = document.querySelector('#farmerSearchForm input[name="weight"]').value;
        const bookingData = {
            vehicleId: formData.get('vehicleId'),
            cropName: formData.get('cropName'),
            requiredCapacity: {
                weight: Number(searchWeight) // Use weight from search form
            },
            pickupLocation: formData.get('pickupLocation'),
            deliveryLocation: formData.get('deliveryLocation'),
            bookingDate: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes in the future
        };

        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                throw new Error('Failed to create booking');
            }

            const booking = await response.json();
            showSuccess('Booking created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('farmerBookingModal')).hide();

            showPage('bookings');
        } catch (error) {
            showError('Failed to create booking: ' + error.message);
        }
    });
}

async function loadBookings() {
    try {
        const bookings = await makeRequest('GET', '/bookings', null, true);
        console.log('Bookings:', bookings); // DEBUG
        displayBookings(bookings);
    } catch (error) {
        console.error('Failed to load bookings:', error);
    }
}

function displayBookings(bookings) {
    const bookingList = document.getElementById('bookingList') || document.getElementById('driverBookingList');
    bookingList.innerHTML = '';

    bookings.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'card booking-card mb-4 shadow-sm hover-shadow transition-all';
        
        // Status badge with color coding
        const statusColors = {
            'pending': 'warning',
            'bringing': 'info',
            'pending_market': 'primary',
            'pending_payment': 'secondary',
            'completed': 'success',
            'cancelled': 'danger'
        };
        const statusColor = statusColors[booking.status] || 'secondary';
        
        // Show bill info (image or link) if available
        let billDisplay = '';
        if (booking.bill && booking.bill.fileUrl) {
            let billSrc = booking.bill.fileUrl;
            if (!billSrc.startsWith('http')) {
                billSrc = API_URL.replace('/api', '') + billSrc;
            }
            if (billSrc.match(/\.(jpg|jpeg|png|gif)$/i)) {
                billDisplay = `
                    <div class="bill-image-container mb-3">
                        <strong class="d-block mb-2">Bill Image:</strong>
                        <a href="${billSrc}" target="_blank" class="bill-image-link">
                            <img src="${billSrc}" alt="Bill" class="bill-image">
                        </a>
                    </div>`;
            } else if (billSrc.match(/\.pdf$/i)) {
                billDisplay = `
                    <div class="bill-document mb-3">
                        <strong class="d-block mb-2">Bill PDF:</strong>
                        <a href="${billSrc}" target="_blank" class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-file-pdf me-1"></i>View PDF
                        </a>
                    </div>`;
            } else {
                billDisplay = `
                    <div class="bill-document mb-3">
                        <strong class="d-block mb-2">Bill File:</strong>
                        <a href="${billSrc}" target="_blank" class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-download me-1"></i>Download
                        </a>
                    </div>`;
            }
        } else {
            billDisplay = `
                <div class="bill-status mb-3">
                    <strong class="d-block mb-2">Bill Status:</strong>
                    <span class="badge bg-secondary">Not uploaded</span>
                </div>`;
        }

        // Safely access owner and driver information
        const owner = booking.vehicleId?.ownerId || {};
        const driver = booking.vehicleId?.driverId || {};
        const ownerRating = owner.rating ? `<span class='badge bg-warning text-dark ms-2'>⭐ ${owner.rating.toFixed(1)}</span>` : '';
        const driverRating = driver.rating ? `<span class='badge bg-warning text-dark ms-2'>⭐ ${driver.rating.toFixed(1)}</span>` : '';
        
        // Payment summary
        const advance = booking.vehicleId?.advance || 0;
        const weight = booking.requiredCapacity?.weight || 0;
        const rentPerKg = parseFloat(booking.vehicleId?.rent) || 0;
        const totalRent = weight * rentPerKg;
        const marketBill = booking.bill?.amount || 'Pending';
        const finalSettlement = booking.bill?.amount ? (booking.bill.amount + advance - totalRent) : 'Pending';

        const paymentSummary = `
            <div class="payment-summary card bg-light mt-3">
                <div class="card-header bg-primary text-white">
                    <strong><i class="fas fa-money-bill-wave me-2"></i>Payment Summary</strong>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-2">
                                <i class="fas fa-file-invoice-dollar me-2"></i>
                                <strong>Market Bill:</strong>
                                <span class="float-end">${typeof marketBill === 'number' ? '₹' + marketBill : marketBill}</span>
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-hand-holding-usd me-2"></i>
                                <strong>Advance Payment:</strong>
                                <span class="float-end">₹${advance}</span>
                            </p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-2">
                                <i class="fas fa-truck me-2"></i>
                                <strong>Total Rent:</strong>
                                <span class="float-end">₹${totalRent}</span>
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-calculator me-2"></i>
                                <strong>Final Settlement:</strong>
                                <span class="float-end">${typeof finalSettlement === 'number' ? '₹' + finalSettlement : finalSettlement}</span>
                            </p>
                        </div>
                    </div>
                    <div class="rent-details mt-2 text-muted small">
                        <i class="fas fa-info-circle me-1"></i>
                        Rent calculation: ${weight} kg × ₹${rentPerKg}/kg
                    </div>
                </div>
            </div>`;

        // Status update buttons for drivers
        let statusButtons = '';
        const isAssignedDriver = currentUser && 
                               currentUser.role === 'driver' && 
                               booking.vehicleId?.driverId?._id?.toString() === currentUser._id?.toString();

        if (isAssignedDriver) {
            switch(booking.status) {
                case 'pending':
                    statusButtons = `
                        <button class="btn btn-primary btn-sm" onclick="updateBookingStatus('${booking._id}', 'bringing')">
                            <i class="fas fa-play me-1"></i>Start Journey
                        </button>`;
                    break;
                case 'bringing':
                    statusButtons = `
                        <button class="btn btn-warning btn-sm" onclick="updateBookingStatus('${booking._id}', 'pending_market')">
                            <i class="fas fa-store me-1"></i>Reached Market
                        </button>`;
                    break;
                case 'pending_market':
                    statusButtons = `
                        <button class="btn btn-info btn-sm" onclick="showBillUploadModal('${booking._id}')">
                            <i class="fas fa-upload me-1"></i>Upload Bill
                        </button>`;
                    break;
            }
        }

        // Payment confirmation buttons
        let paymentButtons = '';
        if (booking.status === 'pending_payment') {
            const isDriver = currentUser?.role === 'driver' && booking.vehicleId?.driverId?._id?.toString() === currentUser._id?.toString();
            const isOwner = currentUser?.role === 'owner' && booking.vehicleId?.ownerId?._id?.toString() === currentUser._id?.toString();

            if (isDriver || isOwner) {
                const paymentStatus = booking.paymentStatus || {};
                const role = currentUser.role;
                const isConfirmed = paymentStatus[`${role}Confirmed`];

                if (!isConfirmed) {
                    paymentButtons = `
                        <button class="btn btn-success btn-sm" onclick="confirmPayment('${booking._id}')">
                            <i class="fas fa-check-circle me-1"></i>Confirm Payment Received
                        </button>`;
                } else {
                    paymentButtons = `
                        <span class="badge bg-success">
                            <i class="fas fa-check-circle me-1"></i>Payment Confirmed
                        </span>`;
                }
            }
        }

        // Payment status display
        let paymentStatus = '';
        if (booking.status === 'pending_payment' && booking.paymentStatus) {
            const ps = booking.paymentStatus;
            paymentStatus = `
                <div class="payment-status mt-3">
                    <strong class="d-block mb-2">Payment Status:</strong>
                    <div class="d-flex gap-3">
                        <div class="driver-status">
                            <i class="fas fa-user-tie me-1"></i>Driver: 
                            ${ps.driverConfirmed ? 
                                '<span class="text-success"><i class="fas fa-check-circle"></i></span>' : 
                                '<span class="text-danger"><i class="fas fa-times-circle"></i></span>'}
                    </div>
                        <div class="owner-status">
                            <i class="fas fa-user me-1"></i>Owner: 
                            ${ps.ownerConfirmed ? 
                                '<span class="text-success"><i class="fas fa-check-circle"></i></span>' : 
                                '<span class="text-danger"><i class="fas fa-times-circle"></i></span>'}
                    </div>
                    </div>
            </div>`;
        }

        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-ticket-alt me-2"></i>Booking #${booking._id}
                    </h5>
                    <span class="badge bg-${statusColor}">
                        <i class="fas fa-circle me-1"></i>${booking.status.replace('_', ' ')}
                    </span>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="booking-details">
                            <p class="mb-2">
                                <i class="fas fa-seedling me-2"></i>
                                <strong>Crop:</strong> ${booking.cropName}
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-map-marker-alt me-2"></i>
                                <strong>Pickup:</strong> ${booking.pickupLocation}
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-map-marker-alt me-2"></i>
                                <strong>Delivery:</strong> ${booking.deliveryLocation}
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-calendar-alt me-2"></i>
                                <strong>Dispatch Date:</strong> 
                                ${booking.dispatchDate ? 
                                    new Date(booking.dispatchDate).toLocaleString() : 
                                    (booking.vehicleId?.dispatchDateTime ? 
                                        new Date(booking.vehicleId.dispatchDateTime).toLocaleString() : 
                                        'Not set')}
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-weight-hanging me-2"></i>
                                <strong>Weight:</strong> ${booking.requiredCapacity.weight} kg
                            </p>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="contact-details">
                            <p class="mb-2">
                                <i class="fas fa-user-tie me-2"></i>
                                <strong>Driver:</strong> ${driver.name || 'N/A'} 
                                ${driver.mobileNumber ? `(${driver.mobileNumber})` : ''} 
                                ${driverRating}
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-user me-2"></i>
                                <strong>Owner:</strong> ${owner.name || 'N/A'} 
                                ${owner.mobileNumber ? `(${owner.mobileNumber})` : ''} 
                                ${ownerRating}
                            </p>
                        </div>
                    </div>
                </div>

                    ${billDisplay}
                ${paymentSummary}
                    ${paymentStatus}
                
                <div class="action-buttons mt-3 d-flex gap-2">
                ${statusButtons}
                ${paymentButtons}
                </div>
            </div>
        `;

        // Add hover effect styles
        card.style.transition = 'transform 0.2s, box-shadow 0.2s';
        card.addEventListener('mouseover', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        });
        card.addEventListener('mouseout', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        });

        bookingList.appendChild(card);
    });
}

// Update the updateBookingStatus function to include better error handling
async function updateBookingStatus(bookingId, newStatus) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update status');
        }

        const updatedBooking = await response.json();
        showSuccess('Status updated successfully!');
        loadBookings(); // Refresh the bookings list
    } catch (error) {
        showError('Failed to update status: ' + error.message);
    }
}

// Add the confirmPayment function
async function confirmPayment(bookingId) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/confirm-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to confirm payment');
        }

        const updatedBooking = await response.json();
        showSuccess('Payment confirmed successfully!');
        loadBookings(); // Refresh the bookings list
    } catch (error) {
        showError('Failed to confirm payment: ' + error.message);
    }
}

// UI Functions
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    if (pageName === 'driverDashboard' && currentUser && currentUser.role === 'driver') {
        document.getElementById('driverDashboard').classList.remove('d-none');
        updateDriverAvailabilityUI();
        return;
    }
    document.getElementById(`${pageName}Page`).classList.remove('d-none');

    // Show farmer search form only for farmers on vehicles page
    if (pageName === 'vehicles') {
        ensureAddVehicleButton();
        const searchForm = document.getElementById('farmerSearchForm');
        if (currentUser && currentUser.role === 'farmer') {
            searchForm.classList.remove('d-none');
        } else {
            searchForm.classList.add('d-none');
        }
        loadVehicles();
    }
    if (pageName === 'history') {
        loadHistory();
    }
    switch (pageName) {
        case 'bookings':
            loadBookings();
            break;
    }
}

function updateUI() {
    const driverNav = document.getElementById('driverDashboardNav');
    if (currentUser && currentUser.role === 'driver') {
        driverNav.style.display = '';
    } else {
        driverNav.style.display = 'none';
    }
    if (currentUser) {
        document.querySelector('.navbar-nav').classList.remove('me-auto');
        document.querySelector('.d-flex').innerHTML = `
            <span class="navbar-text me-3">Welcome, ${currentUser.name}</span>
            <button class="btn btn-outline-light" onclick="logout()">Logout</button>
        `;
    } else {
        document.querySelector('.navbar-nav').classList.add('me-auto');
        document.querySelector('.d-flex').innerHTML = `
            <button class="btn btn-outline-light me-2" id="loginBtn">Login</button>
            <button class="btn btn-outline-light" id="registerBtn">Register</button>
        `;
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    document.getElementById('driverDashboardNav').style.display = 'none';
    updateUI();
    showPage('home');
}

function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.textContent = message;
    document.getElementById('content').prepend(alert);
    setTimeout(() => alert.remove(), 5000);
}

function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.textContent = message;
    document.getElementById('content').prepend(alert);
    setTimeout(() => alert.remove(), 5000);
}

async function handleAddVehicle(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    // Collect all route stops
    const stops = [];
    for (const value of formData.getAll('routeStops[]')) {
        if (value && value.trim()) stops.push(value.trim());
    }
    const data = {
        vehicleNumber: formData.get('vehicleNumber'),
        capacity: {
            weight: parseFloat(formData.get('capacityWeight')),
            height: parseFloat(formData.get('capacityHeight'))
        },
        route: stops, // array of stops
        rent: formData.get('rent'), // string
        advance: parseFloat(formData.get('advance')),
        dispatchDateTime: formData.get('dispatchDateTime') || undefined,
        extraInfo: formData.get('extraInfo') || undefined,
        type: formData.get('type')
    };
    try {
        await makeRequest('POST', '/vehicles', data, true);
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
        showSuccess('Vehicle added successfully!');
        loadVehicles();
        e.target.reset();
    } catch (error) {
        console.error('Failed to add vehicle:', error);
    }
}

// --- Edit and Delete Vehicle Logic ---
window.openEditVehicleModal = function(vehicle) {
    const modal = new bootstrap.Modal(document.getElementById('editVehicleModal'));
    const form = document.getElementById('editVehicleForm');
    form.vehicleId.value = vehicle._id;
    form.vehicleNumber.value = vehicle.vehicleNumber;
    form.capacityWeight.value = vehicle.capacity.weight;
    form.capacityHeight.value = vehicle.capacity.height;
    form.rent.value = vehicle.rent;
    form.advance.value = vehicle.advance;
    // Fill route stops
    const stopsContainer = document.getElementById('editRouteStopsContainer');
    stopsContainer.innerHTML = '';
    vehicle.route.forEach(stop => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control mb-2';
        input.name = 'routeStops[]';
        input.value = stop;
        input.required = true;
        stopsContainer.appendChild(input);
    });
    // Add stop button logic
    document.getElementById('editAddStopBtn').onclick = function() {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control mb-2';
        input.name = 'routeStops[]';
        input.placeholder = 'Enter city or village';
        input.required = true;
        stopsContainer.appendChild(input);
    };
    // Pre-fill dispatchDateTime and extraInfo
    form.dispatchDateTime.value = vehicle.dispatchDateTime ? new Date(vehicle.dispatchDateTime).toISOString().slice(0,16) : '';
    form.extraInfo.value = vehicle.extraInfo || '';
    form.type.value = vehicle.type || '';
    modal.show();
};

document.getElementById('editVehicleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const vehicleId = formData.get('vehicleId');
    // Collect all route stops
    const stops = [];
    for (const value of formData.getAll('routeStops[]')) {
        if (value && value.trim()) stops.push(value.trim());
    }
    const data = {
        vehicleNumber: formData.get('vehicleNumber'),
        capacity: {
            weight: parseFloat(formData.get('capacityWeight')),
            height: parseFloat(formData.get('capacityHeight'))
        },
        route: stops,
        rent: formData.get('rent'),
        advance: parseFloat(formData.get('advance')),
        dispatchDateTime: formData.get('dispatchDateTime') || undefined,
        extraInfo: formData.get('extraInfo') || undefined,
        type: formData.get('type')
    };
    try {
        await makeRequest('PUT', `/vehicles/${vehicleId}`, data, true);
        bootstrap.Modal.getInstance(document.getElementById('editVehicleModal')).hide();
        showSuccess('Vehicle updated successfully!');
        loadVehicles();
    } catch (error) {
        showError('Failed to update vehicle');
    }
});

window.deleteVehicle = async function(vehicleId) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
        await makeRequest('DELETE', `/vehicles/${vehicleId}`, null, true);
        showSuccess('Vehicle deleted successfully!');
        loadVehicles();
    } catch (error) {
        showError('Failed to delete vehicle');
    }
};

// --- Driver Dashboard Logic ---
function showDriverDashboard() {
    document.querySelectorAll('.page').forEach(page => page.classList.add('d-none'));
    document.getElementById('driverDashboard').classList.remove('d-none');
    updateDriverAvailabilityUI();
    loadDriverBookings();
}

function updateDriverAvailabilityUI() {
    const statusSpan = document.getElementById('driverAvailabilityStatus');
    if (!currentUser) return;
    if (currentUser.available) {
        statusSpan.textContent = 'Available';
        statusSpan.className = 'badge bg-success';
    } else {
        statusSpan.textContent = 'Not Available';
        statusSpan.className = 'badge bg-danger';
    }
}

async function loadDriverBookings() {
    try {
        const bookings = await makeRequest('GET', '/bookings', null, true);
        // Use a dedicated list for driver dashboard if needed
        let driverBookingList = document.getElementById('driverBookingList');
        if (!driverBookingList) {
            driverBookingList = document.createElement('div');
            driverBookingList.id = 'driverBookingList';
            document.getElementById('driverDashboard').appendChild(driverBookingList);
        }
        driverBookingList.innerHTML = '';
        displayBookings(bookings);
    } catch (error) {
        showError('Failed to load driver bookings');
    }
}

// --- History Page Logic ---
async function loadHistory() {
    try {
        const history = await makeRequest('GET', '/bookings/history', null, true);
        displayHistory(history);
    } catch (error) {
        showError('Failed to load history');
    }
}

function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    if (!history || history.length === 0) {
        historyList.innerHTML = '<div class="alert alert-info">No booking history yet.</div>';
        return;
    }
    history.forEach(booking => {
        const vehicle = booking.vehicleId || {};
        const owner = vehicle.ownerId || {};
        const driver = vehicle.driverId || {};
        const farmer = booking.farmerId || {};
        
        // Safely access owner and driver information
        const ownerInfo = owner.name ? `<strong>Owner:</strong> ${owner.name} (${owner.mobileNumber || 'N/A'})<br>` : '';
        const driverInfo = driver.name ? `<strong>Driver:</strong> ${driver.name} (${driver.mobileNumber || 'N/A'})<br>` : '';
        
        // Payment summary calculations
        const advance = vehicle.advance || 0;
        const weight = booking.requiredCapacity?.weight || 0;
        const rentPerKg = parseFloat(vehicle.rent) || 0;
        const totalRent = weight * rentPerKg;
        const marketBill = booking.bill?.amount || 'Pending';
        const finalSettlement = booking.bill?.amount ? (booking.bill.amount + advance - totalRent) : 'Pending';

        const paymentSummary = `
            <div class="payment-summary card bg-light mt-3">
                <div class="card-header bg-primary text-white">
                    <strong><i class="fas fa-money-bill-wave me-2"></i>Payment Summary</strong>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-2">
                                <i class="fas fa-file-invoice-dollar me-2"></i>
                                <strong>Market Bill:</strong>
                                <span class="float-end">${typeof marketBill === 'number' ? '₹' + marketBill : marketBill}</span>
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-hand-holding-usd me-2"></i>
                                <strong>Advance Payment:</strong>
                                <span class="float-end">₹${advance}</span>
                            </p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-2">
                                <i class="fas fa-truck me-2"></i>
                                <strong>Total Rent:</strong>
                                <span class="float-end">₹${totalRent}</span>
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-calculator me-2"></i>
                                <strong>Final Settlement:</strong>
                                <span class="float-end">${typeof finalSettlement === 'number' ? '₹' + finalSettlement : finalSettlement}</span>
                            </p>
                        </div>
                    </div>
                    <div class="rent-details mt-2 text-muted small">
                        <i class="fas fa-info-circle me-1"></i>
                        Rent calculation: ${weight} kg × ₹${rentPerKg}/kg
                    </div>
                </div>
            </div>`;
        
        let billInfo = '<div><strong>Market Bill:</strong> ';
        if (booking.bill && booking.bill.fileUrl) {
            let billSrc = booking.bill.fileUrl;
            if (!billSrc.startsWith('http')) {
                billSrc = API_URL.replace('/api', '') + billSrc;
            }
            if (billSrc.match(/\.(jpg|jpeg|png|gif)$/i)) {
                billInfo += `<br><a href="${billSrc}" target="_blank"><img src="${billSrc}" alt="Market Bill" style="max-width:200px;max-height:200px;cursor:pointer;"></a>`;
            } else if (billSrc.match(/\.pdf$/i)) {
                billInfo += `<a href="${billSrc}" target="_blank">View PDF</a>`;
            } else {
                billInfo += `<a href="${billSrc}" target="_blank">Download</a>`;
            }
        } else {
            billInfo += 'Not uploaded';
        }
        billInfo += '</div>';
        let profitInfo = '';
        if (booking.profit) {
            profitInfo = `<strong>Profit Split:</strong> Farmer: ₹${booking.profit.farmerShare || 0}, Driver: ₹${booking.profit.driverShare || 0}, Owner: ₹${booking.profit.ownerShare || 0}<br>`;
        }
        historyList.innerHTML += `
            <div class="card mb-3 booking-card">
                <div class="card-body">
                    <h5 class="card-title">${vehicle.vehicleNumber || 'Vehicle'}</h5>
                    <p class="card-text">
                        <strong>Crop:</strong> ${booking.cropName}<br>
                        <strong>Weight:</strong> ${booking.requiredCapacity.weight} kg<br>
                        <strong>Route:</strong> ${vehicle.route ? vehicle.route.join(' → ') : ''}<br>
                        <strong>Pickup:</strong> ${booking.pickupLocation}<br>
                        <strong>Delivery:</strong> ${booking.deliveryLocation}<br>
                        <strong>Status:</strong> <span class="badge bg-${booking.status === 'completed' ? 'success' : 'secondary'}">${booking.status.replace('_', ' ')}</span><br>
                        <strong>Date:</strong> ${new Date(booking.bookingDate).toLocaleString()}<br>
                        ${ownerInfo}
                        ${driverInfo}
                        <strong>Farmer:</strong> ${farmer.name || ''} (${farmer.mobileNumber || ''})<br>
                        ${billInfo}
                        ${profitInfo}
                    </p>
                    ${paymentSummary}
                </div>
            </div>
        `;
    });
}

// Ensure Add Vehicle button is visible for owners
function ensureAddVehicleButton() {
    const vehiclesPage = document.getElementById('vehiclesPage');
    if (!vehiclesPage) return;
    let addBtn = document.getElementById('addVehicleBtn');
    if (currentUser && currentUser.role === 'owner') {
        if (!addBtn) {
            addBtn = document.createElement('button');
            addBtn.className = 'btn btn-success mb-3';
            addBtn.textContent = 'Add Vehicle';
            addBtn.id = 'addVehicleBtn';
            addBtn.setAttribute('data-bs-toggle', 'modal');
            addBtn.setAttribute('data-bs-target', '#addVehicleModal');
            vehiclesPage.insertBefore(addBtn, vehiclesPage.firstChild);
        }
        addBtn.style.display = '';
    } else if (addBtn) {
        addBtn.style.display = 'none';
    }
}

// Add function to show bill upload modal
function showBillUploadModal(bookingId) {
    const modalElement = document.getElementById('billUploadModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('billUploadForm');
    form.reset();
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const amount = formData.get('amount');
        const file = formData.get('billFile');
        try {
            // Upload the file to /api/upload
            const fileFormData = new FormData();
            fileFormData.append('file', file);
            const uploadResponse = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: fileFormData
            });
            if (!uploadResponse.ok) throw new Error('Failed to upload file');
            const { fileUrl } = await uploadResponse.json();
            console.log('Bill upload fileUrl:', fileUrl); // DEBUG

            if (!fileUrl) {
                showError('Bill upload failed: No fileUrl returned.');
                return;
            }

            // Update the booking with bill info
            const response = await fetch(`${API_URL}/bookings/${bookingId}/bill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ amount: parseFloat(amount), fileUrl })
            });
            if (!response.ok) throw new Error('Failed to update booking with bill');
            modal.hide();
            showSuccess('Bill uploaded successfully!');
            loadBookings();
        } catch (error) {
            showError('Failed to upload bill: ' + error.message);
        }
    };
    modal.show();
}

// Add global function for rating submission
window.submitRating = async function(event, bookingId) {
    event.preventDefault();
    const form = event.target;
    const driverRating = form.driverRating.value;
    const ownerRating = form.ownerRating.value;
    const review = form.review.value;
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ driverRating, ownerRating, review })
        });
        if (!response.ok) throw new Error('Failed to submit rating');
        showSuccess('Rating submitted!');
        loadBookings();
    } catch (error) {
        showError('Failed to submit rating: ' + error.message);
    }
    return false;
} 