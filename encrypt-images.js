/**
 * Script mã hóa ảnh để bảo vệ trên GitHub
 *
 * Cách sử dụng:
 * 1. Cài đặt Node.js
 * 2. Chạy: node encrypt-images.js
 * 3. Nhập mật khẩu (phải giống PASSWORD_HASH trong index.html)
 *
 * Output: Tất cả ảnh trong images/ sẽ được mã hóa thành images-encrypted/
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình
const CONFIG = {
    inputDir: './images',
    outputDir: './images-encrypted',
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'],
    algorithm: 'aes-256-cbc'
};

// Hàm tạo SHA-256 hash
function sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

// Hàm mã hóa file
function encryptFile(inputPath, outputPath, password) {
    try {
        // Đọc file gốc
        const fileBuffer = fs.readFileSync(inputPath);

        // Tạo key từ password (SHA-256)
        const key = Buffer.from(sha256(password), 'hex');

        // Tạo IV ngẫu nhiên
        const iv = crypto.randomBytes(16);

        // Mã hóa
        const cipher = crypto.createCipheriv(CONFIG.algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

        // Lưu IV + encrypted data
        const result = Buffer.concat([iv, encrypted]);

        fs.writeFileSync(outputPath, result);
        return true;
    } catch (error) {
        console.error(`❌ Lỗi mã hóa ${inputPath}:`, error.message);
        return false;
    }
}

// Hàm quét và mã hóa tất cả ảnh
async function encryptAllImages(password) {
    console.log('\n🔒 Bắt đầu mã hóa ảnh...\n');

    // Kiểm tra thư mục input
    if (!fs.existsSync(CONFIG.inputDir)) {
        console.error(`❌ Không tìm thấy thư mục: ${CONFIG.inputDir}`);
        return;
    }

    // Tạo thư mục output
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Lấy danh sách file
    const files = fs.readdirSync(CONFIG.inputDir);
    let successCount = 0;
    let totalCount = 0;

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();

        // Chỉ xử lý file ảnh
        if (!CONFIG.extensions.includes(ext)) {
            continue;
        }

        totalCount++;
        const inputPath = path.join(CONFIG.inputDir, file);
        const outputPath = path.join(CONFIG.outputDir, file + '.enc');

        console.log(`🔐 Đang mã hóa: ${file}...`);

        if (encryptFile(inputPath, outputPath, password)) {
            successCount++;
            console.log(`   ✅ Thành công → ${outputPath}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Hoàn thành! Đã mã hóa ${successCount}/${totalCount} ảnh`);
    console.log(`📁 Vị trí: ${CONFIG.outputDir}/`);
    console.log('='.repeat(60));
    console.log('\n📝 Bước tiếp theo:');
    console.log('1. Xóa thư mục images/ (hoặc thêm vào .gitignore)');
    console.log('2. Đổi tên images-encrypted/ → images/');
    console.log('3. Cập nhật code trong index.html để load ảnh mã hóa');
    console.log('4. Push lên GitHub → Ảnh đã được bảo vệ! 🔒\n');
}

// Main
async function main() {
    console.log('🎄 SCRIPT MÃ HÓA ẢNH - CHRISTMAS TREE PROJECT 🎄\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('🔑 Nhập mật khẩu (phải giống mật khẩu trong website): ', (password) => {
        rl.close();

        if (!password || password.trim() === '') {
            console.error('❌ Mật khẩu không được để trống!');
            return;
        }

        const hash = sha256(password);
        console.log(`\n🔐 Password Hash: ${hash}`);
        console.log('⚠️  Đảm bảo hash này khớp với PASSWORD_HASH trong index.html!\n');

        encryptAllImages(password);
    });
}

main();
