-- Kucing Comel Sample Data (PostgreSQL)

-- 6L Litter - one product per scent
INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES
('Lilien Premium Super Clumping Cat Litter 6L - Charcoal', 'Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats'' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin', 8.00, 7.20, '/Lilien Premium Super Clumping Cat Litter 6L/Charcoal/1.jfif', 'Litter', 80),
('Lilien Premium Super Clumping Cat Litter 6L - Fresh Milk', 'Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats'' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin', 8.00, 7.20, '/Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk/1.jfif', 'Litter', 60),
('Lilien Premium Super Clumping Cat Litter 6L - Lavender', 'Lilien Premium Tofu Cat Litter – Lavender is formulated to provide excellent absorption, fast clumping, and reliable odor control. The gentle Lavender scent helps maintain a calm and pleasant litter area while remaining soft and comfortable on your cat''s paws.

Why Choose Lilien Tofu Cat Litter?

Top-Notch Absorption — Keeps the litter box dry and fresh for longer periods.

Easy & Fast Clumping — Firm clumps make daily cleaning quick and easy.

Advanced Odor Control — Neutralizes odors while leaving a soft lavender fragrance.

Low Dust, Less Mess — Helps minimize dust and tracking around the home.

Flushable & Eco-Friendly
Plant-based, biodegradable, and non-toxic. Safe for daily use and can be flushed in small amounts.

Product Highlights
- Antibacterial
- Non-toxic & pet-safe
- Easy-to-store packaging
- Net weight: 1.6kg

How to Use
1. Add at least 2 inches of litter to the tray.
2. Scoop waste daily.
3. Flush small amounts or dispose properly.', 8.00, 7.20, '/Lilien Premium Super Clumping Cat Litter 6L/Lavender/1.jfif', 'Litter', 60),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Charcoal', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 75.00, 67.50, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Charcoal/1.jfif', 'Litter', 20),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Fresh Milk', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 75.00, 67.50, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk/1.jfif', 'Litter', 15),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Lavender', 'Lilien Premium Tofu Cat Litter – Lavender is formulated to provide excellent absorption, fast clumping, and reliable odor control. The gentle Lavender scent helps maintain a calm and pleasant litter area while remaining soft and comfortable on your cat''s paws.

Why Choose Lilien Tofu Cat Litter?

Top-Notch Absorption — Keeps the litter box dry and fresh for longer periods.

Easy & Fast Clumping — Firm clumps make daily cleaning quick and easy.

Advanced Odor Control — Neutralizes odors while leaving a soft lavender fragrance.

Low Dust, Less Mess — Helps minimize dust and tracking around the home.

Flushable & Eco-Friendly
Plant-based, biodegradable, and non-toxic. Safe for daily use and can be flushed in small amounts.

Product Highlights
- Antibacterial
- Non-toxic & pet-safe
- Easy-to-store packaging
- Net weight: 1.6kg

How to Use
1. Add at least 2 inches of litter to the tray.
2. Scoop waste daily.
3. Flush small amounts or dispose properly.', 75.00, 67.50, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Lavender/1.jfif', 'Litter', 15),
('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 42.00, 37.80, '/products/creamy-treats.jpg', 'Food', 300)
ON CONFLICT DO NOTHING;

-- Creamy Treats Flavour Variants (only treats have variants now)
INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
(7, 'Chicken', 14.00, 12.60, 100),
(7, 'Tuna', 14.00, 12.60, 100),
(7, 'Salmon', 14.00, 12.60, 100),
(7, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50)
ON CONFLICT DO NOTHING;
