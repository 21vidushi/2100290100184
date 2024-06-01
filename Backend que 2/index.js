const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require("dotenv").config();
const app = express();
const port = process.env.PORT;
const ACCESS_TOKEN= process.env.Access_token;
// Configuration
const ECOMMERCE_COMPANIES = ["ANZ", "FLP", "SP", "HVN", "AZO"];
const BASE_URL = "http://20.244.56.144/test/companies";
const MAX_PRODUCTS_PER_PAGE = 10;

// Helper function to fetch products from all companies
const fetchProducts = async (category, minPrice, maxPrice) => {
    const requests = ECOMMERCE_COMPANIES.map(company => 
        axios.get(`${BASE_URL}/${company}/categories/${category}/products/top-${MAX_PRODUCTS_PER_PAGE}&minPrice-${minPrice}&maxPrice-${maxPrice}`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        })
    );

    try {
        const responses = await Promise.all(requests);
        return responses.flatMap(response => response.data.map(product => ({
            ...product,
            id: uuidv4(),
            company: response.config.url.split('/')[4]
        })));
    } catch (error) {
        console.error("Error fetching products:", error);
        throw new Error("Failed to fetch products from the test server");
    }
};

// Helper function to sort products
const sortProducts = (products, sortBy, order) => {
    const sortOrder = order === 'desc' ? -1 : 1;
    return products.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1 * sortOrder;
        if (a[sortBy] > b[sortBy]) return 1 * sortOrder;
        return 0;
    });
};

// GET /categories/:categoryname/products
app.get('/categories/:categoryname/products', async (req, res) => {
    const { categoryname } = req.params;
    const { r, page = 1, sortBy, order = 'asc', minPrice = 0, maxPrice = 1000000 } = req.query;

    if (!categoryname || !r) {
        return res.status(400).json({ detail: "Category name and number of products (r) are required" });
    }

    try {
        const allProducts = await fetchProducts(categoryname, minPrice, maxPrice);
        const sortedProducts = sortBy ? sortProducts(allProducts, sortBy, order) : allProducts;
        const totalProducts = sortedProducts.length;
        const paginatedProducts = sortedProducts.slice((page - 1) * MAX_PRODUCTS_PER_PAGE, page * MAX_PRODUCTS_PER_PAGE);

        res.json({
            products: paginatedProducts,
            total: totalProducts,
            page,
            pages: Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE)
        });
    } catch (error) {
        res.status(503).json({ detail: error.message });
    }
});

// GET /categories/:categoryname/products/:productid
app.get('/categories/:categoryname/products/:productid', async (req, res) => {
    const { categoryname, productid } = req.params;

    try {
        const allProducts = await fetchProducts(categoryname, 0, 1000000); // Fetch all products within a wide price range
        const product = allProducts.find(product => product.id === productid);
        if (!product) {
            return res.status(404).json({ detail: "Product not found" });
        }
        res.json(product);
    } catch (error) {
        res.status(503).json({ detail: error.message });
    }
});

app.listen(port, () => {
    console.log(`Top Products Microservice running at http://localhost:${port}`);
});
