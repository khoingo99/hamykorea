const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./db');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'seoulskin-demo-secret-key-change-in-production';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ Multer: product image upload ============
const uploadDir = path.join(__dirname, 'public', 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if(allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Auth middleware
function requireAuth(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch(err){
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next){
  if(!req.user || !req.user.isAdmin){
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// Helper: hydrate product JSON fields
function hydrateProduct(row){
  if(!row) return null;
  return {
    ...row,
    benefits: JSON.parse(row.benefits || '[]'),
    ingredients: JSON.parse(row.ingredients || '[]'),
    usage: JSON.parse(row.usage_text || '[]'),
    reviews: JSON.parse(row.reviews || '[]')
  };
}

// Helper: parse a list field (JSON array string, or newline-separated text)
function parseList(value){
  if(!value) return [];
  if(Array.isArray(value)) return value;
  try{
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch(e){
    return value.split('\n').map(s => s.trim()).filter(Boolean);
  }
}

// Helper: parse usage lines "Bước 1|Mô tả"
function parseUsage(value){
  if(!value) return [];
  if(Array.isArray(value)) return value;
  try{
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch(e){
    return value.split('\n').map(line => {
      const [step, desc] = line.split('|');
      return [ (step || '').trim(), (desc || '').trim() ];
    }).filter(pair => pair[0]);
  }
}

// Helper: delete product image file from disk (if not empty)
function removeImageFile(imageUrl){
  if(!imageUrl) return;
  const name = path.basename(imageUrl);
  if(name === imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filePath = path.join(uploadDir, name);
  fs.existsSync(filePath) && fs.unlinkSync(filePath);
}

// ============ Public product routes ============
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
  res.json(rows.map(hydrateProduct));
});

app.get('/api/products/category/:category', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE category = ? ORDER BY id ASC').all(req.params.category);
  res.json(rows.map(hydrateProduct));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'Product not found' });
  res.json(hydrateProduct(row));
});

// ============ Auth routes ============
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone } = req.body;
  if(!email || !password || !name){
    return res.status(400).json({ error: 'Email, password and name are required' });
  }
  if(password.length < 6){
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if(existing){
    return res.status(409).json({ error: 'Email already exists' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, is_admin)
    VALUES (?, ?, ?, ?, 0)
  `).run(email.toLowerCase(), hash, name, phone || '');

  const user = db.prepare('SELECT id, email, name, phone, is_admin FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if(!email || !password){
    return res.status(400).json({ error: 'Email and password required' });
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if(!row){
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = bcrypt.compareSync(password, row.password_hash);
  if(!ok){
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = { id: row.id, email: row.email, name: row.name, phone: row.phone, is_admin: row.is_admin };
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user, token });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, email, name, phone, is_admin FROM users WHERE id = ?').get(req.user.id);
  if(!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// ============ Order routes ============
app.post('/api/orders', requireAuth, (req, res) => {
  const { recipient_name, recipient_phone, address, city, note, payment_method, items } = req.body;
  if(!recipient_name || !recipient_phone || !address || !city || !payment_method || !items || items.length === 0){
    return res.status(400).json({ error: 'Missing required fields' });
  }
  let subtotal = 0;
  const validatedItems = [];
  for(const it of items){
    const product = db.prepare('SELECT id, name, price FROM products WHERE id = ?').get(it.productId);
    if(!product) return res.status(400).json({ error: `Product ${it.productId} not found` });
    if(!it.qty || it.qty < 1) return res.status(400).json({ error: 'Invalid quantity' });
    subtotal += product.price * it.qty;
    validatedItems.push({ productId: product.id, name: product.name, price: product.price, qty: it.qty });
  }
  const shipping = subtotal >= 499000 ? 0 : 30000;
  const total = subtotal + shipping;

  const info = db.prepare(`
    INSERT INTO orders (user_id, recipient_name, recipient_phone, address, city, note, payment_method, items_json, subtotal, shipping, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    recipient_name,
    recipient_phone,
    address,
    city,
    note || '',
    payment_method,
    JSON.stringify(validatedItems),
    subtotal,
    shipping,
    total
  );
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  res.json({ ...order, items: JSON.parse(order.items_json) });
});

app.get('/api/orders/my', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows.map(o => ({ ...o, items: JSON.parse(o.items_json) })));
});

app.get('/api/orders', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, u.email as user_email
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(rows.map(o => ({ ...o, items: JSON.parse(o.items_json) })));
});

app.patch('/api/orders/:id', requireAuth, requireAdmin, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if(!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ ...updated, items: JSON.parse(updated.items_json) });
});

// ============ Admin product routes (multipart CRUD) ============
// CREATE product (multipart/form-data, field "image")
app.post('/api/admin/products', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  const { name, category, price, stock, rating, tag, shape, description } = req.body;
  if(!name || !category || !price){
    return res.status(400).json({ error: 'name, category, price required' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || '');
  const info = db.prepare(`
    INSERT INTO products (name, category, price, stock, rating, tag, shape, description, benefits, ingredients, usage_text, reviews, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, category, Number(price),
    stock || 'Còn hàng',
    rating || '★ 4.5',
    tag || category,
    shape || 'bottle',
    description || '',
    JSON.stringify(parseList(req.body.benefits)),
    JSON.stringify(parseList(req.body.ingredients)),
    JSON.stringify(parseUsage(req.body.usage)),
    JSON.stringify(parseList(req.body.reviews)),
    imageUrl
  );
  const product = hydrateProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
  res.json(product);
});

// UPDATE product (multipart; keep old image when no new file uploaded)
app.put('/api/admin/products/:id', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: 'Product not found' });

  const { name, category, price, stock, rating, tag, shape, description } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (existing.image_url || '');

  db.prepare(`
    UPDATE products SET
      name = ?, category = ?, price = ?, stock = ?, rating = ?, tag = ?, shape = ?,
      description = ?, benefits = ?, ingredients = ?, usage_text = ?, reviews = ?, image_url = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    category || existing.category,
    Number(price || existing.price),
    stock || existing.stock,
    rating || existing.rating,
    tag || existing.tag,
    shape || existing.shape,
    description != null ? description : existing.description,
    JSON.stringify(parseList(req.body.benefits != null ? req.body.benefits : existing.benefits)),
    JSON.stringify(parseList(req.body.ingredients != null ? req.body.ingredients : existing.ingredients)),
    JSON.stringify(parseUsage(req.body.usage != null ? req.body.usage : existing.usage_text)),
    JSON.stringify(parseList(req.body.reviews != null ? req.body.reviews : existing.reviews)),
    imageUrl,
    req.params.id
  );

  // remove the old image file if a new one replaced it
  if(req.file && existing.image_url) removeImageFile(existing.image_url);

  const product = hydrateProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  res.json(product);
});

// DELETE product (also removes its image file)
app.delete('/api/admin/products/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: 'Product not found' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  removeImageFile(existing.image_url);
  res.json({ ok: true, deleted_image: existing.image_url || null });
});

// Multer error handler (file type / size)
app.use((err, req, res, next) => {
  if(err instanceof multer.MulterError){
    return res.status(400).json({ error: 'Lỗi upload: ' + err.message });
  }
  if(err) return res.status(400).json({ error: err.message });
  next();
});

// ============ Frontend ============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SeoulSkin API listening on http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/`);
  console.log(`   Admin:    http://localhost:${PORT}/admin`);
  console.log(`   Uploads:  ${uploadDir}`);
});
