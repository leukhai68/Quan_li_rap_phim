const pool = require('../config/db.js');

async function run() {
  try {
    // 1. DAT_VE: TenRap
    const [colsTR] = await pool.query("SHOW COLUMNS FROM DAT_VE LIKE 'TenRap'");
    if (colsTR.length === 0) {
      await pool.query("ALTER TABLE DAT_VE ADD COLUMN TenRap VARCHAR(150) NOT NULL DEFAULT 'PTIT Cinema Hà Đông'");
      console.log('✅ Added TenRap to DAT_VE');
    } else {
      console.log('ℹ️ TenRap already exists in DAT_VE');
    }

    console.log('🎉 Migration updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
