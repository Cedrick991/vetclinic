// Staff Dashboard Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchBar = document.querySelector('.search-bar');
    const searchIcon = document.querySelector('.search-icon');

    if (searchBar) {
        // Add search functionality
        searchBar.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();

            if (searchTerm === '') {
                // Show all content when search is empty
                showAllContent();
                return;
            }

            // Search in different sections
            searchInAppointments(searchTerm);
            searchInClients(searchTerm);
            searchInPets(searchTerm);
        });

        // Add search icon click functionality
        if (searchIcon) {
            searchIcon.addEventListener('click', function() {
                searchBar.focus();
            });
        }

        // Add Enter key functionality
        searchBar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(searchBar.value.toLowerCase().trim());
            }
        });
    }
});

// Show all content (remove search filters)
function showAllContent() {
    // Show all appointment cards
    const appointmentCards = document.querySelectorAll('.appointment-card, .data-table tbody tr');
    appointmentCards.forEach(card => {
        card.style.display = '';
    });

    // Show all client cards/rows
    const clientElements = document.querySelectorAll('.client-card, .clients-table tbody tr');
    clientElements.forEach(element => {
        element.style.display = '';
    });

    // Show all pet cards/rows
    const petElements = document.querySelectorAll('.pet-card, .pets-table tbody tr');
    petElements.forEach(element => {
        element.style.display = '';
    });
}

// Search in appointments
function searchInAppointments(searchTerm) {
    const appointmentElements = document.querySelectorAll('.appointment-card, .data-table tbody tr');

    appointmentElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        const shouldShow = text.includes(searchTerm);

        if (element.tagName === 'TR') {
            // Handle table rows
            element.style.display = shouldShow ? '' : 'none';
        } else {
            // Handle cards
            element.style.display = shouldShow ? 'block' : 'none';
        }
    });
}

// Search in clients
function searchInClients(searchTerm) {
    const clientElements = document.querySelectorAll('.client-card, .clients-table tbody tr');

    clientElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        const shouldShow = text.includes(searchTerm);

        if (element.tagName === 'TR') {
            // Handle table rows
            element.style.display = shouldShow ? '' : 'none';
        } else {
            // Handle cards
            element.style.display = shouldShow ? 'block' : 'none';
        }
    });
}

// Search in pets
function searchInPets(searchTerm) {
    const petElements = document.querySelectorAll('.pet-card, .pets-table tbody tr');

    petElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        const shouldShow = text.includes(searchTerm);

        if (element.tagName === 'TR') {
            // Handle table rows
            element.style.display = shouldShow ? '' : 'none';
        } else {
            // Handle cards
            element.style.display = shouldShow ? 'block' : 'none';
        }
    });
}

// Perform comprehensive search
function performSearch(searchTerm) {
    if (searchTerm === '') {
        showAllContent();
        return;
    }

    // Hide all elements first
    const allElements = document.querySelectorAll('.appointment-card, .client-card, .pet-card, .data-table tbody tr, .clients-table tbody tr, .pets-table tbody tr');
    allElements.forEach(element => {
        element.style.display = 'none';
    });

    // Show matching elements
    const matchingElements = document.querySelectorAll('.appointment-card, .client-card, .pet-card, .data-table tbody tr, .clients-table tbody tr, .pets-table tbody tr');
    matchingElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            if (element.tagName === 'TR') {
                element.style.display = '';
            } else {
                element.style.display = 'block';
            }
        }
    });
}
