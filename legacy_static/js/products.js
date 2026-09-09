import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const productContainer = document.getElementById("productContainer");
const searchBox = document.getElementById("searchBox");
const categoryFilter = document.getElementById("categoryFilter");

console.log(searchBox);
console.log(categoryFilter);

searchBox.oninput = () => console.log("Typing...");

let allProducts = [];

async function loadProducts() {

    try {

        const querySnapshot = await getDocs(collection(db, "products"));

        allProducts = [];

        querySnapshot.forEach((doc) => {

            allProducts.push(doc.data());

        });

        displayProducts(allProducts);

    } catch (error) {

        console.log(error);

    }

}

function displayProducts(products) {

    productContainer.innerHTML = "";

    products.forEach(product => {

        productContainer.innerHTML += `
        <div class="product-card">

            <img
                src="${product.image}"
                alt="${product.name}"
                class="product-image"
            >

            <h3>${product.name}</h3>

            <h4>₹${product.price}</h4>

            <p><strong>Category:</strong> ${product.category}</p>

            <p>${product.description}</p>

            <button
                class="buy-btn"
                data-index="${allProducts.indexOf(product)}">
                Buy Now
            </button>

        </div>
        `;

    });

    
    document.querySelectorAll(".buy-btn").forEach(button => {

        button.addEventListener("click", function () {

    const index = this.dataset.index;

    console.log("Button clicked");
    console.log(allProducts[index]);

    addToCart(allProducts[index]);

});

    });

}

function filterProducts() {

    const search = searchBox.value.toLowerCase();
    const category = categoryFilter.value.toLowerCase();

    const filtered = allProducts.filter(product => {

        const matchName =
            product.name.toLowerCase().includes(search);

        const matchCategory =
            category === "" ||
            product.category.toLowerCase() === category;

        return matchName && matchCategory;

    });

    displayProducts(filtered);

}

searchBox.addEventListener("input", filterProducts);
categoryFilter.addEventListener("change", filterProducts);

loadProducts();


function updateCartCount() {

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    let count = 0;

    cart.forEach(item => {
        count += item.quantity || 1;
    });

    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.innerText = count;
    }

}

updateCartCount();
function addToCart(product) {

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find(item => item.name === product.name);

    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        product.quantity = 1;
        cart.push(product);
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    updateCartCount();

    

window.location.href = "cart.html";
}