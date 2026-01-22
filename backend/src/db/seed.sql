-- Kucing Comel Sample Data (SQLite)

-- Lilien Products Only
-- price = guest price, member_price = discounted member price
INSERT OR IGNORE INTO products (name, description, price, member_price, image_url, category, stock) VALUES
('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop. Keeps your cat''s litter box fresh and clean.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 159.00, 143.10, '/products/litter-carton.jpg', 'Litter', 50),
('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 42.00, 37.80, '/products/creamy-treats.jpg', 'Food', 300);

-- Product Variants
-- Cat Litter 6L Scent Variants
INSERT OR IGNORE INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(1, 'Original', 7.60, 6.84, 80),
(1, 'Lavender', 8.00, 7.20, 60),
(1, 'Green Tea', 8.00, 7.20, 60);

-- Cat Litter Carton Scent Variants
INSERT OR IGNORE INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(2, 'Original', 159.00, 143.10, 20),
(2, 'Lavender', 168.00, 151.20, 15),
(2, 'Green Tea', 168.00, 151.20, 15);

-- Creamy Treats Flavour Variants
INSERT OR IGNORE INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(3, 'Chicken', 14.00, 12.60, 100),
(3, 'Tuna', 14.00, 12.60, 100),
(3, 'Salmon', 14.00, 12.60, 100),
(3, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50);
