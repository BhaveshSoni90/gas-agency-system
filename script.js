// Import Firebase libraries
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, getDocs, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQxT_bH43EJn2WMtZ5daWzCnXxSvvUzso",
  authDomain: "gas-company-833f9.firebaseapp.com",
  projectId: "gas-company-833f9",
  storageBucket: "gas-company-833f9.appspot.com",
  messagingSenderId: "159581044707",
  appId: "1:159581044707:web:2ab3731714330784f8ead6",
  measurementId: "G-NNRJWKN5T4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Function to send email notification using Firebase Cloud Function
async function sendNotificationEmail(to, subject, html) {
  try {
    const response = await fetch('https://<your-region>-<your-project-id>.cloudfunctions.net/sendEmail', { // Replace with your Cloud Function URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, html })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok.');
    }

    const result = await response.text();
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Function to load requests for the admin dashboard
export const loadAdminRequests = async () => {
  const requestsList = document.getElementById('requests-list');
  const approvedRequestsList = document.getElementById('approved-requests-list');
  const rejectedRequestsList = document.getElementById('rejected-requests-list');

  try {
    const requestsQuery = query(collection(firestore, 'requests'));
    const querySnapshot = await getDocs(requestsQuery);

    requestsList.innerHTML = '';
    approvedRequestsList.innerHTML = '';
    rejectedRequestsList.innerHTML = '';

    if (querySnapshot.empty) {
      const li = document.createElement('li');
      li.textContent = 'No requests available.';
      requestsList.appendChild(li);
    } else {
      querySnapshot.forEach((doc) => {
        const request = doc.data();
        const li = document.createElement('li');
        li.innerHTML = `
          Request ID: ${doc.id}, Quantity: ${request.quantity}, Status: ${request.status}
          <button onclick="approveRequest('${doc.id}')">Approve</button>
          <button onclick="rejectRequest('${doc.id}')">Reject</button>
        `;
        if (request.status === 'pending') {
          requestsList.appendChild(li);
        } else if (request.status === 'approved') {
          approvedRequestsList.innerHTML += `
            <li>Request ID: ${doc.id}, Quantity: ${request.quantity}, Status: ${request.status}</li>
          `;
        } else if (request.status === 'rejected') {
          rejectedRequestsList.innerHTML += `
            <li>Request ID: ${doc.id}, Quantity: ${request.quantity}, Status: ${request.status}</li>
          `;
        }
      });
    }
  } catch (error) {
    console.error("Error loading requests:", error);
  }
};

// Function to approve a request
window.approveRequest = async (requestId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to perform this action.');
    return;
  }

  try {
    const requestRef = doc(firestore, 'requests', requestId);
    await updateDoc(requestRef, { status: 'approved' });
    alert('Request approved.');
    loadAdminRequests(); // Refresh the request list

    // Send email notification to the user
    await sendNotificationEmail(
      'user@example.com', // Replace with the user's email retrieved from Firestore
      'Your Request has been Approved',
      `<p>Your request with ID ${requestId} has been approved.</p>`
    );
  } catch (error) {
    console.error("Error approving request:", error);
    alert('Failed to approve request: ' + error.message);
  }
};

// Function to reject a request
export const rejectRequest = async (requestId) => {
  try {
    const requestRef = doc(firestore, 'requests', requestId);
    await updateDoc(requestRef, { status: 'rejected' });
    alert('Request rejected.');
    loadAdminRequests(); // Refresh the request list

    // Send email notification to the user
    await sendNotificationEmail(
      'user@example.com', // Replace with the user's email retrieved from Firestore
      'Your Request has been Rejected',
      `<p>Your request with ID ${requestId} has been rejected.</p>`
    );
  } catch (error) {
    console.error("Error rejecting request:", error);
    alert('Failed to reject request: ' + error.message);
  }
};

// Function to request a cylinder from the user dashboard
export const requestCylinder = async (quantity) => {
  const user = auth.currentUser;
  if (!user) {
    document.getElementById('request-message').textContent = 'You must be logged in to request a cylinder.';
    return;
  }

  try {
    await addDoc(collection(firestore, 'requests'), {
      quantity,
      status: 'pending',
      userId: user.uid
    });
    document.getElementById('request-message').textContent = 'Request submitted successfully.';
    document.getElementById('cylinder-quantity').value = '';
    loadUserBookingHistory(); // Refresh the booking history
  } catch (error) {
    console.error("Error submitting request:", error);
    document.getElementById('request-message').textContent = 'Failed to submit request: ' + error.message;
  }
};

// Function to load booking history for the user dashboard
export const loadUserBookingHistory = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const bookingHistoryList = document.getElementById('booking-history-list');
  const approvedBookingsList = document.getElementById('approved-bookings-list');

  try {
    const bookingsQuery = query(collection(firestore, 'requests'), where('userId', '==', user.uid));
    const querySnapshot = await getDocs(bookingsQuery);

    bookingHistoryList.innerHTML = '';
    approvedBookingsList.innerHTML = '';

    if (querySnapshot.empty) {
      const li = document.createElement('li');
      li.textContent = 'No booking history available.';
      bookingHistoryList.appendChild(li);
    } else {
      querySnapshot.forEach((doc) => {
        const request = doc.data();
        const li = document.createElement('li');
        li.textContent = `Request ID: ${doc.id}, Quantity: ${request.quantity}, Status: ${request.status}`;

        // Add to booking history
        bookingHistoryList.appendChild(li);

        // Add to approved bookings if status is 'approved'
        if (request.status === 'approved') {
          const approveLi = document.createElement('li');
          approveLi.innerHTML = `
            Request ID: ${doc.id}, Quantity: ${request.quantity}, Status: ${request.status}
            <select id="payment-method-${doc.id}">
              <option value="cash">Cash on Delivery</option>
              <option value="paytm">Paytm</option>
            </select>
            <button onclick="handlePayment('${doc.id}')">Pay Now</button>
          `;
          approvedBookingsList.appendChild(approveLi);
        }
      });
    }
  } catch (error) {
    console.error("Error loading booking history:", error);
  }
};

// Function to handle payment for the user dashboard
export const handlePayment = async (requestId) => {
  const paymentMethod = document.getElementById(`payment-method-${requestId}`).value;

  if (paymentMethod === 'paytm') {
    // Show payment section for Paytm
    document.getElementById('payment-section').style.display = 'block';
    // For demo purposes, a placeholder QR code URL is used. Replace with actual QR code URL.
    document.getElementById('paytm-qr-code').src = 'path/to/paytm-qr-code.png';
    alert('Please scan the QR code to complete the payment.');
  } else {
    // Cash on delivery handling can be done here
    alert('Your booking will be processed with Cash on Delivery.');
  }

  // After payment, update request status if needed
  const requestRef = doc(firestore, 'requests', requestId);
  await updateDoc(requestRef, { status: 'paid' });
  loadUserBookingHistory(); // Refresh booking history after payment
};

// Function to handle logout
export const handleLogout = () => {
  auth.signOut().then(() => {
    window.location.href = 'login.html';
  }).catch((error) => {
    console.error("Error logging out:", error);
  });
};
