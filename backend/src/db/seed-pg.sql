-- Kucing Comel Sample Data (PostgreSQL)

-- Lilien Products Only
-- price = guest price, member_price = discounted member price
INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES
('Lilien Premium Super Clumping Cat Litter 6L', 'Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats'' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Main/1.jfif', 'Litter', 200),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 159.00, 143.10, '/products/litter-carton.jpg', 'Litter', 50),
('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 42.00, 37.80, '/products/creamy-treats.jpg', 'Food', 300),
('CARE FIP GS-441524 For Cats FIP Kucing', 'Cat Wellness & Support Solution. Specialised cat care product intended to support overall wellness and quality of life during recovery periods. Widely used by experienced caregivers as part of a guided care plan for cats requiring additional support. Designed for careful, responsible use. Supports treatment for Wet, Dry, Neuro & Ocular FIP. High recovery success rate when used consistently. Helps improve appetite, energy & overall condition. Trusted by veterinarians & experienced caregivers.', 123.50, 111.15, '/products/care-fip.jpg', 'Supplements & Medications', 100)
ON CONFLICT DO NOTHING;

-- Product Variants
-- Cat Litter 6L Scent Variants
INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(1, 'Charcoal', 7.60, 6.84, 80),
(1, 'Fresh Milk', 7.60, 6.84, 60),
(1, 'Lavender', 7.60, 6.84, 60)
ON CONFLICT DO NOTHING;

-- Cat Litter Carton Scent Variants
INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(2, 'Original', 159.00, 143.10, 20),
(2, 'Lavender', 168.00, 151.20, 15),
(2, 'Green Tea', 168.00, 151.20, 15)
ON CONFLICT DO NOTHING;

-- Creamy Treats Flavour Variants
INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(3, 'Chicken', 14.00, 12.60, 100),
(3, 'Tuna', 14.00, 12.60, 100),
(3, 'Salmon', 14.00, 12.60, 100),
(3, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50)
ON CONFLICT DO NOTHING;

-- CARE FIP GS-441524 Variants
INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(4, '20mg | 8.5ml', 123.50, 111.15, 100),
(4, '20mg | 30ml', 390.00, 351.00, 100),
(4, '20mg | 50ml', 624.00, 561.60, 100),
(4, '30mg | 8.5ml', 136.50, 122.85, 100),
(4, '30mg | 30ml', 429.00, 386.10, 100),
(4, '30mg | 50ml', 650.00, 585.00, 100),
(4, '60mg | 10 Tabs', 195.00, 175.50, 100)
ON CONFLICT DO NOTHING;
