/**
 * Module giải mã ảnh trong browser
 * Sử dụng Web Crypto API để giải mã ảnh đã được mã hóa
 */

export class ImageDecryptor {
    constructor(password) {
        this.password = password;
        this.algorithm = 'AES-CBC';
    }

    /**
     * Tạo SHA-256 hash
     */
    async sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hashBuffer);
    }

    /**
     * Giải mã file ảnh
     * @param {ArrayBuffer} encryptedData - Dữ liệu đã mã hóa (IV + encrypted)
     * @returns {Promise<Blob>} - Blob ảnh gốc
     */
    async decryptImage(encryptedData) {
        try {
            // Lấy key từ password
            const keyData = await this.sha256(this.password);

            // Import key cho Web Crypto API
            const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: this.algorithm },
                false,
                ['decrypt']
            );

            // Tách IV (16 bytes đầu) và encrypted data
            const iv = encryptedData.slice(0, 16);
            const encrypted = encryptedData.slice(16);

            // Giải mã
            const decrypted = await crypto.subtle.decrypt(
                { name: this.algorithm, iv: iv },
                key,
                encrypted
            );

            // Trả về Blob
            return new Blob([decrypted]);
        } catch (error) {
            console.error('Lỗi giải mã:', error);
            throw new Error('Không thể giải mã ảnh');
        }
    }

    /**
     * Load và giải mã ảnh từ URL
     * @param {string} url - URL của file .enc
     * @returns {Promise<string>} - Data URL của ảnh
     */
    async loadEncryptedImage(url) {
        try {
            // Fetch file đã mã hóa
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const encryptedData = await response.arrayBuffer();

            // Giải mã
            const imageBlob = await this.decryptImage(encryptedData);

            // Convert sang Data URL để hiển thị
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imageBlob);
            });
        } catch (error) {
            // Bỏ qua im lặng - không log lỗi 404
            throw error;
        }
    }

    /**
     * Load nhiều ảnh mã hóa cùng lúc
     * @param {string[]} urls - Danh sách URL
     * @param {function} onProgress - Callback khi mỗi ảnh load xong
     * @returns {Promise<string[]>} - Danh sách Data URLs
     */
    async loadMultipleImages(urls, onProgress = null) {
        const results = [];

        for (let i = 0; i < urls.length; i++) {
            try {
                const dataUrl = await this.loadEncryptedImage(urls[i]);
                results.push(dataUrl);

                if (onProgress) {
                    onProgress(i + 1, urls.length, urls[i]);
                }
            } catch (error) {
                console.warn(`Bỏ qua ảnh lỗi: ${urls[i]}`);
                results.push(null);
            }
        }

        return results;
    }
}

/**
 * Helper function: Tự động quét và load tất cả ảnh .enc trong thư mục
 */
export async function autoLoadEncryptedImages(password, config = {}) {
    const {
        imageDir = './images',
        extensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
        maxCount = 200,
        onProgress = null
    } = config;

    const decryptor = new ImageDecryptor(password);
    const imageUrls = [];

    // Tạo danh sách URL để thử
    for (let i = 1; i <= maxCount; i++) {
        extensions.forEach(ext => {
            imageUrls.push(`${imageDir}/${i}.${ext}.enc`);
        });
    }

    // Load tất cả
    const dataUrls = await decryptor.loadMultipleImages(imageUrls, onProgress);

    // Lọc bỏ null (ảnh không tồn tại hoặc lỗi)
    return dataUrls.filter(url => url !== null);
}
