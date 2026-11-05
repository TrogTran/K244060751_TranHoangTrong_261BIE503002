/**
 * TRANG QUẢN TRỊ ADMIN - DỰ ÁN BÁN HÀNG GIẢ LẬP
 * Sinh viên thực hiện: Trần Hoàng Trọng
 * MSSV: K244060751 - Lớp: K24406
 * Mã đề: BW08
 */

// ==========================================
// 1. KIỂM TRA BẢO MẬT ĐĂNG NHẬP (CÂU 8 - BẮT BUỘC)
// ==========================================
if (localStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", function () {
    setupLogout();
    loadOrders();
    loadCustomers();
    loadWeatherHanoiAdmin();
    setupAdminModalEvents();
});

function setupLogout() {
    var btnLogout = document.getElementById("btnAdminLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", function () {
            localStorage.removeItem("adminLoggedIn");
            window.location.href = "login.html";
        });
    }
}

// ==========================================
// 2. TÍNH TOÁN THỐNG KÊ (DASHBOARD METRICS)
// ==========================================
function updateDashboardMetrics(orders) {
    var totalOrders = orders.length;
    var totalRevenue = 0;
    var totalProductsSold = 0;

    for (var i = 0; i < orders.length; i++) {
        var ord = orders[i];
        totalRevenue += parseFloat(ord.tongtien) || 0;
        if (ord.chitiethoadon && Array.isArray(ord.chitiethoadon)) {
            for (var j = 0; j < ord.chitiethoadon.length; j++) {
                totalProductsSold += parseInt(ord.chitiethoadon[j].soluong) || 0;
            }
        }
    }

    var elOrders = document.getElementById("statTotalOrders");
    var elRevenue = document.getElementById("statTotalRevenue");
    var elSold = document.getElementById("statTotalProductsSold");

    if (elOrders) elOrders.innerText = totalOrders;
    if (elRevenue) elRevenue.innerText = "$" + totalRevenue.toFixed(2);
    if (elSold) elSold.innerText = totalProductsSold + " sp";
}

// ==========================================
// 3. ĐỌC VÀ HIỂN THỊ ĐƠN HÀNG (LOCALSTORAGE & CARTS.XML)
// ==========================================
function loadOrders() {
    var tbody = document.getElementById("tbodyOrders");
    if (!tbody) return;

    var orders = [];
    var savedOrders = localStorage.getItem("orders");

    if (savedOrders) {
        try {
            orders = JSON.parse(savedOrders);
        } catch (e) {
            orders = [];
        }
    }

    // Nếu chưa có đơn hàng trong LocalStorage, nạp mẫu từ carts.xml
    if (!orders || orders.length === 0) {
        seedOrdersFromXml(tbody);
        return;
    }

    updateDashboardMetrics(orders);
    renderOrdersTable(orders, tbody);
}

function seedOrdersFromXml(tbody) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "carts.xml", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            var orders = [];
            if (xhr.status === 200 || xhr.status === 0) {
                var xmlDoc = xhr.responseXML;
                if (!xmlDoc) {
                    var parser = new DOMParser();
                    xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");
                }
                var hoadonNodes = xmlDoc.getElementsByTagName("hoadon");
                for (var i = 0; i < hoadonNodes.length; i++) {
                    var node = hoadonNodes[i];
                    var mahd = getNodeText(node, "mahd");
                    var ngaytao = getNodeText(node, "ngaytao");
                    var tenkhachhang = getNodeText(node, "tenkhachhang");
                    var email = getNodeText(node, "email");
                    var sdt = getNodeText(node, "sdt");
                    var nhanvien = getNodeText(node, "nhanvien") || "Admin Trần Hoàng Trọng";
                    var tongtien = parseFloat(getNodeText(node, "tongtien")) || 0;

                    var spNodes = node.getElementsByTagName("sanpham");
                    var chitiethoadon = [];
                    for (var j = 0; j < spNodes.length; j++) {
                        chitiethoadon.push({
                            masp: getNodeText(spNodes[j], "masp"),
                            tensp: getNodeText(spNodes[j], "tensp"),
                            dongia: parseFloat(getNodeText(spNodes[j], "dongia")) || 0,
                            soluong: parseInt(getNodeText(spNodes[j], "soluong")) || 1,
                            thanhtien: parseFloat(getNodeText(spNodes[j], "thanhtien")) || 0
                        });
                    }

                    orders.push({
                        mahd: mahd,
                        ngaytao: ngaytao,
                        tenkhachhang: tenkhachhang,
                        email: email,
                        sdt: sdt,
                        nhanvien: nhanvien,
                        tongtien: tongtien,
                        chitiethoadon: chitiethoadon
                    });
                }
                localStorage.setItem("orders", JSON.stringify(orders));
            }
            updateDashboardMetrics(orders);
            renderOrdersTable(orders, tbody);
        }
    };
    xhr.send();
}

function getNodeText(parentNode, tagName) {
    var tag = parentNode.getElementsByTagName(tagName)[0];
    if (tag && tag.childNodes && tag.childNodes.length > 0) {
        return tag.childNodes[0].nodeValue.trim();
    }
    return "";
}

function renderOrdersTable(orders, tbody) {
    var orderCountEl = document.getElementById("orderCount");
    if (orderCountEl) orderCountEl.innerText = "Tổng số: " + orders.length + " đơn hàng";

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#888;">Chưa có đơn hàng nào được ghi nhận.</td></tr>';
        return;
    }

    var html = "";
    for (var i = 0; i < orders.length; i++) {
        var ord = orders[i];
        var formattedDate = new Date(ord.ngaytao).toLocaleString("vi-VN");
        var itemCount = ord.chitiethoadon ? ord.chitiethoadon.length : 0;

        html += '<tr>' +
            '<td><b>#' + ord.mahd + '</b></td>' +
            '<td>' + formattedDate + '</td>' +
            '<td><b>' + ord.tenkhachhang + '</b></td>' +
            '<td>' + ord.email + '<br><small style="color:#666;">' + ord.sdt + '</small></td>' +
            '<td><span class="status-badge">' + itemCount + ' sản phẩm</span></td>' +
            '<td><b style="color:#d32f2f;">$' + parseFloat(ord.tongtien).toFixed(2) + '</b></td>' +
            '<td>' +
                '<button class="btn-quick-view" onclick="viewOrderDetail(\'' + ord.mahd + '\')" style="padding: 6px 12px; font-size:12px;">Xem chi tiết</button>' +
            '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
}

window.viewOrderDetail = function (orderId) {
    var orders = JSON.parse(localStorage.getItem("orders") || "[]");
    var order = orders.find(function (o) { return o.mahd === orderId; });
    if (!order) return;

    var modal = document.getElementById("orderDetailModal");
    var titleEl = document.getElementById("orderDetailTitle");
    var bodyEl = document.getElementById("orderDetailBody");

    if (titleEl) titleEl.innerText = "Chi Tiết Hóa Đơn #" + order.mahd;

    var itemsHtml = '<table class="admin-table" style="margin-top: 10px;">' +
        '<thead><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th></tr></thead><tbody>';

    if (order.chitiethoadon && order.chitiethoadon.length > 0) {
        order.chitiethoadon.forEach(function (sp) {
            itemsHtml += '<tr>' +
                '<td>' + sp.masp + '</td>' +
                '<td>' + sp.tensp + '</td>' +
                '<td>$' + parseFloat(sp.dongia).toFixed(2) + '</td>' +
                '<td><b>x' + sp.soluong + '</b></td>' +
                '<td><b style="color:#2e7d32;">$' + parseFloat(sp.thanhtien).toFixed(2) + '</b></td>' +
            '</tr>';
        });
    }

    itemsHtml += '</tbody></table>';

    bodyEl.innerHTML = '<div style="margin-bottom: 14px; background:#f5f5f5; padding: 12px; border-radius: 6px; font-size:13px; line-height: 1.6;">' +
        '<p><b>Khách hàng:</b> ' + order.tenkhachhang + '</p>' +
        '<p><b>Email:</b> ' + order.email + ' | <b>Số điện thoại:</b> ' + order.sdt + '</p>' +
        '<p><b>Nhân viên phụ trách:</b> <span style="color:#1a237e; font-weight:bold;">' + (order.nhanvien || "Admin Trần Hoàng Trọng") + '</span></p>' +
        '<p><b>Ngày đặt hàng:</b> ' + new Date(order.ngaytao).toLocaleString("vi-VN") + '</p>' +
        '<p><b>Tổng giá trị đơn hàng:</b> <span style="font-size:16px; color:#d32f2f; font-weight:bold;">$' + parseFloat(order.tongtien).toFixed(2) + '</span></p>' +
    '</div>' +
    '<h4 style="color:#1a237e; margin-top: 10px;">Danh sách sản phẩm đã đặt:</h4>' +
    itemsHtml;

    if (modal) modal.classList.add("active");
};

// ==========================================
// 4. QUẢN LÝ KHÁCH HÀNG (CUSTOMERS.JSON)
// ==========================================
function loadCustomers() {
    var tbody = document.getElementById("tbodyCustomers");
    if (!tbody) return;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "customers.json", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
                try {
                    var customers = JSON.parse(xhr.responseText);
                    var html = "";
                    customers.forEach(function (c) {
                        html += '<tr>' +
                            '<td><b>' + c.id + '</b></td>' +
                            '<td>' + c.hoten + '</td>' +
                            '<td>' + c.email + '</td>' +
                            '<td>' + c.sdt + '</td>' +
                            '<td>' + c.diachi + '</td>' +
                            '<td><span class="status-badge" style="background:#e3f2fd; color:#1565c0;">' + c.role + '</span></td>' +
                            '<td>' + new Date(c.ngaytao).toLocaleDateString("vi-VN") + '</td>' +
                        '</tr>';
                    });
                    tbody.innerHTML = html;
                } catch (e) {
                    tbody.innerHTML = '<tr><td colspan="7">Lỗi đọc file customers.json</td></tr>';
                }
            }
        }
    };
    xhr.send();
}

function setupAdminModalEvents() {
    var closeButtons = document.querySelectorAll(".btn-close-modal");
    closeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".modal-overlay").forEach(function (m) {
                m.classList.remove("active");
            });
        });
    });
}

function loadWeatherHanoiAdmin() {
    var weatherEl = document.getElementById("weatherWidgetAdmin");
    if (!weatherEl) return;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://eth.cnnd.vn/api-weather.htm", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var hnData = data.find(function (i) {
                        return i.location && i.location.indexOf("Hà Nội") !== -1;
                    });
                    if (hnData) {
                        weatherEl.innerHTML = "⛅ Thời tiết Hà Nội: <b>" + (hnData.temperature || "26") + "°C</b> - " + (hnData.status || "Nắng nhẹ");
                        return;
                    }
                } catch (e) {}
            }
            weatherEl.innerHTML = "⛅ Thời tiết Hà Nội: <b>26°C</b> - Trời có mây, nắng nhẹ";
        }
    };
    xhr.send();
}
