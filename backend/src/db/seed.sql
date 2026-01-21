-- Kucing Comel Sample Data
-- Run this after schema.sql to populate with sample products

-- Lilien Products Only
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop. Keeps your cat''s litter box fresh and clean.', 25.90, '/products/litter-6l.jpg', 'Litter', 200),
('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 139.90, '/products/litter-carton.jpg', 'Litter', 50),
('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 18.90, '/products/creamy-treats.jpg', 'Food', 300);

-- Create a demo admin user (password: admin123)
-- Note: In production, create admin users securely
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@kucingcomel.com', '$2a$10$rQnM1k0mGX5DmCrH0jB5/.YtEj0Kq.VLK0Z4M0v7B0V7lC1oXXXXX', 'Admin', 'admin');
