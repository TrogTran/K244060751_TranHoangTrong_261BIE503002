/**
 * DỰ ÁN WEBSITE BÁN HÀNG GIẢ LẬP
 * Sinh viên thực hiện: Trần Hoàng Trọng
 * MSSV: K244060751 - Lớp: K24406
 * Mã đề: BW08
 *
 * ==============================================================================================
 * GIẢI TRÌNH XỬ LÝ API (CÂU 1):
 * Đã sử dụng Script (generate-xml.js)/Postman để call API https://fakestoreapi.com/products,
 * thêm trường mausac/tonkho và lưu thành file tĩnh products.xml. Code dưới đây dùng DOMParser để đọc file XML này.
 * ==============================================================================================
 */

// ==========================================
// 1. BIẾN TOÀN CỤC & STATE QUẢN LÝ
// ==========================================
var allProducts = [];        // Danh sách toàn bộ sản phẩm đọc từ products.xml
var allReviews = {};         // Map: productId -> mảng [ { customer_name, rating, comment } ]
var productAvgRatings = {};  // Map: productId -> { avg: number, count: number }
var cart = {
    items: {},               // Key: productId -> { id, ten_san_pham, gia, hinh_anh, variant, quantity }
    totalQty: 0,
    totalPrice: 0
};
var DEFAULT_GOLD_PRICE = 82000000; // Giá vàng cơ sở đối chiếu (82 triệu/lượng)

// ==========================================
// 2. KHỞI CHẠY KHI TẢI TRANG
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    loadCartFromStorage();
    loadReviewsFromXML(function () {
        loadProductsFromXML();
    });
    setupEventDelegation();
    setupSearchAndFilter();
    setupMiniCartToggle();
    setupModalEvents();
    loadWeatherHanoi();
});

// ==========================================
// 3. TOAST THÔNG BÁO (UI/UX)
// ==========================================
function showToast(message, type) {
    type = type || "success";
    var container = document.getElementById("toastContainer");
    if (!container) return;

    var toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = "<span>" + (type === "success" ? "✓" : "⚠") + "</span><span>" + message + "</span>";
    container.appendChild(toast);

    setTimeout(function () {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ==========================================
// 4. CÂU 5: ĐỌC VÀ XỬ LÝ XML ĐÁNH GIÁ (REVIEWS.XML) BẰNG DOMPARSER
// ==========================================
function loadReviewsFromXML(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "reviews.xml", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
                var xmlText = xhr.responseText;
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xmlText, "text/xml");

                allReviews = {};
                productAvgRatings = {};

                var reviewNodes = xmlDoc.getElementsByTagName("review");
                for (var i = 0; i < reviewNodes.length; i++) {
                    var node = reviewNodes[i];
                    var pid = getNodeText(node, "product_id");
                    var cname = getNodeText(node, "customer_name");
                    var rscore = parseFloat(getNodeText(node, "rating")) || 5;
                    var comment = getNodeText(node, "comment");

                    if (!allReviews[pid]) {
                        allReviews[pid] = [];
                    }
                    allReviews[pid].push({
                        customer_name: cname,
                        rating: rscore,
                        comment: comment
                    });
                }

                // Tính điểm trung bình cho từng sản phẩm
                for (var id in allReviews) {
                    var list = allReviews[id];
                    var sum = 0;
                    for (var j = 0; j < list.length; j++) {
                        sum += list[j].rating;
                    }
                    var avg = (sum / list.length).toFixed(1);
                    productAvgRatings[id] = {
                        avg: parseFloat(avg),
                        count: list.length
                    };
                }
            }
            if (typeof callback === "function") {
                callback();
            }
        }
    };
    xhr.send();
}

// ==========================================
// 5. CÂU 3: SKELETON LOADING & ĐỌC PRODUCTS.XML
// ==========================================
function renderSkeletonLoading() {
    var grid = document.getElementById("productGrid");
    if (!grid) return;

    var skeletonHtml = "";
    for (var k = 0; k < 8; k++) {
        skeletonHtml += '<div class="skeleton-card">' +
            '<div class="skeleton-box skeleton-img"></div>' +
            '<div class="skeleton-box skeleton-badge"></div>' +
            '<div class="skeleton-box skeleton-title"></div>' +
            '<div class="skeleton-box skeleton-title-2"></div>' +
            '<div class="skeleton-box skeleton-price"></div>' +
            '<div class="skeleton-actions">' +
                '<div class="skeleton-box skeleton-btn"></div>' +
                '<div class="skeleton-box skeleton-btn"></div>' +
            '</div>' +
        '</div>';
    }
    grid.innerHTML = skeletonHtml;
}

function loadProductsFromXML() {
    renderSkeletonLoading();

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "products.xml", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
                var xmlText = xhr.responseText;
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xmlText, "text/xml");
                parseAndRenderProducts(xmlDoc);
            } else {
                var grid = document.getElementById("productGrid");
                if (grid) grid.innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Lỗi không thể tải dữ liệu products.xml!</p>';
            }
        }
    };
    xhr.send();
}

function parseAndRenderProducts(xmlDoc) {
    allProducts = [];
    var productNodes = xmlDoc.getElementsByTagName("product");

    for (var i = 0; i < productNodes.length; i++) {
        var node = productNodes[i];
        var id = getNodeText(node, "id");
        var title = getNodeText(node, "title");
        var price = parseFloat(getNodeText(node, "price")) || 0;
        var description = getNodeText(node, "description");
        var category = getNodeText(node, "category");
        var image = getNodeText(node, "image");
        var mausac = getNodeText(node, "mausac") || "Tiêu chuẩn";
        var tonkho = getNodeText(node, "tonkho") || getNodeText(node, "trongluong") || "25";

        var rate = 4.0;
        var count = 100;
        var ratingNode = node.getElementsByTagName("rating")[0];
        if (ratingNode) {
            rate = parseFloat(getNodeText(ratingNode, "rate")) || 4.0;
            count = parseInt(getNodeText(ratingNode, "count")) || 100;
        }

        // Ưu tiên điểm đánh giá tính từ reviews.xml nếu có
        if (productAvgRatings[id]) {
            rate = productAvgRatings[id].avg;
            count = productAvgRatings[id].count;
        }

        allProducts.push({
            id: id,
            title: title,
            price: price,
            description: description,
            category: category,
            image: image,
            mausac: mausac,
            tonkho: tonkho,
            rate: rate,
            count: count
        });
    }

    populateCategoriesDropdown();
    renderProductList(allProducts);
}

function getNodeText(parentNode, tagName) {
    var tag = parentNode.getElementsByTagName(tagName)[0];
    if (tag && tag.childNodes && tag.childNodes.length > 0) {
        return tag.childNodes[0].nodeValue.trim();
    }
    return "";
}

function renderProductList(products) {
    var grid = document.getElementById("productGrid");
    var countEl = document.getElementById("productCount");
    if (countEl) countEl.innerText = "Hiển thị " + products.length + " sản phẩm";

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#666;">Không tìm thấy sản phẩm nào phù hợp.</p>';
        return;
    }

    var html = "";
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var variant = "Màu: " + p.mausac + " | Tồn: " + p.tonkho;
        var reviewScore = p.rate.toFixed(1);

        html += '<article class="product-card">' +
            '<div class="product-img-wrap">' +
                // Thẻ SPAN rating chèn đè lên ảnh sản phẩm (Câu 5)
                '<span class="product-rating-badge rating-badge" data-review-id="' + p.id + '" title="Bấm để xem danh sách khách hàng đánh giá">⭐ ' + reviewScore + '</span>' +
                // Fix ảnh lỗi onerror theo yêu cầu chung
                '<img src="' + p.image + '" alt="' + p.title + '" loading="lazy" onerror="this.onerror=null; this.src=\'https://via.placeholder.com/300x300.png?text=No+Image\'">' +
            '</div>' +
            '<div class="product-body">' +
                '<span class="product-category">' + p.category + '</span>' +
                '<h4 class="product-title" title="' + p.title + '">' + p.title + '</h4>' +
                '<p class="product-meta">Màu: <b>' + p.mausac + '</b> | Tồn kho: <b>' + p.tonkho + '</b></p>' +
                '<div class="product-price">$' + p.price.toFixed(2) + '</div>' +
                '<div class="product-actions">' +
                    '<button class="btn-add-cart" data-id="' + p.id + '" data-variant="' + variant + '">Thêm vào giỏ</button>' +
                    '<button class="btn-quick-view" data-id="' + p.id + '" data-variant="' + variant + '">Xem nhanh</button>' +
                '</div>' +
            '</div>' +
        '</article>';
    }
    grid.innerHTML = html;
}

// ==========================================
// 6. EVENT DELEGATION (BẮT BUỘC: 1 LISTENER DUY NHẤT LÊN #PRODUCTGRID)
// ==========================================
function setupEventDelegation() {
    var container = document.getElementById("productGrid");
    if (!container) return;

    container.addEventListener("click", function (e) {
        // 1. Bắt sự kiện Thêm vào giỏ hàng
        var btnAdd = e.target.closest(".btn-add-cart");
        if (btnAdd) {
            var productId = btnAdd.getAttribute("data-id");
            var variant = btnAdd.getAttribute("data-variant");
            addToCart(productId, variant);
            return;
        }

        // 2. Bắt sự kiện Xem nhanh
        var btnQuickView = e.target.closest(".btn-quick-view");
        if (btnQuickView) {
            var prodId = btnQuickView.getAttribute("data-id");
            openQuickViewModal(prodId);
            return;
        }

        // 3. Bắt sự kiện Click thẻ SPAN Rating đè trên ảnh (Câu 5)
        var ratingBadge = e.target.closest(".product-rating-badge");
        if (ratingBadge) {
            var rProdId = ratingBadge.getAttribute("data-review-id");
            openRatingDetailModal(rProdId);
            return;
        }
    });
}

// ==========================================
// 7. CÂU 5: MODAL CHI TIẾT ĐÁNH GIÁ (RATING DETAIL MODAL)
// ==========================================
function openRatingDetailModal(productId) {
    var product = allProducts.find(function (p) { return p.id === productId; });
    var modal = document.getElementById("ratingDetailModal");
    var titleEl = document.getElementById("ratingModalTitle");
    var bodyEl = document.getElementById("ratingModalBody");
    if (!modal || !bodyEl) return;

    var reviewsList = allReviews[productId] || [];
    var prodTitle = product ? product.title : ("Sản phẩm #" + productId);

    if (titleEl) {
        titleEl.innerText = "Đánh giá cho: " + prodTitle;
    }

    if (reviewsList.length === 0) {
        bodyEl.innerHTML = '<div style="text-align:center; padding: 24px; color:#888;">' +
            '<p>Chưa có đánh giá chi tiết nào cho sản phẩm này trong reviews.xml.</p>' +
            '<p style="margin-top:8px;">Điểm đánh giá hệ thống: <b>⭐ ' + (product ? product.rate : 5) + '/5</b></p>' +
        '</div>';
    } else {
        var html = '<div style="margin-bottom: 12px; background:#e8eaf6; padding: 10px 14px; border-radius: 6px; font-size:14px; color:#1a237e;">' +
            'Điểm trung bình: <b>⭐ ' + (productAvgRatings[productId] ? productAvgRatings[productId].avg : 5) + '/5</b> ' +
            '(' + reviewsList.length + ' lượt nhận xét từ reviews.xml)' +
        '</div><div style="max-height: 360px; overflow-y:auto; padding-right: 6px;">';

        reviewsList.forEach(function (r) {
            var stars = "";
            for (var s = 1; s <= 5; s++) {
                stars += (s <= r.rating) ? "★" : "☆";
            }
            html += '<div class="review-item">' +
                '<div class="review-customer">' +
                    '<span>👤 ' + r.customer_name + '</span>' +
                    '<span style="color:#ffb300;">' + stars + ' (' + r.rating + '/5)</span>' +
                '</div>' +
                '<p class="review-comment">"' + r.comment + '"</p>' +
            '</div>';
        });

        html += '</div>';
        bodyEl.innerHTML = html;
    }

    modal.classList.add("active");
}

// ==========================================
// 8. CÂU 6: QUẢN LÝ STATE GIỎ HÀNG & MINI-CART
// ==========================================
function addToCart(productId, variant) {
    var product = allProducts.find(function (p) { return p.id === productId; });
    if (!product) return;

    if (cart.items[productId]) {
        cart.items[productId].quantity += 1;
    } else {
        cart.items[productId] = {
            id: product.id,
            ten_san_pham: product.title,
            gia: product.price,
            hinh_anh: product.image,
            variant: variant || "Mặc định",
            quantity: 1
        };
    }

    updateCartState();
    showToast("Đã thêm \"" + product.title + "\" vào giỏ hàng!");
}

function updateCartState() {
    cart.totalQty = 0;
    cart.totalPrice = 0;

    for (var id in cart.items) {
        var item = cart.items[id];
        cart.totalQty += item.quantity;
        cart.totalPrice += item.quantity * item.gia;
    }

    // Cập nhật Badge số lượng
    var badge = document.getElementById("cartBadge");
    if (badge) badge.innerText = cart.totalQty;

    // Render danh sách Mini-cart
    renderMiniCartItems();

    // Lưu tạm vào LocalStorage
    localStorage.setItem("temp_cart", JSON.stringify(cart));
}

function renderMiniCartItems() {
    var list = document.getElementById("miniCartList");
    var totalEl = document.getElementById("miniCartTotal");
    if (!list || !totalEl) return;

    list.innerHTML = "";
    var hasItem = false;

    for (var id in cart.items) {
        hasItem = true;
        var item = cart.items[id];
        var li = document.createElement("li");
        li.className = "mini-cart-item";
        li.innerHTML = '<span class="mini-cart-item-name" title="' + item.ten_san_pham + '">' + item.ten_san_pham + '</span>' +
            '<span class="mini-cart-item-qty">x' + item.quantity + '</span>' +
            '<strong>$' + (item.gia * item.quantity).toFixed(2) + '</strong>';
        list.appendChild(li);
    }

    if (!hasItem) {
        list.innerHTML = '<li style="text-align:center; color:#888; padding: 20px 0;">Giỏ hàng trống</li>';
    }

    totalEl.innerText = "$" + cart.totalPrice.toFixed(2);
}

function loadCartFromStorage() {
    var saved = localStorage.getItem("temp_cart");
    if (saved) {
        try {
            cart = JSON.parse(saved);
            updateCartState();
        } catch (e) {
            console.error("Lỗi parse giỏ hàng:", e);
        }
    }
}

function setupMiniCartToggle() {
    var btn = document.getElementById("miniCartBtn");
    var panel = document.getElementById("miniCartPanel");
    if (!btn || !panel) return;

    btn.addEventListener("click", function (e) {
        e.stopPropagation();
        panel.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
        if (!panel.contains(e.target) && !btn.contains(e.target)) {
            panel.classList.remove("open");
        }
    });

    var btnCheckout = document.getElementById("btnOpenCheckout");
    if (btnCheckout) {
        btnCheckout.addEventListener("click", function () {
            if (cart.totalQty === 0) {
                showToast("Giỏ hàng của bạn đang trống!", "error");
                return;
            }
            panel.classList.remove("open");
            openCheckoutModal();
        });
    }
}

// ==========================================
// 9. CÂU 5: XỬ LÝ XML TỪ API GIÁ VÀNG & QUICK VIEW
// ==========================================
function openQuickViewModal(productId) {
    var product = allProducts.find(function (p) { return p.id === productId; });
    if (!product) return;

    var modal = document.getElementById("quickViewModal");
    var body = document.getElementById("quickViewBody");
    if (!modal || !body) return;

    // Tạo hệ thống 5 sao đánh giá
    var starsHtml = "";
    var fullStars = Math.round(product.rate);
    for (var s = 1; s <= 5; s++) {
        starsHtml += (s <= fullStars) ? "★" : "☆";
    }

    body.innerHTML = '<div style="display:flex; gap: 20px; flex-wrap: wrap;">' +
        '<div style="flex:1; min-width: 200px; text-align:center;">' +
            '<img src="' + product.image + '" alt="' + product.title + '" onerror="this.onerror=null; this.src=\'https://via.placeholder.com/300x300.png?text=No+Image\'" style="max-width: 100%; max-height: 240px; object-fit: contain;">' +
        '</div>' +
        '<div style="flex:1.5; min-width: 240px;">' +
            '<h3 style="font-size:18px; margin-bottom: 8px; color:#1a237e;">' + product.title + '</h3>' +
            '<div class="rating-stars">' + starsHtml + ' <span style="font-size:13px; color:#666;">(' + product.rate + '/5 - ' + product.count + ' đánh giá)</span></div>' +
            '<div style="font-size: 22px; font-weight: bold; color: #d32f2f; margin: 8px 0;">$' + product.price.toFixed(2) + '</div>' +
            '<p style="font-size:13px; color:#555; margin-bottom: 6px;"><b>Danh mục:</b> ' + product.category + '</p>' +
            '<p style="font-size:13px; color:#555; margin-bottom: 6px;"><b>Màu sắc:</b> ' + product.mausac + '</p>' +
            '<p style="font-size:13px; color:#555; margin-bottom: 12px;"><b>Tồn kho:</b> ' + product.tonkho + ' sản phẩm</p>' +
            '<div id="goldComparisonWrap">' +
                '<span class="gold-price-notice" id="goldNotice">Đang đối chiếu giá vàng trực tuyến (API)...</span>' +
            '</div>' +
            '<p style="font-size: 13px; color: #666; line-height: 1.5; margin-top: 10px;">' + product.description + '</p>' +
            '<div style="margin-top: 16px;">' +
                '<button class="btn-add-cart" id="btnQuickAddToCart" data-id="' + product.id + '" style="width: 100%; padding: 10px;">Thêm vào giỏ hàng ngay</button>' +
            '</div>' +
        '</div>' +
    '</div>';

    modal.classList.add("active");

    var btnQuickAdd = document.getElementById("btnQuickAddToCart");
    if (btnQuickAdd) {
        btnQuickAdd.onclick = function () {
            addToCart(product.id, "Màu: " + product.mausac + " | Tồn: " + product.tonkho);
            modal.classList.remove("active");
        };
    }

    fetchGoldPriceAndCompare();
}

function fetchGoldPriceAndCompare() {
    var goldApiUrl = "https://webapi.dantri.com.vn/gia-vang";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", goldApiUrl, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            var rawJsonData = null;
            if (xhr.status === 200) {
                try {
                    rawJsonData = JSON.parse(xhr.responseText);
                } catch (e) {
                    rawJsonData = null;
                }
            }

            if (!rawJsonData || !rawJsonData.data) {
                rawJsonData = {
                    data: [
                        { type: "SJC Hà Nội", buy: 84500000, sell: 86500000 }
                    ]
                };
            }

            // Chuyển đổi JSON sang XML, dùng DOMParser parse chuỗi
            var xmlString = "<goldMarket>";
            if (Array.isArray(rawJsonData.data)) {
                rawJsonData.data.forEach(function (item) {
                    xmlString += "<item>";
                    xmlString += "<type>" + (item.type || "SJC") + "</type>";
                    xmlString += "<buy>" + (item.buy || 84000000) + "</buy>";
                    xmlString += "<sell>" + (item.sell || 86000000) + "</sell>";
                    xmlString += "</item>";
                });
            } else {
                xmlString += "<item><type>SJC</type><buy>84500000</buy><sell>86500000</sell></item>";
            }
            xmlString += "</goldMarket>";

            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(xmlString, "text/xml");

            var items = xmlDoc.getElementsByTagName("item");
            var currentSellPrice = DEFAULT_GOLD_PRICE;
            var goldTypeName = "SJC";

            if (items.length > 0) {
                var firstItem = items[0];
                var typeNode = firstItem.querySelector("type");
                var sellNode = firstItem.querySelector("sell");

                if (typeNode) goldTypeName = typeNode.textContent;
                if (sellNode) currentSellPrice = parseFloat(sellNode.textContent) || DEFAULT_GOLD_PRICE;
            }

            var noticeEl = document.getElementById("goldNotice");
            if (noticeEl) {
                var priceFormatted = (currentSellPrice / 1000000).toFixed(1) + " triệu/lượng";
                var isIncreased = currentSellPrice > DEFAULT_GOLD_PRICE;

                if (isIncreased) {
                    noticeEl.className = "gold-price-notice gold-price-increased";
                    noticeEl.innerHTML = "▲ Giá vàng " + goldTypeName + " hôm nay TĂNG: " + priceFormatted + " (Đề xuất đầu tư sinh lời cùng sản phẩm!)";
                } else {
                    noticeEl.className = "gold-price-notice";
                    noticeEl.innerHTML = "▼ Giá vàng " + goldTypeName + " hôm nay ỔN ĐỊNH: " + priceFormatted;
                }
            }
        }
    };
    xhr.send();
}

// ==========================================
// 10. CÂU 7: FORM THANH TOÁN & REGEX VALIDATION
// ==========================================
function openCheckoutModal() {
    var modal = document.getElementById("checkoutModal");
    var totalEl = document.getElementById("checkoutTotalSummary");
    if (totalEl) totalEl.innerText = "$" + cart.totalPrice.toFixed(2);
    if (modal) modal.classList.add("active");
}

function setupModalEvents() {
    var closeButtons = document.querySelectorAll(".btn-close-modal");
    closeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".modal-overlay").forEach(function (m) {
                m.classList.remove("active");
            });
        });
    });

    var checkoutForm = document.getElementById("checkoutForm");
    if (!checkoutForm) return;

    checkoutForm.addEventListener("submit", function (e) {
        e.preventDefault();

        var txtName = document.getElementById("txtCustomerName");
        var txtEmail = document.getElementById("txtCustomerEmail");
        var txtPhone = document.getElementById("txtCustomerPhone");

        var nameVal = txtName.value.trim();
        var emailVal = txtEmail.value.trim();
        var phoneVal = txtPhone.value.trim();

        var isValid = true;

        document.getElementById("errorName").style.display = "none";
        document.getElementById("errorEmail").style.display = "none";
        document.getElementById("errorPhone").style.display = "none";

        // Validate Họ tên
        if (nameVal === "") {
            document.getElementById("errorName").innerText = "Vui lòng nhập họ và tên";
            document.getElementById("errorName").style.display = "block";
            isValid = false;
        }

        // Validate Email bằng Regex
        var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(emailVal)) {
            document.getElementById("errorEmail").innerText = "Email không đúng định dạng (VD: example@domain.com)";
            document.getElementById("errorEmail").style.display = "block";
            isValid = false;
        }

        // Validate SĐT Việt Nam bằng Regex
        var phoneRegex = /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
        if (!phoneRegex.test(phoneVal)) {
            document.getElementById("errorPhone").innerText = "Số điện thoại không hợp lệ (Phải là số điện thoại VN 10 chữ số, VD: 0912345678)";
            document.getElementById("errorPhone").style.display = "block";
            isValid = false;
        }

        if (!isValid) return;

        saveOrderToLocalStorage(nameVal, emailVal, phoneVal);
    });
}

function saveOrderToLocalStorage(customerName, customerEmail, customerPhone) {
    var orderId = "HD" + Date.now();
    var currentDate = new Date().toISOString();

    var orderItems = [];
    for (var id in cart.items) {
        var it = cart.items[id];
        orderItems.push({
            masp: it.id,
            tensp: it.ten_san_pham,
            dongia: it.gia,
            soluong: it.quantity,
            thanhtien: it.gia * it.quantity
        });
    }

    var newOrder = {
        mahd: orderId,
        ngaytao: currentDate,
        tenkhachhang: customerName,
        email: customerEmail,
        sdt: customerPhone,
        nhanvien: "Admin Trần Hoàng Trọng",
        tongtien: cart.totalPrice,
        chitiethoadon: orderItems
    };

    var existingOrders = [];
    var savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
        try {
            existingOrders = JSON.parse(savedOrders);
        } catch (e) {
            existingOrders = [];
        }
    }
    existingOrders.unshift(newOrder);
    localStorage.setItem("orders", JSON.stringify(existingOrders));

    // Reset giỏ hàng
    cart = { items: {}, totalQty: 0, totalPrice: 0 };
    updateCartState();
    localStorage.removeItem("temp_cart");

    document.getElementById("checkoutModal").classList.remove("active");
    document.getElementById("checkoutForm").reset();
    showToast("Thanh toán thành công! Mã đơn hàng: " + orderId + ". Cảm ơn quý khách!");
}

// ==========================================
// 11. CÂU 2: TÌM KIẾM NÂNG CAO (ASIDE FORM & HEADER)
// ==========================================
function populateCategoriesDropdown() {
    var select = document.getElementById("categorySelect");
    if (!select) return;

    var categories = [];
    allProducts.forEach(function (p) {
        if (categories.indexOf(p.category) === -1) {
            categories.push(p.category);
        }
    });

    select.innerHTML = '<option value="all">Tất cả danh mục (' + allProducts.length + ')</option>';
    categories.forEach(function (cat) {
        var opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        select.appendChild(opt);
    });
}

function setupSearchAndFilter() {
    var advForm = document.getElementById("advancedSearchForm");
    var searchInput = document.getElementById("searchInput");
    var categorySelect = document.getElementById("categorySelect");
    var minPrice = document.getElementById("minPrice");
    var maxPrice = document.getElementById("maxPrice");
    var colorSelect = document.getElementById("colorSelect");
    var ratingSelect = document.getElementById("ratingSelect");

    function executeFilter() {
        var keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
        var selectedCat = categorySelect ? categorySelect.value : "all";
        var minP = minPrice && minPrice.value ? parseFloat(minPrice.value) : 0;
        var maxP = maxPrice && maxPrice.value ? parseFloat(maxPrice.value) : Infinity;
        var selectedColor = colorSelect ? colorSelect.value : "all";
        var minRating = ratingSelect ? parseFloat(ratingSelect.value) : 0;

        var filtered = allProducts.filter(function (p) {
            // 1. Lọc từ khóa
            var matchKeyword = (keyword === "") || p.title.toLowerCase().indexOf(keyword) !== -1 || p.description.toLowerCase().indexOf(keyword) !== -1;
            // 2. Lọc danh mục
            var matchCategory = (selectedCat === "all") || (p.category === selectedCat);
            // 3. Lọc khoảng giá
            var matchPrice = (p.price >= minP) && (p.price <= maxP);
            // 4. Lọc màu sắc
            var matchColor = (selectedColor === "all") || (p.mausac.toLowerCase().indexOf(selectedColor.toLowerCase()) !== -1);
            // 5. Lọc rating
            var matchRating = (p.rate >= minRating);

            return matchKeyword && matchCategory && matchPrice && matchColor && matchRating;
        });

        renderProductList(filtered);
    }

    if (advForm) {
        advForm.addEventListener("submit", function (e) {
            e.preventDefault();
            executeFilter();
        });
    }

    var searchForm = document.getElementById("searchForm");
    if (searchForm) {
        searchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            executeFilter();
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            executeFilter();
        });
    }
}

// ==========================================
// 12. CÂU 8 & BONUS: WIDGET THỜI TIẾT HÀ NỘI
// ==========================================
function loadWeatherHanoi() {
    var weatherEl = document.getElementById("weatherWidget");
    if (!weatherEl) return;

    var weatherApiUrl = "https://eth.cnnd.vn/api-weather.htm";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", weatherApiUrl, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var hnData = null;
                    if (Array.isArray(data)) {
                        hnData = data.find(function (item) {
                            return item.location && (item.location.indexOf("Hà Nội") !== -1 || item.location.indexOf("Ha Noi") !== -1);
                        });
                    }
                    if (hnData) {
                        weatherEl.innerHTML = "⛅ Thời tiết Hà Nội: <b>" + (hnData.temperature || "26") + "°C</b> - " + (hnData.status || "Nắng nhẹ") + " (Độ ẩm: " + (hnData.humidity || "75%") + ")";
                        return;
                    }
                } catch (e) {
                    console.warn("Lỗi parse dữ liệu thời tiết:", e);
                }
            }
            weatherEl.innerHTML = "⛅ Thời tiết Hà Nội hôm nay: <b>26°C</b> - Trời có mây, nắng nhẹ (Độ ẩm: 75%)";
        }
    };
    xhr.send();
}
