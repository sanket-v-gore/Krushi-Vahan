const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:3000/api';

// Helper function to make authenticated requests
const makeAuthRequest = async (method, url, data = null, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await axios({
      method,
      url: `${API_URL}${url}`,
      data,
      headers
    });
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test the complete system flow
const testSystem = async () => {
  try {
    console.log('Starting system test...\n');

    // 1. Register users
    console.log('1. Registering users...');
    
    const farmerData = {
      name: "Farmer John",
      mobileNumber: "1234567890",
      address: "Farm Address",
      username: "farmer1",
      password: "password123",
      role: "farmer"
    };

    const ownerData = {
      name: "Owner Mike",
      mobileNumber: "9876543210",
      address: "Owner Address",
      username: "owner1",
      password: "password123",
      role: "owner",
      advanceAmount: 1000,
      rent: 5000,
      routeInfo: "Pandharpur to Pune"
    };

    const driverData = {
      name: "Driver Sam",
      mobileNumber: "5555555555",
      address: "Driver Address",
      username: "driver1",
      password: "password123",
      role: "driver",
      licenseNumber: "DL123456",
      experience: 5
    };

    await makeAuthRequest('post', '/auth/register', farmerData);
    await makeAuthRequest('post', '/auth/register', ownerData);
    await makeAuthRequest('post', '/auth/register', driverData);
    console.log('Users registered successfully\n');

    // 2. Login users
    console.log('2. Logging in users...');
    
    const farmerLogin = await makeAuthRequest('post', '/auth/login', {
      username: "farmer1",
      password: "password123"
    });

    const ownerLogin = await makeAuthRequest('post', '/auth/login', {
      username: "owner1",
      password: "password123"
    });

    const driverLogin = await makeAuthRequest('post', '/auth/login', {
      username: "driver1",
      password: "password123"
    });

    console.log('Users logged in successfully\n');

    // 3. Owner adds vehicle
    console.log('3. Owner adding vehicle...');
    
    const vehicleData = {
      vehicleNumber: "MH12AB1234",
      capacity: {
        weight: 1000,
        height: 10
      },
      route: {
        from: "Pandharpur",
        to: "Pune",
        intermediateStops: ["Indapur"]
      },
      rent: 5000,
      advance: 1000
    };

    const vehicle = await makeAuthRequest('post', '/vehicles', vehicleData, ownerLogin.token);
    console.log('Vehicle added successfully\n');

    // 4. Owner assigns driver to vehicle
    console.log('4. Assigning driver to vehicle...');
    
    await makeAuthRequest(
      'post',
      `/vehicles/${vehicle._id}/assign-driver/${driverLogin.user.id}`,
      null,
      ownerLogin.token
    );
    console.log('Driver assigned successfully\n');

    // 5. Farmer searches for vehicles
    console.log('5. Farmer searching for vehicles...');
    
    const availableVehicles = await makeAuthRequest(
      'get',
      '/vehicles/search?from=Pandharpur&to=Pune&capacity=500',
      null,
      farmerLogin.token
    );
    console.log('Vehicles found:', availableVehicles.length, '\n');

    // 6. Farmer creates booking
    console.log('6. Farmer creating booking...');
    
    const bookingData = {
      vehicleId: vehicle._id,
      cropName: "Wheat",
      requiredCapacity: {
        weight: 500,
        height: 5
      },
      pickupLocation: "Pandharpur",
      deliveryLocation: "Pune",
      bookingDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
    };

    const booking = await makeAuthRequest(
      'post',
      '/bookings',
      bookingData,
      farmerLogin.token
    );
    console.log('Booking created successfully\n');

    // 7. Driver updates booking status
    console.log('7. Driver updating booking status...');
    
    await makeAuthRequest(
      'put',
      `/bookings/${booking._id}/status`,
      { status: "in-transit" },
      driverLogin.token
    );
    console.log('Booking status updated to in-transit\n');

    // 8. Driver uploads bill
    console.log('8. Driver uploading bill...');
    
    await makeAuthRequest(
      'put',
      `/bookings/${booking._id}/status`,
      { status: "completed" },
      driverLogin.token
    );

    await makeAuthRequest(
      'post',
      `/bookings/${booking._id}/bill`,
      {
        amount: 10000,
        fileUrl: "https://example.com/bill.pdf"
      },
      driverLogin.token
    );
    console.log('Bill uploaded successfully\n');

    // 9. Farmer adds review
    console.log('9. Farmer adding review...');
    
    await makeAuthRequest(
      'post',
      '/reviews',
      {
        bookingId: booking._id,
        rating: 4.5,
        comment: "Great service, on-time delivery"
      },
      farmerLogin.token
    );
    console.log('Review added successfully\n');

    // 10. Check driver reviews
    console.log('10. Checking driver reviews...');
    
    const driverReviews = await makeAuthRequest(
      'get',
      `/reviews/driver/${driverLogin.user.id}`,
      null,
      farmerLogin.token
    );
    console.log('Driver reviews:', driverReviews);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the tests
testSystem(); 