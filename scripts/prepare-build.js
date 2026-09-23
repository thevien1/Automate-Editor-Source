const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const releaseDir = path.join(rootDir, 'release');

// 1. Tự động đóng các tiến trình SV Browser Automate Editor đang chạy để không bị khóa file
try {
  console.log('🔄 Đang kiểm tra và đóng các phiên bản cũ đang chạy...');
  execSync('powershell -Command "Stop-Process -Name \\"SV Browser Automate Editor\\" -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
  execSync('taskkill /F /IM "SV Browser Automate Editor.exe" /T', { stdio: 'ignore' });
} catch {
  // Không có tiến trình nào đang chạy, bỏ qua
}

// 2. Đọc package.json và tự động tăng số phiên bản (patch version)
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const oldVersion = pkg.version || '3.1.0';

const noBump = process.argv.includes('--no-bump');

let newVersion = oldVersion;
if (!noBump) {
  const parts = oldVersion.split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  newVersion = parts.join('.');
  pkg.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  console.log('\n============================================================');
  console.log(`🚀 TỰ ĐỘNG TĂNG PHIÊN BẢN: v${oldVersion}  ==>  v${newVersion}`);
  console.log('============================================================\n');
} else {
  console.log(`\n📌 Giữ nguyên phiên bản hiện tại: v${oldVersion}\n`);
}

// 3. Tự động xóa sạch các file cài đặt và file build cũ trong thư mục release/
if (fs.existsSync(releaseDir)) {
  console.log('🧹 Đang dọn dẹp các file cài đặt cũ trong thư mục release/ ...');
  let cleanedFilesCount = 0;
  try {
    const entries = fs.readdirSync(releaseDir);
    for (const entry of entries) {
      const fullPath = path.join(releaseDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory()) {
          // Xóa các file .exe, .blockmap, .yml, .zip cũ
          fs.unlinkSync(fullPath);
          cleanedFilesCount++;
        }
      } catch (err) {
        console.warn(`  ⚠️ Không thể xóa file ${entry}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ Lỗi khi đọc thư mục release: ${err.message}`);
  }
  console.log(`✅ Đã xóa ${cleanedFilesCount} file phiên bản cũ. Thư mục release/ đã sẵn sàng cho bản mới v${newVersion}!\n`);
}
