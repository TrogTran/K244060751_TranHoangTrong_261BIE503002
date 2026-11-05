/**
 * Script: generate-xml.js
 * Sinh viên thực hiện: Trần Hoàng Trọng - MSSV: K244060751 - Lớp: K24406 - Mã đề: BW08
 * Mục đích (Câu 1): Gọi API https://fakestoreapi.com/products bằng fetch, bổ sung 2 trường `mausac` và `tonkho`,
 * sau đó chuyển đổi dữ liệu JSON sang định dạng XML chuẩn và in ra console (hoặc lưu vào products.xml).
 */

const colors = ["Đỏ", "Xanh", "Đen", "Trắng", "Vàng", "Xám"];

function escapeXml(unsafe) {
    if (unsafe === undefined || unsafe === null) return "";
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function generateProductsXml() {
    try {
        console.log("Đang lấy dữ liệu từ API https://fakestoreapi.com/products...");
        const response = await fetch("https://fakestoreapi.com/products");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();

        let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n`;

        products.forEach((p, index) => {
            const mausac = colors[index % colors.length];
            const tonkho = Math.floor(Math.random() * 80) + 10; // Tồn kho từ 10 đến 90

            xmlContent += `    <product>\n`;
            xmlContent += `        <id>${p.id}</id>\n`;
            xmlContent += `        <title>${escapeXml(p.title)}</title>\n`;
            xmlContent += `        <price>${p.price}</price>\n`;
            xmlContent += `        <description>${escapeXml(p.description)}</description>\n`;
            xmlContent += `        <category>${escapeXml(p.category)}</category>\n`;
            xmlContent += `        <image>${escapeXml(p.image)}</image>\n`;
            xmlContent += `        <rate>${p.rating ? p.rating.rate : 4.5}</rate>\n`;
            xmlContent += `        <count>${p.rating ? p.rating.count : 100}</count>\n`;
            xmlContent += `        <mausac>${mausac}</mausac>\n`;
            xmlContent += `        <tonkho>${tonkho}</tonkho>\n`;
            xmlContent += `    </product>\n`;
        });

        xmlContent += `</products>`;

        console.log("=== KẾT QUẢ TẠO FILE PRODUCTS.XML THÀNH CÔNG ===");
        console.log(xmlContent);

        // Hỗ trợ lưu file nếu chạy trong môi trường Node.js có module fs
        if (typeof process !== "undefined" && process.versions && process.versions.node) {
            const fs = await import("fs");
            const path = await import("path");
            const targetPath = path.resolve("./products.xml");
            fs.writeFileSync(targetPath, xmlContent, "utf-8");
            console.log(`Đã ghi file trực tiếp tại: ${targetPath}`);
        }

        return xmlContent;
    } catch (error) {
        console.error("Lỗi khi tạo products.xml từ API:", error);
    }
}

// Tự động chạy nếu gọi từ Node CLI
if (typeof require !== "undefined" && require.main === module) {
    generateProductsXml();
} else if (typeof module !== "undefined" && module.exports) {
    module.exports = { generateProductsXml };
}

