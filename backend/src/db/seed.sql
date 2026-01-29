-- Kucing Comel Sample Data (SQLite)

-- Lilien Products Only
-- price = guest price, member_price = discounted member price

-- 6L Litter - one product per scent
INSERT OR IGNORE INTO products (name, description, price, member_price, image_url, category, stock) VALUES
('Lilien Premium Super Clumping Cat Litter 6L - Charcoal', 'Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats'' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Charcoal/my-11134207-7rasg-m2hheofffem50d.jfif', 'Litter', 80),
('Lilien Premium Super Clumping Cat Litter 6L - Fresh Milk', 'Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats'' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk/my-11134207-7rasc-m2hheoffe04fdf.jfif', 'Litter', 60),
('Lilien Premium Super Clumping Cat Litter 6L - Lavender', 'Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats'' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Lavender/my-11134207-7ras8-m2hheoffe01pb7.jfif', 'Litter', 60);

-- Carton Litter - one product per scent
INSERT OR IGNORE INTO products (name, description, price, member_price, image_url, category, stock) VALUES
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Charcoal', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 159.00, 143.10, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Charcoal/my-11134207-7rasg-m2hheofffem50d.jfif', 'Litter', 20),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Fresh Milk', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 159.00, 143.10, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk/my-11134207-7rasc-m2hheoffe04fdf.jfif', 'Litter', 15),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Lavender', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 159.00, 143.10, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Lavender/my-11134207-7ras8-m2hheoffe01pb7.jfif', 'Litter', 15);

-- Treats product
INSERT OR IGNORE INTO products (name, description, price, member_price, image_url, category, stock) VALUES
('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 42.00, 37.80, '/products/creamy-treats.jpg', 'Food', 300);

-- Creamy Treats Flavour Variants (only treats have variants now)
INSERT OR IGNORE INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(7, 'Chicken', 14.00, 12.60, 100),
(7, 'Tuna', 14.00, 12.60, 100),
(7, 'Salmon', 14.00, 12.60, 100),
(7, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50);
