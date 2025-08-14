const bcrypt = require('bcrypt');

async function hashPassword(password) {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

// Command line utility to generate password hash
if (require.main === module) {
  const password = process.argv[2];
  
  if (!password) {
    console.log('Usage: node utils/password.js <password>');
    console.log('Example: node utils/password.js admin123');
    process.exit(1);
  }

  hashPassword(password)
    .then(hash => {
      console.log('Password:', password);
      console.log('Hash:', hash);
      console.log('\nAdd this to your .env file:');
      console.log(`ADMIN_PASS_HASH=${hash}`);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = {
  hashPassword
};