-- Kucing Comel Sample Data
-- Run this after schema.sql to populate with sample products

-- Lilien Products (Featured)
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop. Keeps your cat''s litter box fresh and clean.', 25.90, '/products/litter-6l.jpg', 'Litter', 200),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 139.90, '/products/litter-carton.jpg', 'Litter', 50),
('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 18.90, '/products/creamy-treats.jpg', 'Food', 300),

-- Cat Food
('Premium Cat Food - Salmon', 'High-quality salmon-flavored dry cat food. Rich in omega-3 for healthy coat.', 45.99, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400', 'Food', 100),
('Wet Cat Food - Tuna Variety Pack', '12-pack of premium wet cat food with real tuna chunks.', 35.50, 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400', 'Food', 75),
('Kitten Food - Chicken Formula', 'Specially formulated for kittens up to 12 months. Supports growth.', 38.99, 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400', 'Food', 60),
('Organic Cat Treats', 'All-natural chicken treats. No artificial preservatives.', 12.99, 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400', 'Food', 150),

-- Cat Toys
('Interactive Feather Wand', 'Colorful feather wand toy for interactive play. Encourages exercise.', 15.99, 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400', 'Toys', 80),
('Catnip Mouse Set (5 pieces)', 'Soft plush mice filled with premium catnip. Hours of fun!', 18.50, 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400', 'Toys', 120),
('Laser Pointer Toy', 'Safe laser pointer with multiple patterns. Battery included.', 9.99, 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400', 'Toys', 90),
('Cat Tunnel Play Tube', 'Collapsible 3-way tunnel. Crinkle sound for extra excitement.', 24.99, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400', 'Toys', 45),

-- Cat Beds & Furniture
('Cozy Cat Bed - Grey', 'Soft plush bed with raised edges. Machine washable. 45cm diameter.', 42.99, 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400', 'Beds', 35),
('Cat Tree Tower - 150cm', 'Multi-level cat tree with scratching posts, platforms, and hideaway.', 129.99, 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=400', 'Furniture', 20),
('Window Perch Hammock', 'Suction cup mounted window seat. Holds up to 15kg. Great for bird watching!', 35.50, 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400', 'Furniture', 40),
('Heated Cat Mat', 'Self-warming thermal mat. Perfect for senior cats or cold weather.', 28.99, 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400', 'Beds', 55),

-- Cat Care & Grooming
('Cat Brush - Deshedding Tool', 'Stainless steel deshedding brush. Reduces shedding by up to 90%.', 19.99, 'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6?w=400', 'Grooming', 70),
('Cat Nail Clippers', 'Sharp stainless steel clippers with safety guard. Ergonomic grip.', 11.99, 'https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=400', 'Grooming', 100),
('Cat Shampoo - Gentle Formula', 'Tearless formula for sensitive cats. Fresh lavender scent.', 14.50, 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400', 'Grooming', 85),

-- Cat Accessories
('Cat Collar with Bell', 'Adjustable breakaway collar with bell. Multiple colors available.', 8.99, 'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=400', 'Accessories', 200),
('Cat Carrier - Airline Approved', 'Ventilated travel carrier. Fits under most airline seats.', 55.99, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', 'Accessories', 30),
('Automatic Cat Feeder', 'Programmable feeder with 4-meal capacity. LCD display.', 79.99, 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=400', 'Accessories', 25),
('Cat Water Fountain', 'Filtered water fountain with 2L capacity. Encourages hydration.', 45.99, 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400', 'Accessories', 40),

-- Cat Litter & Hygiene
('Premium Clumping Cat Litter - 10kg', 'Low-dust formula with odor control. Easy to scoop.', 22.99, 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400', 'Litter', 150),
('Self-Cleaning Litter Box', 'Automatic self-cleaning with waste drawer. Less maintenance!', 189.99, 'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=400', 'Litter', 15);

-- Create a demo admin user (password: admin123)
-- Note: In production, create admin users securely
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@kucingcomel.com', '$2a$10$rQnM1k0mGX5DmCrH0jB5/.YtEj0Kq.VLK0Z4M0v7B0V7lC1oXXXXX', 'Admin', 'admin');
