const state = {
  products: [],
  activeFilter: 'all',
  selectedProductId: null,
  detailQty: 1,
  paymentMethod: 'cod',
  cart: [],
  user: null,
  token: null
};

const currency = new Intl.NumberFormat('vi-VN');
const formatPrice = v => `₫${currency.format(v)}`;

const API_BASE = '';

// ============== API helpers ==============
async function api(path, options = {}){
  const headers = { 'Content-Type': 'application/json' };
  if(state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(API_BASE + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if(!res.ok){
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ============== Auth ==============
function loadSession(){
  try{
    const raw = localStorage.getItem('seoulskin-session');
    if(raw){
      const parsed = JSON.parse(raw);
      state.user = parsed.user;
      state.token = parsed.token;
    }
  } catch(e){}
}

function saveSession(){
  if(state.token){
    localStorage.setItem('seoulskin-session', JSON.stringify({ user: state.user, token: state.token }));
  } else {
    localStorage.removeItem('seoulskin-session');
  }
}

function updateAccountUI(){
  const pill = document.getElementById('accountPill');
  if(state.user){
    pill.textContent = `Xin chào, ${state.user.name.split(' ')[0]}`;
    pill.onclick = () => {
      if(confirm('Bạn muốn đăng xuất?')) logout();
    };
    document.getElementById('checkoutName').value = state.user.name || '';
    document.getElementById('checkoutPhone').value = state.user.phone || '';
  } else {
    pill.textContent = 'Đăng nhập';
    pill.onclick = openAuthModal;
  }
}

async function handleRegister(){
  const name = document.getElementById('registerName').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;
  const msg = document.getElementById('authMessage');

  try{
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, password })
    });
    state.user = data.user;
    state.token = data.token;
    saveSession();
    updateAccountUI();
    msg.textContent = 'Tạo tài khoản thành công, đã đăng nhập.';
    msg.className = 'helper success';
    setTimeout(closeAuthModal, 800);
  } catch(err){
    msg.textContent = err.message;
    msg.className = 'helper danger';
  }
}

async function handleLogin(){
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('authMessage');
  try{
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    state.user = data.user;
    state.token = data.token;
    saveSession();
    updateAccountUI();
    msg.textContent = 'Đăng nhập thành công.';
    msg.className = 'helper success';
    setTimeout(closeAuthModal, 700);
  } catch(err){
    msg.textContent = err.message;
    msg.className = 'helper danger';
  }
}

function logout(){
  state.user = null;
  state.token = null;
  saveSession();
  updateAccountUI();
}

function openAuthModal(){ document.getElementById('authOverlay').classList.add('show'); }
function closeAuthModal(){ document.getElementById('authOverlay').classList.remove('show'); }
function switchAuthTab(tab){
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('authMessage').textContent = '';
}

// ============== Products ==============
async function loadProducts(){
  try{
    state.products = await api('/api/products');
    if(state.products.length > 0){
      const focused = state.products.find(p => p.tag === 'Serum') || state.products[0];
      state.selectedProductId = focused.id;
    }
    renderLiveStats();
    renderProducts();
    renderDetail();
  } catch(err){
    document.getElementById('productGrid').innerHTML = `<div class="empty">Không tải được sản phẩm: ${err.message}</div>`;
  }
}

function renderLiveStats(){
  const el = document.getElementById('liveProductCount');
  // const priceEl = document.getElementById('liveProductPrice');
  if(state.products.length === 0){
    el.textContent = 'Chưa có sản phẩm';
    // priceEl.textContent = '--';
    return;
  }
  el.textContent = `${state.products.length} sản phẩm`;
  const featured = state.products.find(p => p.tag === 'Serum') || state.products[0];
  // priceEl.textContent = formatPrice(featured.price);
}

function shapeMarkup(shape){
  return `<div class="${shape}"></div>`;
}

// Show uploaded image if present, otherwise fallback to CSS shape
function productVisual(product){
  if(product && product.image_url){
    return `<img class="pimg" src="${product.image_url}" alt="${escapeHtml(product.name)}" onerror="this.style.display='none'">`;
  }
  return shapeMarkup(product && product.shape ? product.shape : 'bottle');
}

function renderProducts(){
  const filtered = state.activeFilter === 'all'
    ? state.products
    : state.products.filter(p => p.category === state.activeFilter);

  const grid = document.getElementById('productGrid');
  if(filtered.length === 0){
    grid.innerHTML = `<div class="empty">Không có sản phẩm thuộc danh mục này.</div>`;
    return;
  }
  grid.innerHTML = filtered.map(p => `
    <article class="card">
      <div class="card-media">${productVisual(p)}</div>
      <div class="card-body">
        <div ></div>
        <h3>${escapeHtml(p.name)}</h3>
        <div></div>
        <div class="benefit-list">${(p.benefits || []).map(b => `<span>${escapeHtml(b)}</span>`).join('')}</div>
        <div class="price-row">
          <div class="price"><strong>${formatPrice(p.price)}</strong><span class="stock">${escapeHtml(p.stock || 'Còn hàng')}</span></div>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary" onclick="showProductDetail(${p.id})">Xem chi tiết</button>
          <button class="btn btn-primary" onclick="quickAdd(${p.id})">Thêm giỏ</button>
        </div>
      </div>
    </article>
  `).join('');
}

function escapeHtml(s){
  if(s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============== Detail ==============
function getProductById(id){ return state.products.find(p => p.id === id); }

function renderDetail(){
  if(!state.selectedProductId) return;
  const product = getProductById(state.selectedProductId);
  if(!product) return;
  document.getElementById('detailCategory').textContent = product.tag || product.category;
  document.getElementById('detailName').textContent = product.name;
  document.getElementById('detailPrice').textContent = formatPrice(product.price);
  document.getElementById('detailRating').textContent = product.rating || '★ --';
  document.getElementById('detailStock').textContent = product.stock || 'Còn hàng';
  document.getElementById('detailDesc').textContent = product.description;
  document.getElementById('detailBenefits').innerHTML = (product.benefits || []).map(b => `<span>${escapeHtml(b)}</span>`).join('');
  document.getElementById('detailIngredients').innerHTML = (product.ingredients || []).map(i => `<span>${escapeHtml(i)}</span>`).join('');
  document.getElementById('detailUsage').innerHTML = (product.usage || []).map(step => `<div class="step"><strong>${escapeHtml(step[0])}</strong><span class="muted">${escapeHtml(step[1])}</span></div>`).join('');
  document.getElementById('detailQty').textContent = state.detailQty;
   document.getElementById('detailArt').innerHTML = productVisual(product);
}

function showProductDetail(id){
  state.selectedProductId = id;
  state.detailQty = 1;
  renderDetail();
  scrollToSection('detail');
}

function changeDetailQty(delta){
  state.detailQty = Math.max(1, state.detailQty + delta);
  document.getElementById('detailQty').textContent = state.detailQty;
}

// ============== Cart ==============
function addToCart(productId, qty = 1){
  const found = state.cart.find(i => i.productId === productId);
  if(found){ found.qty += qty; } else { state.cart.push({ productId, qty }); }
  renderCart();
}

function quickAdd(id){ addToCart(id, 1); openCart(); }

function addCurrentDetailToCart(){
  addToCart(state.selectedProductId, state.detailQty);
  openCart();
}

function buyNowCurrent(){
  addToCart(state.selectedProductId, state.detailQty);
  openCheckout();
}

function removeFromCart(productId){
  state.cart = state.cart.filter(i => i.productId !== productId);
  renderCart();
}

function updateCartQty(productId, delta){
  const item = state.cart.find(i => i.productId === productId);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){ removeFromCart(productId); return; }
  renderCart();
}

function getCartSummary(){
  const subtotal = state.cart.reduce((s, i) => {
    const p = getProductById(i.productId);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  const shipping = state.cart.length === 0 ? 0 : (subtotal >= 499000 ? 0 : 30000);
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderCart(){
  const totalQty = state.cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = totalQty;
  document.getElementById('cartCountTop').textContent = totalQty;

  const box = document.getElementById('cartItems');
  if(state.cart.length === 0){
    box.innerHTML = `<div class="empty">Giỏ hàng đang trống.</div>`;
  } else {
    box.innerHTML = state.cart.map(i => {
      const product = getProductById(i.productId);
      if(!product) return '';
      return `
        <div class="cart-item">
          <div class="cart-art">${productVisual(product)}</div>
          <div>
            <h4>${escapeHtml(product.name)}</h4>
            <p>${formatPrice(product.price)} × ${i.qty}</p>
            <div class="cart-qty">
              <button class="tiny-btn" onclick="updateCartQty(${product.id}, -1)">−</button>
              <strong>${i.qty}</strong>
              <button class="tiny-btn" onclick="updateCartQty(${product.id}, 1)">+</button>
            </div>
          </div>
          <button class="cart-remove" onclick="removeFromCart(${product.id})">Xóa</button>
        </div>
      `;
    }).join('');
  }

  const s = getCartSummary();
  document.getElementById('subtotalText').textContent = formatPrice(s.subtotal);
  document.getElementById('shippingText').textContent = s.shipping === 0 && s.subtotal > 0 ? 'Miễn phí' : formatPrice(s.shipping);
  document.getElementById('totalText').textContent = formatPrice(s.total);
  renderCheckoutSummary();
}

function openCart(){ document.getElementById('cartDrawer').classList.add('show'); }
function closeCart(){ document.getElementById('cartDrawer').classList.remove('show'); }

// ============== Checkout ==============
function openCheckout(){
  if(state.cart.length === 0){ alert('Giỏ hàng đang trống.'); return; }
  if(!state.user){
    alert('Vui lòng đăng nhập trước khi thanh toán.');
    closeCart();
    openAuthModal();
    return;
  }
  document.getElementById('checkoutOverlay').classList.add('show');
  closeCart();
  renderCheckoutSummary();
}
function closeCheckout(){ document.getElementById('checkoutOverlay').classList.remove('show'); }

function renderCheckoutSummary(){
  const box = document.getElementById('checkoutItems');
  const s = getCartSummary();
  if(state.cart.length === 0){
    box.innerHTML = '<div class="empty">Chưa có sản phẩm.</div>';
  } else {
    box.innerHTML = state.cart.map(i => {
      const product = getProductById(i.productId);
      if(!product) return '';
      return `<div class="summary-row"><span>${escapeHtml(product.name)} × ${i.qty}</span><strong>${formatPrice(product.price * i.qty)}</strong></div>`;
    }).join('');
  }
  document.getElementById('checkoutSubtotal').textContent = formatPrice(s.subtotal);
  document.getElementById('checkoutShipping').textContent = s.shipping === 0 && s.subtotal > 0 ? 'Miễn phí' : formatPrice(s.shipping);
  document.getElementById('checkoutTotal').textContent = formatPrice(s.total);
}

async function placeOrder(){
  const notice = document.getElementById('checkoutNotice');
  if(state.cart.length === 0){
    notice.textContent = 'Giỏ hàng trống.'; notice.className = 'helper danger'; return;
  }
  const payload = {
    recipient_name: document.getElementById('checkoutName').value.trim(),
    recipient_phone: document.getElementById('checkoutPhone').value.trim(),
    address: document.getElementById('checkoutAddress').value.trim(),
    city: document.getElementById('checkoutCity').value.trim(),
    note: document.getElementById('checkoutNote').value.trim(),
    payment_method: state.paymentMethod,
    items: state.cart.map(i => ({ productId: i.productId, qty: i.qty }))
  };
  if(!payload.recipient_name || !payload.recipient_phone || !payload.address || !payload.city){
    notice.textContent = 'Vui lòng điền đủ thông tin giao hàng.';
    notice.className = 'helper danger';
    return;
  }
  try{
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
    notice.innerHTML = `<div class="notice">Đặt hàng thành công. Mã đơn <strong>#${order.id}</strong> - Tổng <strong>${formatPrice(order.total)}</strong>.</div>`;
    state.cart = [];
    renderCart();
    setTimeout(() => {
      closeCheckout();
    }, 1500);
  } catch(err){
    notice.textContent = err.message;
    notice.className = 'helper danger';
  }
}

// ============== Wire up ==============
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
    chip.classList.add('active');
    state.activeFilter = chip.dataset.filter;
    renderProducts();
  });
});

document.querySelectorAll('.pay-card').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.pay-card').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    state.paymentMethod = button.dataset.pay;
  });
});

window.addEventListener('click', (event) => {
  if(event.target === document.getElementById('authOverlay')) closeAuthModal();
  if(event.target === document.getElementById('checkoutOverlay')) closeCheckout();
});

function scrollToSection(id){ document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }

// ============== Init ==============
loadSession();
updateAccountUI();
loadProducts();
