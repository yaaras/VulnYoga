// Global variables
let allItems = [];
let filteredItems = [];
let currentFilter = 'all';
let cartItems = [];
let currentUser = null;
let cartItemCount = 0; // Cache cart count to avoid API calls
let cartData = null; // Cache full cart data
let cartUpdateTimeout = null; // Debounce cart updates

// API base URL
const API_BASE = window.location.origin;

// DOM elements
const itemsGrid = document.getElementById('itemsGrid');
const loading = document.getElementById('loading');
const noItems = document.getElementById('noItems');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const loginBtn = document.getElementById('loginBtn');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const itemModal = document.getElementById('itemModal');
const cartModal = document.getElementById('cartModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load items and setup event listeners in parallel
    Promise.all([
        loadItems(),
        setupEventListeners()
    ]).catch(error => {
        console.error('Initialization error:', error);
    });
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterItems();
        });
    });
    
    // Modal functionality
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });
    
    // Cart button functionality
    cartBtn.addEventListener('click', () => {
        cartModal.style.display = 'block';
        loadCart();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
        if (e.target === itemModal) {
            itemModal.style.display = 'none';
        }
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
    
    // Close modals with X button
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            itemModal.style.display = 'none';
            cartModal.style.display = 'none';
        });
    });
    
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Register form submission
    registerForm.addEventListener('submit', handleRegister);
    
    // Switch between login and register modals
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'block';
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (itemsGrid) itemsGrid.style.display = show ? 'none' : 'grid';
}

function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load items from API
async function loadItems() {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/api/v1/items`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allItems = await response.json();
        filteredItems = [...allItems];
        renderItems();
        showLoading(false);
    } catch (error) {
        console.error('Error loading items:', error);
        showError('Failed to load items. Please try again later.');
        showLoading(false);
    }
}

// Render items in the grid (optimized with virtual scrolling for large lists)
function renderItems() {
    if (filteredItems.length === 0) {
        itemsGrid.style.display = 'none';
        noItems.style.display = 'block';
        return;
    }
    
    itemsGrid.style.display = 'grid';
    noItems.style.display = 'none';
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Limit initial render to first 20 items for better performance
    const itemsToRender = filteredItems.slice(0, 20);
    
    itemsToRender.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <div class="item-image" onclick="showItemDetail(${item.id})">
                ${getItemIcon(item.name)}
            </div>
            <div class="item-content" onclick="showItemDetail(${item.id})">
                <h3 class="item-title">${escapeHtml(item.name)}</h3>
                <p class="item-description">${escapeHtml(item.description)}</p>
                <div class="item-price">$${item.price.toFixed(2)}</div>
                <div class="item-stock">
                    <i class="fas fa-check-circle"></i>
                    ${item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                </div>
                ${item.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
            </div>
            <div class="item-card-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${item.id})">
                    <i class="fas fa-shopping-cart"></i>
                    Add to Cart
                </button>
            </div>
        `;
        fragment.appendChild(itemCard);
    });
    
    // Clear and append all at once
    itemsGrid.innerHTML = '';
    itemsGrid.appendChild(fragment);
    
    // If there are more items, add a "Load More" button
    if (filteredItems.length > 20) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn btn-secondary load-more-btn';
        loadMoreBtn.textContent = `Load More (${filteredItems.length - 20} remaining)`;
        loadMoreBtn.onclick = () => loadMoreItems();
        itemsGrid.appendChild(loadMoreBtn);
    }
}

// Load more items for virtual scrolling
function loadMoreItems() {
    const currentCount = itemsGrid.children.length - 1; // Subtract load more button
    const nextBatch = filteredItems.slice(currentCount, currentCount + 20);
    
    nextBatch.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <div class="item-image" onclick="showItemDetail(${item.id})">
                ${getItemIcon(item.name)}
            </div>
            <div class="item-content" onclick="showItemDetail(${item.id})">
                <h3 class="item-title">${escapeHtml(item.name)}</h3>
                <p class="item-description">${escapeHtml(item.description)}</p>
                <div class="item-price">$${item.price.toFixed(2)}</div>
                <div class="item-stock">
                    <i class="fas fa-check-circle"></i>
                    ${item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                </div>
                ${item.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
            </div>
            <div class="item-card-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${item.id})">
                    <i class="fas fa-shopping-cart"></i>
                    Add to Cart
                </button>
            </div>
        `;
        itemsGrid.insertBefore(itemCard, itemsGrid.lastChild);
    });
    
    // Update or remove load more button
    const remaining = filteredItems.length - (currentCount + nextBatch.length);
    if (remaining > 0) {
        itemsGrid.lastChild.textContent = `Load More (${remaining} remaining)`;
    } else {
        itemsGrid.lastChild.remove();
    }
}

// Get appropriate icon path for item type
function getItemIconPath(itemName) {
    const name = itemName.toLowerCase();
    let iconPath = '/public/images/yoga-mat.svg'; // Default icon
    
    if (name.includes('mat')) iconPath = '/public/images/premium_yoga_mat.png';
    else if (name.includes('block')) iconPath = '/public/images/yoga_blocks.png';
    else if (name.includes('strap')) iconPath = '/public/images/yoga_strap.png';
    else if (name.includes('cushion')) iconPath = '/public/images/meditation_cushion.png';
    else if (name.includes('towel')) iconPath = '/public/images/yoga_towel.png';
    else if (name.includes('bag')) iconPath = '/public/images/yoga_bag.png';
    else if (name.includes('wheel')) iconPath = '/public/images/yoga_wheel.png';
    else if (name.includes('oil')) iconPath = '/public/images/yoga_essentials_oils.png';
    else if (name.includes('journal')) iconPath = '/public/images/yoga_journal.png';
    else if (name.includes('sock')) iconPath = '/public/images/yoga_socks.png';
    else if (name.includes('class') || name.includes('course')) {
        if (name.includes('advanced')) iconPath = '/public/images/yoga_online_class_advanced.png';
        else if (name.includes('beginner')) iconPath = '/public/images/yoga_class_beginner.png';
        else iconPath = '/public/images/yoga_class_beginner.png'; // Default to beginner if unspecified
    }
    
    return iconPath;
}

// Get appropriate icon for item type (optimized with lazy loading)
function getItemIcon(itemName, size = 'small') {
    const name = itemName.toLowerCase();
    const iconPath = getItemIconPath(itemName);
    
    return `<img src="${iconPath}" alt="${name}" loading="lazy">`;
}

// Show item detail modal
async function showItemDetail(itemId) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/items/${itemId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const item = await response.json();
        const itemDetail = document.getElementById('itemDetail');
        
        itemDetail.innerHTML = `
            <div class="item-image">
                ${getItemIcon(item.name, 'large')}
            </div>
            <h2>${escapeHtml(item.name)}</h2>
            <p class="item-description">${escapeHtml(item.description)}</p>
            <div class="item-price">$${item.price.toFixed(2)}</div>
            <div class="item-stock">
                <i class="fas fa-check-circle"></i>
                ${item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
            </div>
            ${item.isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
            <div class="item-quantity">
                <label for="itemQty">Quantity:</label>
                <div class="quantity-selector">
                    <button class="btn btn-sm btn-secondary" onclick="changeQuantity(-1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" id="itemQty" value="1" min="1" max="${item.stock}" class="quantity-input">
                    <button class="btn btn-sm btn-secondary" onclick="changeQuantity(1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary" onclick="addToCartWithQuantity(${item.id})">
                    <i class="fas fa-shopping-cart"></i>
                    Add to Cart
                </button>
                <button class="btn btn-primary" onclick="buyNow(${item.id})">
                    <i class="fas fa-credit-card"></i>
                    Buy Now
                </button>
            </div>
        `;
        
        itemModal.style.display = 'block';
    } catch (error) {
        console.error('Error loading item detail:', error);
        showError('Failed to load item details.');
    }
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    filterItems(searchTerm);
}

// Filter items based on search and current filter
function filterItems(searchTerm = '') {
    filteredItems = allItems.filter(item => {
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm);
        
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter === 'featured' && item.isFeatured) ||
            (currentFilter === 'mats' && item.name.toLowerCase().includes('mat')) ||
            (currentFilter === 'props' && !item.name.toLowerCase().includes('mat'));
        
        return matchesSearch && matchesFilter;
    });
    
    renderItems();
}

// Cart functions
async function addToCart(itemId) {
    if (!localStorage.getItem('token')) {
        showError('Please login to add items to cart');
        loginModal.style.display = 'block';
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId,
                qty: 1
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccess('Item added to cart successfully!');
            
            // Update cart count immediately from response
            if (data.cart && data.cart.items) {
                cartItemCount = data.cart.items.length;
                cartCount.textContent = cartItemCount;
            }
            
            // Debounced cart update
            debouncedCartUpdate();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add item to cart');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showError('Failed to add item to cart. Please try again.');
    }
}

async function addToCartWithQuantity(itemId) {
    if (!localStorage.getItem('token')) {
        showError('Please login to add items to cart');
        loginModal.style.display = 'block';
        return;
    }
    
    const quantity = parseInt(document.getElementById('itemQty').value);
    if (isNaN(quantity) || quantity < 1) {
        showError('Please enter a valid quantity');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId,
                qty: quantity
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccess(`${quantity} item(s) added to cart successfully!`);
            
            // Update cart count immediately from response
            if (data.cart && data.cart.items) {
                cartCount = data.cart.items.length;
                cartCount.textContent = cartCount;
            }
            
            // Debounced cart update
            debouncedCartUpdate();
            
            // Close item modal
            itemModal.style.display = 'none';
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add item to cart');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showError('Failed to add item to cart. Please try again.');
    }
}

function changeQuantity(delta) {
    const qtyInput = document.getElementById('itemQty');
    const currentQty = parseInt(qtyInput.value);
    const newQty = currentQty + delta;
    
    if (newQty >= 1 && newQty <= parseInt(qtyInput.max)) {
        qtyInput.value = newQty;
    }
}

function buyNow(itemId) {
    if (!localStorage.getItem('token')) {
        showError('Please login to purchase items');
        loginModal.style.display = 'block';
        return;
    }
    
    showSuccess('Purchase successful! (Demo functionality)');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            loginModal.style.display = 'none';
            showSuccess('Login successful!');
            
            // Update UI for logged in user
            updateLoginUI(data.user);
        } else {
            const error = await response.json();
            showError(error.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const address = document.getElementById('regAddress').value;
    const phone = document.getElementById('regPhone').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                email, 
                password, 
                address: address || undefined, 
                phone: phone || undefined 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            registerModal.style.display = 'none';
            showSuccess('Registration successful! Welcome to VulnYoga!');
            
            // Update UI for logged in user
            updateLoginUI(data.user);
            
            // Clear form
            registerForm.reset();
        } else {
            const error = await response.json();
            showError(error.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please try again.');
    }
}

// Update UI for logged in user
function updateLoginUI(user) {
    currentUser = user;
    loginBtn.innerHTML = `<i class="fas fa-user"></i> ${user.name}`;
    cartBtn.style.display = 'inline-block';
    
    // Update cart count
    updateCartCount();
    
    loginBtn.onclick = () => {
        // Show user menu or logout
        if (confirm('Do you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            currentUser = null;
            loginBtn.innerHTML = 'Login';
            loginBtn.onclick = () => loginModal.style.display = 'block';
            cartBtn.style.display = 'none';
            cartCount.textContent = '0';
            cartItems = [];
            cartItemCount = 0;
        }
    };
}

// Add to cart functionality
async function addToCart(itemId) {
    if (!localStorage.getItem('token')) {
        showError('Please login to add items to cart');
        loginModal.style.display = 'block';
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId,
                qty: 1
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccess('Item added to cart successfully!');
            
            // Update cart count immediately from response
            if (data.cart && data.cart.items) {
                cartCount = data.cart.items.length;
                cartCount.textContent = cartCount;
            }
            
            // Debounced cart update
            debouncedCartUpdate();
            
            // Close item modal
            itemModal.style.display = 'none';
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add item to cart');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showError('Failed to add item to cart. Please try again.');
    }
}

// Add to cart with quantity from modal
async function addToCartWithQuantity(itemId) {
    if (!localStorage.getItem('token')) {
        showError('Please login to add items to cart');
        loginModal.style.display = 'block';
        return;
    }
    
    const quantity = parseInt(document.getElementById('itemQty').value);
    if (isNaN(quantity) || quantity < 1) {
        showError('Please enter a valid quantity');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId,
                qty: quantity
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccess(`${quantity} item(s) added to cart successfully!`);
            
            // Update cart count immediately from response
            if (data.cart && data.cart.items) {
                cartCount = data.cart.items.length;
                cartCount.textContent = cartCount;
            }
            
            // Debounced cart update
            debouncedCartUpdate();
            
            // Close item modal
            itemModal.style.display = 'none';
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add item to cart');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showError('Failed to add item to cart. Please try again.');
    }
}

// Change quantity in item modal
function changeQuantity(delta) {
    const qtyInput = document.getElementById('itemQty');
    const currentQty = parseInt(qtyInput.value);
    const newQty = currentQty + delta;
    
    if (newQty >= 1 && newQty <= parseInt(qtyInput.max)) {
        qtyInput.value = newQty;
    }
}

// Buy now functionality
function buyNow(itemId) {
    if (!localStorage.getItem('token')) {
        showError('Please login to purchase items');
        loginModal.style.display = 'block';
        return;
    }
    
    showSuccess('Purchase successful! (Demo functionality)');
}

// Load cart from API with caching
async function loadCart(forceRefresh = false) {
    if (!localStorage.getItem('token')) {
        return;
    }
    
    // Use cached data if available and not forcing refresh
    if (!forceRefresh && cartData && cartItems.length > 0) {
        renderCart();
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            cartData = await response.json();
            cartItems = cartData.items || [];
            cartItemCount = cartItems.length;
            cartCount.textContent = cartItemCount;
            renderCart();
        } else {
            console.error('Failed to load cart');
        }
    } catch (error) {
        console.error('Load cart error:', error);
    }
}

// Render cart items
function renderCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmptyDiv = document.getElementById('cartEmpty');
    const cartSummaryDiv = document.getElementById('cartSummary');
    
    if (cartItems.length === 0) {
        cartItemsDiv.style.display = 'none';
        cartEmptyDiv.style.display = 'block';
        cartSummaryDiv.style.display = 'none';
        return;
    }
    
    cartItemsDiv.style.display = 'block';
    cartEmptyDiv.style.display = 'none';
    cartSummaryDiv.style.display = 'block';
    
    // Calculate total
    let total = 0;
    cartItemsDiv.innerHTML = cartItems.map(item => {
        const itemData = allItems.find(i => i.id === item.itemId);
        if (itemData) {
            total += itemData.price * item.qty;
            return `
                <div class="cart-item">
                    <div class="cart-item-image">
                        ${getItemIcon(itemData.name)}
                    </div>
                    <div class="cart-item-details">
                        <h4>${escapeHtml(itemData.name)}</h4>
                        <p>$${itemData.price.toFixed(2)} x ${item.qty}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="updateCartItem(${item.itemId}, ${item.qty - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="cart-item-qty">${item.qty}</span>
                        <button class="btn btn-sm btn-secondary" onclick="updateCartItem(${item.itemId}, ${item.qty + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.itemId})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        return '';
    }).join('');
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

// Update cart item quantity
async function updateCartItem(itemId, newQty) {
    if (newQty <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId,
                qty: newQty
            })
        });
        
        if (response.ok) {
            // Debounced cart update
            debouncedCartUpdate();
        }
    } catch (error) {
        console.error('Update cart error:', error);
    }
}

// Remove item from cart
async function removeFromCart(itemId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId
            })
        });
        
        if (response.ok) {
            // Update count immediately
            cartItemCount = Math.max(0, cartItemCount - 1);
            cartCount.textContent = cartItemCount;
            
            // Debounced cart update
            debouncedCartUpdate();
            showSuccess('Item removed from cart');
        }
    } catch (error) {
        console.error('Remove from cart error:', error);
    }
}

// Clear cart
async function clearCart() {
    if (!confirm('Are you sure you want to clear your cart?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/clear`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            cartItems = [];
            cartItemCount = 0;
            cartCount.textContent = '0';
            cartData = null;
            renderCart();
            showSuccess('Cart cleared successfully');
        }
    } catch (error) {
        console.error('Clear cart error:', error);
    }
}

// Update cart count in navigation (optimized with caching)
function updateCartCount() {
    if (!localStorage.getItem('token')) {
        cartCount.textContent = '0';
        cartItemCount = 0;
        return;
    }
    
    // Use cached count if available
    if (cartItemCount !== null) {
        cartCount.textContent = cartItemCount;
        return;
    }
    
    // Fallback to API call only if no cached data
    updateCartCountFromAPI();
}

// Fallback API call for cart count (only when needed)
async function updateCartCountFromAPI() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            cartItemCount = data.items ? data.items.length : 0;
            cartCount.textContent = cartItemCount;
        }
    } catch (error) {
        console.error('Update cart count error:', error);
    }
}

// Checkout function
function checkout() {
    showSuccess('Checkout functionality coming soon!');
}

// Debounced cart update to avoid excessive API calls
function debouncedCartUpdate() {
    if (cartUpdateTimeout) {
        clearTimeout(cartUpdateTimeout);
    }
    
    cartUpdateTimeout = setTimeout(() => {
        loadCart(true); // Force refresh
        cartUpdateTimeout = null;
    }, 300); // 300ms delay
}

// Utility functions
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    itemsGrid.style.display = show ? 'none' : 'grid';
}

function showError(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function scrollToShop() {
    document.getElementById('shop').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    const user = localStorage.getItem('user');
    if (user) {
        updateLoginUI(JSON.parse(user));
    }
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .featured-badge {
        background: #ffc107;
        color: #333;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        display: inline-block;
        margin-top: 0.5rem;
    }
    
    /* Cart Styles */
    .cart-items {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 1rem;
    }
    
    .cart-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        background: #f9f9f9;
    }
    
    .cart-item-image {
        margin-right: 1rem;
    }
    
    .cart-item-image img {
        width: 50px;
        height: 50px;
    }
    
    .cart-item-details {
        flex: 1;
    }
    
    .cart-item-details h4 {
        margin: 0 0 0.25rem 0;
        color: #333;
    }
    
    .cart-item-details p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
    }
    
    .cart-item-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .cart-item-qty {
        min-width: 30px;
        text-align: center;
        font-weight: 600;
    }
    
    .cart-summary {
        border-top: 2px solid #e0e0e0;
        padding-top: 1rem;
        margin-top: 1rem;
    }
    
    .cart-total {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        text-align: right;
    }
    
    .cart-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    .cart-empty {
        text-align: center;
        padding: 2rem;
        color: #666;
    }
    
    .cart-empty i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #ccc;
    }
    
    .btn-sm {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
    }
    
    .btn-danger {
        background: #dc3545;
        color: white;
    }
    
    .btn-danger:hover {
        background: #c82333;
    }
    
    /* Quantity Selector Styles */
    .item-quantity {
        margin: 1rem 0;
        text-align: center;
    }
    
    .item-quantity label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #333;
    }
    
    .quantity-selector {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    
    .quantity-input {
        width: 60px;
        text-align: center;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    /* Item Card Actions */
    .item-card-actions {
        padding: 1rem;
        border-top: 1px solid #e0e0e0;
        text-align: center;
    }
    
    .item-card-actions .btn {
        width: 100%;
    }
    
    .load-more-btn {
        grid-column: 1 / -1;
        margin: 2rem auto;
        padding: 1rem 2rem;
        font-size: 1.1rem;
    }
`;
document.head.appendChild(style);

// Cart functions
async function loadCart(forceRefresh = false) {
    if (!localStorage.getItem('token')) {
        return;
    }
    
    // Use cached data if available and not forcing refresh
    if (!forceRefresh && cartData && cartItems.length > 0) {
        renderCart();
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            cartData = await response.json();
            cartItems = cartData.items || [];
            cartItemCount = cartItems.length;
            cartCount.textContent = cartItemCount;
            renderCart();
        } else {
            console.error('Failed to load cart');
        }
    } catch (error) {
        console.error('Load cart error:', error);
    }
}

// Render cart items
function renderCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmptyDiv = document.getElementById('cartEmpty');
    const cartSummaryDiv = document.getElementById('cartSummary');
    
    if (!cartItemsDiv || !cartEmptyDiv || !cartSummaryDiv) {
        console.error('Cart DOM elements not found');
        return;
    }
    
    if (cartItems.length === 0) {
        cartItemsDiv.style.display = 'none';
        cartEmptyDiv.style.display = 'block';
        cartSummaryDiv.style.display = 'none';
        return;
    }
    
    cartItemsDiv.style.display = 'block';
    cartEmptyDiv.style.display = 'none';
    cartSummaryDiv.style.display = 'block';
    
    // Calculate total
    let total = 0;
    cartItemsDiv.innerHTML = cartItems.map(item => {
        const itemData = allItems.find(i => i.id === item.itemId);
        if (itemData) {
            total += itemData.price * item.qty;
            return `
                <div class="cart-item">
                    <div class="cart-item-image">
                        ${getItemIcon(itemData.name)}
                    </div>
                    <div class="cart-item-details">
                        <h4>${escapeHtml(itemData.name)}</h4>
                        <p>$${itemData.price.toFixed(2)} x ${item.qty}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="updateCartItem(${item.itemId}, ${item.qty - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="cart-item-qty">${item.qty}</span>
                        <button class="btn btn-sm btn-secondary" onclick="updateCartItem(${item.itemId}, ${item.qty + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.itemId})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        return '';
    }).join('');
    
    const cartTotalDiv = document.getElementById('cartTotal');
    if (cartTotalDiv) {
        cartTotalDiv.textContent = total.toFixed(2);
    }
}

// Update cart item quantity
async function updateCartItem(itemId, newQty) {
    if (newQty <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId,
                qty: newQty
            })
        });
        
        if (response.ok) {
            // Debounced cart update
            debouncedCartUpdate();
        }
    } catch (error) {
        console.error('Update cart error:', error);
    }
}

// Remove item from cart
async function removeFromCart(itemId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: itemId
            })
        });
        
        if (response.ok) {
            // Update count immediately
            cartItemCount = Math.max(0, cartItemCount - 1);
            cartCount.textContent = cartItemCount;
            
            // Debounced cart update
            debouncedCartUpdate();
            showSuccess('Item removed from cart');
        }
    } catch (error) {
        console.error('Remove from cart error:', error);
    }
}

// Clear cart
async function clearCart() {
    if (!confirm('Are you sure you want to clear your cart?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart/clear`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            cartItems = [];
            cartItemCount = 0;
            cartCount.textContent = '0';
            cartData = null;
            renderCart();
            showSuccess('Cart cleared successfully');
        }
    } catch (error) {
        console.error('Clear cart error:', error);
    }
}

// Update cart count in navigation (optimized with caching)
function updateCartCount() {
    if (!localStorage.getItem('token')) {
        cartCount.textContent = '0';
        cartItemCount = 0;
        return;
    }
    
    // Use cached count if available
    if (cartItemCount !== null) {
        cartCount.textContent = cartItemCount;
        return;
    }
    
    // Fallback to API call only if no cached data
    updateCartCountFromAPI();
}

// Fallback API call for cart count (only when needed)
async function updateCartCountFromAPI() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            cartItemCount = data.items ? data.items.length : 0;
            cartCount.textContent = cartItemCount;
        }
    } catch (error) {
        console.error('Update cart count error:', error);
    }
}

// Checkout function
function checkout() {
    showSuccess('Checkout functionality coming soon!');
}

// Debounced cart update to avoid excessive API calls
function debouncedCartUpdate() {
    if (cartUpdateTimeout) {
        clearTimeout(cartUpdateTimeout);
    }
    
    cartUpdateTimeout = setTimeout(() => {
        loadCart(true); // Force refresh
        cartUpdateTimeout = null;
    }, 300); // 300ms delay
}

// Test SSRF vulnerability
async function testSSRF() {
    const url = document.getElementById('ssrfUrl').value;
    const resultDiv = document.getElementById('ssrfResult');
    
    if (!url) {
        resultDiv.textContent = 'Please enter a URL to test';
        return;
    }
    
    resultDiv.textContent = 'Testing SSRF vulnerability...';
    
    try {
        const response = await fetch(`/api/v1/image/proxy?url=${encodeURIComponent(url)}`);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.startsWith('image/')) {
            resultDiv.textContent = 'Image received (binary data) - SSRF successful!';
        } else {
            const text = await response.text();
            resultDiv.textContent = `SSRF Response (${response.status}):\n${text}`;
        }
    } catch (error) {
        resultDiv.textContent = `SSRF Error: ${error.message}`;
    }
}

// Performance monitoring
function logPerformance(label, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    
    // Log slow operations
    if (duration > 100) {
        console.warn(`🐌 Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
}

// Add performance monitoring to key functions
const originalLoadItems = loadItems;
loadItems = async function() {
    const startTime = performance.now();
    try {
        await originalLoadItems();
    } finally {
        logPerformance('Items Load', startTime);
    }
};

const originalRenderItems = renderItems;
renderItems = function() {
    const startTime = performance.now();
    try {
        originalRenderItems();
    } finally {
        logPerformance('Items Render', startTime);
    }
};
