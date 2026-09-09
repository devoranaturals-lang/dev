import { auth, db } from "./firebase-config.js";

import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";



// ================= LOGIN =================

const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");

if (loginBtn) {

    loginBtn.onclick = async function () {

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {

            await signInWithEmailAndPassword(auth, email, password);

            message.style.color = "green";
            message.innerText = "Login Successful";

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {

            console.log(error);

            message.style.color = "red";
            message.innerText = error.message;

        }

    };

}

// ================= ADD PRODUCT =================

const saveBtn = document.getElementById("saveBtn");
const updateBtn = document.getElementById("updateBtn");
if (updateBtn) {

    updateBtn.onclick = async function () {

        const name = document.getElementById("productName").value;
        const price = document.getElementById("productPrice").value;
        const category = document.getElementById("productCategory").value;
        const description = document.getElementById("productDescription").value;
        const image = document.getElementById("productImage").value.trim();
        

        try {

            await updateDoc(doc(db, "products", editProductId), {
    name: name,
    price: Number(price),
    category: category,
    description: description,
    image: image
});
    


            alert("Product Updated Successfully!");

            loadProducts();

            document.getElementById("productName").value = "";
            document.getElementById("productPrice").value = "";
            document.getElementById("productCategory").value = "";
            document.getElementById("productDescription").value = "";
            document.getElementById("productImage").value = "";

            saveBtn.style.display = "inline-block";
            updateBtn.style.display = "none";

            editProductId = null;

        } catch (error) {

            console.log(error);
            alert(error.message);

        }

    };

}
let editProductId = null;

if (saveBtn) {

    saveBtn.onclick = async function () {

        const name = document.getElementById("productName").value;
        const price = document.getElementById("productPrice").value;
        const category = document.getElementById("productCategory").value;
        const description = document.getElementById("productDescription").value;
        const image = document.getElementById("productImage").value.trim();
        

        try {

          

// Save product to Firestore
await addDoc(collection(db, "products"), {
    name: name,
    price: Number(price),
    category: category,
    description: description,
    image: image,
    createdAt: new Date()
});

alert("Product Added Successfully!");

// Reload the table
loadProducts();

// Clear the form
document.getElementById("productName").value = "";
document.getElementById("productPrice").value = "";
document.getElementById("productCategory").value = "";
document.getElementById("productDescription").value = "";
document.getElementById("productImage").value = "";

        } catch (error) {

            console.log(error);
            alert(error.message);

        }

    };

}// ================= LOAD PRODUCTS =================

const productTable = document.getElementById("productTable");
const searchBox = document.getElementById("searchBox");
const productCount = document.getElementById("productCount");

let allProducts = [];
async function loadProducts() {

    if (!productTable) return;

    productTable.innerHTML = "";
    allProducts = [];

    let totalProducts = 0;

    try {

        const querySnapshot = await getDocs(collection(db, "products"));

        querySnapshot.forEach((docSnap) => {

            totalProducts++;

            const product = docSnap.data();

            allProducts.push({
                id: docSnap.id,
                ...product
            });

            productTable.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>₹${product.price}</td>
                <td>${product.category}</td>
                <td>${product.description}</td>
                <td>
                    ${
                        product.image
                        ? `<img src="${product.image}" width="80" height="80" alt="${product.name}">`
                        : "No Image"
                    }
                </td>
                <td>
                    <button onclick="editProduct('${docSnap.id}')">Edit</button>
                </td>
                <td>
                    <button onclick="deleteProduct('${docSnap.id}')">Delete</button>
                </td>
            </tr>
            `;

        });

        if (productCount) {
            productCount.textContent = totalProducts;
        }

    } catch (error) {
        console.log(error);
    }

}

loadProducts();

window.deleteProduct = async function(id) {

    if (!confirm("Delete this product?")) return;

    await deleteDoc(doc(db, "products", id));

    alert("Product Deleted!");

    loadProducts();

};

// ================= EDIT PRODUCT =================

window.editProduct = async function(id) {

    const querySnapshot = await getDocs(collection(db, "products"));

    querySnapshot.forEach((productDoc) => {

        if (productDoc.id === id) {

            const product = productDoc.data();

            document.getElementById("productName").value = product.name;
            document.getElementById("productPrice").value = product.price;
            document.getElementById("productCategory").value = product.category;
            document.getElementById("productDescription").value = product.description;
            document.getElementById("productImage").value = product.image;

            editProductId = id;

            saveBtn.style.display = "none";
            updateBtn.style.display = "inline-block";
        }
    });
};
// ================= SEARCH =================

if (searchBox) {

    searchBox.addEventListener("keyup", function () {

        const search = this.value.toLowerCase();

        const rows = productTable.getElementsByTagName("tr");

        for (let row of rows) {

            const productName = row.cells[0].innerText.toLowerCase();

            if (productName.includes(search)) {

                row.style.display = "";

            } else {

                row.style.display = "none";

            }

        }

    });

}