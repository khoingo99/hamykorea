const state = { user: null, token: null, products: [] };

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
  if(state.token) localStorage.setItem('seoulskin-session', JSON.stringify({ user: state.user, token: state.token }));
  else localStorage.removeItem('seoulskin-session');
}

async function api(path, options = {}){
  const headers = { };
  if(state.token) headers.Authorization = `Bearer ${state.token}`;
  if(!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { ...options, headers: { ...headers, ...(options.headers||{}) } });
  const data = await res.json().catch(() => ({}));
  if(!res.ok){ const e = new Error(data.error||`HTTP ${res.status}`); e.status = res.status; throw e; }
  return data;
}

const currency = new Intl.NumberFormat('vi-VN');

function openAdminAuth(){ document.getElementById('adminAuthOverlay').classList.add('show'); }
function closeAdminAuth(){ document.getElementById('adminAuthOverlay').classList.remove('show'); }

async function handleAdminLogin(){
  const email = document.getElementById('adminEmail').value.trim().toLowerCase();
  const password = document.getElementById('adminPassword').value;
  const msg = document.getElementById('adminAuthMsg');
  try{
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if(!data.user.is_admin){ msg.textContent = 'Tài khoản này không có quyền admin.'; msg.className = 'helper danger'; return; }
    state.user = data.user; state.token = data.token; saveSession();
    msg.textContent = 'Đăng nhập admin thành công.'; msg.className = 'helper success';
    setTimeout(() => { closeAdminAuth(); afterAdminAuth(); }, 600);
  } catch(err){
    msg.textContent = err.message; msg.className = 'helper danger';
  }
}

function logoutAdmin(){
  state.user = null; state.token = null; saveSession();
  document.getElementById('adminContent').classList.add('hidden');
  document.getElementById('adminLoginBanner').classList.remove('hidden');
  document.getElementById('adminAccountPill').textContent = 'Đăng nhập admin';
  document.getElementById('adminAccountPill').onclick = openAdminAuth;
}

async function afterAdminAuth(){
  document.getElementById('adminLoginBanner').classList.add('hidden');
  document.getElementById('adminContent').classList.remove('hidden');
  const pill = document.getElementById('adminAccountPill');
  pill.textContent = `Admin: ${state.user.name} (đăng xuất)`;
  pill.onclick = logoutAdmin;
  await refreshAdmin();
}

async function refreshAdmin(){
  try{
    const [products, orders] = await Promise.all([
      api('/api/products'),
      api('/api/orders')
    ]);
    state.products = products;
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statOrders').textContent = orders.length;
    const revenue = orders.reduce((s,o)=>s+o.total,0);
    document.getElementById('statRevenue').textContent = `₫${currency.format(revenue)}`;

    const ordersTable = document.getElementById('ordersTable');
    if(orders.length === 0){
      ordersTable.innerHTML = `<tr><td colspan="8" class="muted">Chưa có đơn hàng nào.</td></tr>`;
    } else {
      ordersTable.innerHTML = orders.map(o => `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>${escapeHtml(o.recipient_name)}<br><span class="muted">${escapeHtml(o.recipient_phone)}</span></td>
          <td>${o.items.map(i => `${escapeHtml(i.name)} × ${i.qty}`).join('<br>')}</td>
          <td>₫${currency.format(o.total)}</td>
          <td>${escapeHtml(o.payment_method)}</td>
          <td><span class="status-pill ${o.status}">${o.status}</span></td>
          <td>${o.created_at}</td>
          <td>
            <div class="flex-row">
              ${['confirmed','shipped','delivered','cancelled'].filter(s => s !== o.status).map(s => `<button class="btn btn-sm btn-secondary" onclick="updateOrder(${o.id},'${s}')">${s}</button>`).join('')}
            </div>
          </td>
        </tr>
      `).join('');
    }

    const productsTable = document.getElementById('productsTable');
    if(products.length === 0){
      productsTable.innerHTML = `<tr><td colspan="7" class="muted">Chưa có sản phẩm. Nhấn "Thêm sản phẩm" để bắt đầu.</td></tr>`;
    } else {
      productsTable.innerHTML = products.map(p => `
        <tr>
          <td>#${p.id}</td>
          <td>${p.image_url ? `<img src="${p.image_url}" alt="" class="admin-thumb" onerror="this.style.display='none'">` : '<span class="muted">—</span>'}</td>
          <td><strong>${escapeHtml(p.name)}</strong><br><span class="muted" style="font-size:12px">${escapeHtml(p.tag || p.category)}</span></td>
          <td>${escapeHtml(p.category)}</td>
          <td>₫${currency.format(p.price)}</td>
          <td>${escapeHtml(p.stock || 'Còn hàng')}</td>
          <td>
            <div class="flex-row">
              <button class="btn btn-sm btn-secondary" onclick="openProductModal(${p.id})">Sửa</button>
              <button class="btn btn-sm btn-secondary" onclick="deleteProduct(${p.id})">Xóa</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch(err){
    alert('Lỗi tải dữ liệu admin: ' + err.message);
  }
}

async function updateOrder(id, status){
  try{
    await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refreshAdmin();
  } catch(err){ alert('Lỗi cập nhật: ' + err.message); }
}

// ============= Product create / edit =============
function openProductModal(id){
  const title = document.getElementById('productModalTitle');
  document.getElementById('productMsg').textContent = '';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';

  if(id){
    const p = state.products.find(item => item.id === id);
    if(!p) return;
    title.textContent = `Sửa sản phẩm #${p.id} - ${p.name}`;
    document.getElementById('productId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pTag').value = p.tag || '';
    document.getElementById('pStock').value = p.stock || '';
    document.getElementById('pRating').value = p.rating || '';
    document.getElementById('pShape').value = p.shape || 'bottle';
    document.getElementById('pDescription').value = p.description || '';
    document.getElementById('pIngredients').value = (p.ingredients || []).join('\n');
    document.getElementById('pBenefits').value = (p.benefits || []).join('\n');
    document.getElementById('pUsage').value = (p.usage || []).map(u => u.join('|')).join('\n');
    document.getElementById('pReviews').value = (p.reviews || []).map(r => r.join('|')).join('\n');
    document.getElementById('pImagePreviewBox').innerHTML = p.image_url
      ? `Ảnh hiện tại: <img src="${p.image_url}" alt="" class="admin-thumb" style="margin-top:8px;display:block">`
      : 'Chưa có ảnh. Tải lên ảnh mới nếu muốn.';
  } else {
    title.textContent = 'Thêm sản phẩm mới';
    document.getElementById('pImagePreviewBox').textContent = 'Chưa có ảnh. Chọn ảnh JPG / PNG / WEBP (tối đa 5MB).';
    document.getElementById('pRating').value = '★ 4.5';
    document.getElementById('pStock').value = 'Còn hàng';
  }
  document.getElementById('productOverlay').classList.add('show');
}

function closeProductModal(){ document.getElementById('productOverlay').classList.remove('show'); }

async function saveProduct(){
  const msg = document.getElementById('productMsg');
  const id = document.getElementById('productId').value;
  const name = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value;
  const price = document.getElementById('pPrice').value;

  if(!name || !category || !price || Number(price) <= 0){
    msg.textContent = 'Vui lòng nhập tên, danh mục và giá hợp lệ.';
    msg.className = 'helper danger';
    return;
  }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('category', category);
  fd.append('price', price);
  fd.append('tag', document.getElementById('pTag').value.trim());
  fd.append('stock', document.getElementById('pStock').value.trim() || 'Còn hàng');
  fd.append('rating', document.getElementById('pRating').value.trim() || '★ 4.5');
  fd.append('shape', document.getElementById('pShape').value);
  fd.append('description', document.getElementById('pDescription').value.trim());
  fd.append('benefits', document.getElementById('pBenefits').value);
  fd.append('ingredients', document.getElementById('pIngredients').value);
  fd.append('usage', document.getElementById('pUsage').value);
  // fd.append('reviews', document.getElementById('pReviews').value);

  const fileInput = document.getElementById('pImage');
  if(fileInput.files && fileInput.files.length > 0){
    fd.append('image', fileInput.files[0]);
  }

  try{
    if(id){
      await api(`/api/admin/products/${id}`, { method: 'PUT', body: fd });
      msg.textContent = 'Đã cập nhật sản phẩm.';
    } else {
      await api('/api/admin/products', { method: 'POST', body: fd });
      msg.textContent = 'Đã thêm sản phẩm mới.';
    }
    msg.className = 'helper success';
    setTimeout(() => { closeProductModal(); refreshAdmin(); }, 700);
  } catch(err){
    msg.textContent = 'Lỗi: ' + err.message;
    msg.className = 'helper danger';
  }
}

async function deleteProduct(id){
  const p = state.products.find(item => item.id === id);
  if(!confirm(`Xóa sản phẩm "${p ? p.name : id}"?`)) return;
  try{
    await api(`/api/admin/products/${id}`, { method: 'DELETE' });
    await refreshAdmin();
  } catch(err){ alert('Lỗi xóa: ' + err.message); }
}

function escapeHtml(s){
  if(s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.addEventListener('click', (e) => {
  if(e.target === document.getElementById('adminAuthOverlay')) closeAdminAuth();
  if(e.target === document.getElementById('productOverlay')) closeProductModal();
});

loadSession();
if(state.user && state.user.is_admin){
  afterAdminAuth();
}
