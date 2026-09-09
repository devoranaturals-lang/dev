let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ================= ADD TO CART =================

window.addToCart = function(product){

    const existing = cart.find(item => item.name === product.name);

if (existing) {
    existing.quantity += 1;
} else {
    product.quantity = 1;
    cart.push(product);
}

localStorage.setItem("cart", JSON.stringify(cart));

    localStorage.setItem("cart", JSON.stringify(cart));

    alert(product.name + " added to cart!");
};

// ================= DISPLAY CART =================

const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");

if (cartItems) {

    let total = 0;

    cartItems.innerHTML = "";

    cart.forEach((product, index) => {

        total += Number(product.price) * product.quantity;

        cartItems.innerHTML += `
            <div class="cart-item">

                <img src="${product.image}" width="80">

                <div>
                    <h3>${product.name}</h3>
                    <p>₹${product.price}</p>

<p>
    Quantity:
    <button onclick="decreaseQuantity(${index})">−</button>

    <strong>${product.quantity}</strong>

    <button onclick="increaseQuantity(${index})">+</button>
</p>
                </div>

                <button onclick="removeItem(${index})">
                    Remove
                </button>

            </div>
        `;
    });

    cartTotal.innerHTML = "Total: ₹" + total;
}

// ================= REMOVE ITEM =================

window.removeItem = function(index){

    cart.splice(index, 1);

    localStorage.setItem("cart", JSON.stringify(cart));

    location.reload();
};
window.increaseQuantity = function(index){

    cart[index].quantity++;

    localStorage.setItem("cart", JSON.stringify(cart));

    location.reload();
};

window.decreaseQuantity = function(index){

    if(cart[index].quantity > 1){

        cart[index].quantity--;

    }else{

        cart.splice(index,1);

    }

    localStorage.setItem("cart", JSON.stringify(cart));

    location.reload();
};