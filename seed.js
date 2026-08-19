const db = require('./db');
const bcrypt = require('bcryptjs');

const products = [
  {
    name: 'Glass Skin Essence',
    category: 'serum',
    price: 420000,
    stock: 'Còn hàng',
    rating: '★ 5.0',
    tag: 'Serum',
    shape: 'bottle',
    description: 'Serum cấp ẩm với hyaluronic acid và niacinamide giúp da căng bóng tự nhiên, hỗ trợ làm sáng và cải thiện bề mặt da.',
    benefits: ['Cấp ẩm sâu', 'Làm sáng', 'Mỏng nhẹ'],
    ingredients: ['Niacinamide 5%', 'Hyaluronic Acid', 'Panthenol', 'Beta-glucan'],
    usage: [
      ['Bước 1', 'Dùng sau toner trên da còn ẩm nhẹ.'],
      ['Bước 2', 'Lấy 2-3 giọt, thoa đều toàn mặt và cổ.'],
      ['Bước 3', 'Khóa ẩm bằng kem dưỡng phù hợp.'],
      ['Bước 4', 'Buổi sáng nhớ dùng thêm chống nắng.']
    ],
    reviews: [
      ['Lan Anh', 'Da ẩm hơn chỉ sau vài ngày, lớp nền mượt hơn.'],
      ['Thảo My', 'Chất serum thấm nhanh và không gây bí da.']
    ]
  },
  {
    name: 'Centella Calm Toner',
    category: 'toner',
    price: 310000,
    stock: 'Còn hàng',
    rating: '★ 4.8',
    tag: 'Toner',
    shape: 'bottle',
    description: 'Toner làm dịu da với centella, hỗ trợ cân bằng pH, giảm khô căng sau khi rửa mặt và chuẩn bị da cho các bước tiếp theo.',
    benefits: ['Làm dịu', 'Cân bằng pH', 'Dễ layer'],
    ingredients: ['Centella Asiatica', 'Allantoin', 'Green Tea', 'Madecassoside'],
    usage: [
      ['Bước 1', 'Cho toner ra bông hoặc lòng bàn tay.'],
      ['Bước 2', 'Vỗ nhẹ khắp mặt sau khi làm sạch.'],
      ['Bước 3', 'Có thể layer 2-3 lớp khi da thiếu ẩm.'],
      ['Bước 4', 'Tiếp tục với serum phục hồi hoặc dưỡng sáng.']
    ],
    reviews: [
      ['Mai Chi', 'Da mình giảm đỏ rõ sau khi dùng đều sáng tối.'],
      ['Diễm Quỳnh', 'Không cồn, không mùi gắt, rất hợp da nhạy cảm.']
    ]
  },
  {
    name: 'Ceramide Repair Cream',
    category: 'cream',
    price: 465000,
    stock: 'Best seller',
    rating: '★ 5.0',
    tag: 'Cream',
    shape: 'jar',
    description: 'Kem dưỡng phục hồi hàng rào bảo vệ da với ceramide và squalane, phù hợp da khô, da treatment hoặc da nhạy cảm.',
    benefits: ['Phục hồi', 'Khóa ẩm', 'Làm mềm'],
    ingredients: ['Ceramide NP', 'Squalane', 'Shea Butter', 'Cholesterol'],
    usage: [
      ['Bước 1', 'Dùng ở bước cuối routine tối.'],
      ['Bước 2', 'Lấy lượng bằng hạt đậu lớn.'],
      ['Bước 3', 'Massage nhẹ để tạo lớp màng dưỡng ẩm.'],
      ['Bước 4', 'Có thể bôi dày hơn ở vùng da bong tróc.']
    ],
    reviews: [
      ['Kim Ngân', 'Da bớt khô rát rất nhanh sau 1 tuần dùng.'],
      ['Phương Vy', 'Makeup không còn bị mốc ở vùng má nữa.']
    ]
  },
  {
    name: 'Daily UV Shield SPF50+',
    category: 'sunscreen',
    price: 350000,
    stock: 'Còn hàng',
    rating: '★ 4.7',
    tag: 'Sunscreen',
    shape: 'tube',
    description: 'Kem chống nắng mỏng nhẹ, không bết dính, phù hợp dùng hằng ngày và không để lại vệt trắng trên da.',
    benefits: ['Bảo vệ UV', 'Không vệt trắng', 'Finish ráo'],
    ingredients: ['Uvinul A Plus', 'Uvinul T 150', 'Rice Extract', 'Vitamin E'],
    usage: [
      ['Bước 1', 'Thoa sau bước kem dưỡng ban ngày.'],
      ['Bước 2', 'Dùng lượng khoảng 2 đốt ngón tay.'],
      ['Bước 3', 'Tán đều toàn mặt và cổ trước khi ra nắng 15 phút.'],
      ['Bước 4', 'Thoa lại sau 2-3 giờ nếu hoạt động ngoài trời.']
    ],
    reviews: [
      ['Bảo Trâm', 'Rất hợp da dầu, ráo nhanh và không cay mắt.'],
      ['Hà Phương', 'Làm lớp lót trước makeup khá đẹp.']
    ]
  },
  {
    name: 'Rice Glow Ampoule',
    category: 'serum',
    price: 390000,
    stock: 'Limited',
    rating: '★ 4.8',
    tag: 'Ampoule',
    shape: 'bottle',
    description: 'Ampoule dưỡng sáng với chiết xuất gạo và vitamin blend, hỗ trợ đều màu da và mang lại vẻ rạng rỡ tự nhiên.',
    benefits: ['Dưỡng sáng', 'Đều màu', 'Căng bóng'],
    ingredients: ['Rice Extract', 'Vitamin B3', 'Tranexamic Acid', 'Adenosine'],
    usage: [
      ['Bước 1', 'Dùng sau toner và trước kem dưỡng.'],
      ['Bước 2', 'Nhấn 1-2 lần pipette cho toàn mặt.'],
      ['Bước 3', 'Vỗ nhẹ để dưỡng chất thẩm thấu.'],
      ['Bước 4', 'Kết hợp chống nắng ban ngày để tối ưu hiệu quả.']
    ],
    reviews: [
      ['Uyên Nhi', 'Da sáng hơn và đều màu hơn sau khoảng 2 tuần.'],
      ['Thanh Lam', 'Chai đẹp, texture mịn, hợp với routine sáng.']
    ]
  },
  {
    name: 'Peptide Bounce Cream',
    category: 'cream',
    price: 510000,
    stock: 'Mới',
    rating: '★ 4.9',
    tag: 'Night Care',
    shape: 'jar',
    description: 'Kem đêm với peptide giúp da trông căng mịn và đàn hồi hơn sau khi ngủ, phù hợp với routine chống lão hóa nhẹ.',
    benefits: ['Săn chắc', 'Dưỡng đêm', 'Mềm mượt'],
    ingredients: ['Peptide Complex', 'Ceramide', 'Squalane', 'Bifida Ferment'],
    usage: [
      ['Bước 1', 'Sử dụng ở bước cuối cùng buổi tối.'],
      ['Bước 2', 'Lấy lượng vừa đủ, chấm 5 điểm trên mặt.'],
      ['Bước 3', 'Massage nâng cơ nhẹ theo chiều từ dưới lên.'],
      ['Bước 4', 'Kết hợp serum peptide để tăng hiệu quả.']
    ],
    reviews: [
      ['Khánh Ly', 'Sáng hôm sau da mềm và có độ đàn hồi hơn.'],
      ['Mộc Trà', 'Mùi nhẹ, chất kem ôm da nhưng không quá nặng.']
    ]
  }
];

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products
  (name, category, price, stock, rating, tag, shape, description, benefits, ingredients, usage_text, reviews)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
if(existingProducts.count === 0){
  products.forEach(product => {
    insertProduct.run(
      product.name,
      product.category,
      product.price,
      product.stock,
      product.rating,
      product.tag,
      product.shape,
      product.description,
      JSON.stringify(product.benefits),
      JSON.stringify(product.ingredients),
      JSON.stringify(product.usage),
      JSON.stringify(product.reviews)
    );
  });
  console.log(`✅ Seeded ${products.length} products`);
} else {
  console.log(`ℹ️  Products table already has ${existingProducts.count} entries, skipping seed`);
}

// Seed admin account
const adminEmail = 'admin@seoulskin.com';
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if(!existingAdmin){
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, is_admin)
    VALUES (?, ?, ?, ?, 1)
  `).run(adminEmail, hash, 'Admin SeoulSkin', '0900000000');
  console.log(`✅ Seeded admin: ${adminEmail} / admin123`);
} else {
  console.log('ℹ️  Admin already exists');
}

// Seed demo customer
const customerEmail = 'demo@seoulskin.com';
const existingCustomer = db.prepare('SELECT id FROM users WHERE email = ?').get(customerEmail);
if(!existingCustomer){
  const hash = bcrypt.hashSync('demo1234', 10);
  db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, is_admin)
    VALUES (?, ?, ?, ?, 0)
  `).run(customerEmail, hash, 'Khách Demo', '0901234567');
  console.log(`✅ Seeded demo customer: ${customerEmail} / demo1234`);
}
