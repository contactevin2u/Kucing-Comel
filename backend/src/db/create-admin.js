/**
 * Admin User Creation Script
 *
 * Usage: node src/db/create-admin.js <email> <password> <name>
 * Example: node src/db/create-admin.js admin@kucingcomel.com mypassword123 "Admin User"
 *
 * This script creates an admin user or promotes an existing user to admin.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdmin() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('\n=== Admin User Creation Script ===\n');
    console.log('Usage: node src/db/create-admin.js <email> <password> <name>\n');
    console.log('Example:');
    console.log('  node src/db/create-admin.js admin@kucingcomel.com MySecurePass123 "Admin User"\n');
    process.exit(1);
  }

  const [email, password, name] = args;

  try {
    console.log('\nConnecting to database...');

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      if (user.role === 'admin') {
        console.log(`\n✓ User ${email} is already an admin.`);
        process.exit(0);
      }

      // Promote existing user to admin
      await db.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['admin', user.id]
      );

      console.log(`\n✓ User ${email} has been promoted to admin.`);
      process.exit(0);
    }

    // Create new admin user
    console.log('Creating admin user...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email.toLowerCase(), passwordHash, name, 'admin']
    );

    const newUser = result.rows[0];

    // Create cart for the admin user
    await db.query('INSERT INTO carts (user_id) VALUES ($1)', [newUser.id]);

    console.log('\n========================================');
    console.log('  Admin user created successfully!');
    console.log('========================================');
    console.log(`  Email:    ${newUser.email}`);
    console.log(`  Name:     ${newUser.name}`);
    console.log(`  Role:     ${newUser.role}`);
    console.log(`  User ID:  ${newUser.id}`);
    console.log('========================================');
    console.log('\nYou can now log in at: /admin/login\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdmin();
