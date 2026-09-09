const orderItems = document.getElementById("orderItems");
const orderTotal = document.getElementById("orderTotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

let total = 0;

function loadOrder() {

    orderItems.innerHTML = "";

    total = 0;

    if (cart.length === 0) {

        orderItems.innerHTML = "<p>Your cart is empty.</p>";
        orderTotal.innerHTML = "Total: ₹0";
        placeOrderBtn.disabled = true;

        return;
    }

    cart.forEach(product => {

        const quantity = product.quantity || 1;

        total += Number(product.price) * quantity;

        orderItems.innerHTML += `
            <div class="order-item">
                <span>${product.name} × ${quantity}</span>
                <span>₹${Number(product.price) * quantity}</span>
            </div>
        `;
    });

    orderTotal.innerHTML = "Total: ₹" + total;
}

loadOrder();

placeOrderBtn.addEventListener("click", () => {

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const address = document.getElementById("address").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const pincode = document.getElementById("pincode").value.trim();

    if (!name || !phone || !address) {
        alert("Please fill in Name, Phone and Address.");
        return;
    }

    alert("Order Placed Successfully!");

    localStorage.removeItem("cart");

    window.location.href = "index.html";
});