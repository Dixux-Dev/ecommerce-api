import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteAllWooCommerceProducts, addProductToWooCommerce, updateProductInWooCommerce, deleteProductFromWooCommerce, uploadAllProductsToWooCommerce, getAllWooCommerceProducts, uploadImageToWordPress } from '../services/wooCommerceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsFilePath = path.join(__dirname, '../data/products.json');

// Helper para leer productos desde el archivo JSON
const getProducts = () => {
    const data = fs.readFileSync(productsFilePath);
    return JSON.parse(data);
};

// Helper para escribir productos en el archivo JSON
const saveProducts = (products) => {
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
};

// Listar todos los productos
export const getAllProducts = (req, res) => {
    const products = getProducts();
    res.render('home', { products });
};

// Agregar un nuevo producto
export const createProduct = async (req, res) => {
    const newProduct = {
        sku: Date.now().toString(),
        name: req.body.name,
        price: req.body.price,
        stock: req.body.stock,
        image_name: req.file ? req.file.filename : null
    };

    try {
        let imageUrl = null;

        // Subir imagen a WordPress si hay imagen
        if (newProduct.image_name) {
            const imagePath = path.join(__dirname, '../public/product-images', newProduct.image_name);
            imageUrl = await uploadImageToWordPress(imagePath, newProduct.image_name);
        }

        // Sincronizar con WooCommerce
        const response = await addProductToWooCommerce({
            name: newProduct.name,
            regular_price: newProduct.price.toString(),
            stock_quantity: newProduct.stock,
            sku: newProduct.sku,
            images: imageUrl ? [{ src: imageUrl }] : []  // Agregar imagen a WooCommerce
        });

        const products = getProducts();
        products.push({
            ...newProduct,
            id: response.id
        });

        saveProducts(products);
    } catch (error) {
        console.error('Error al sincronizar producto con WooCommerce:', error.message);
    }

    res.redirect('/');
};


// Actualizar producto
export const updateProduct = async (req, res) => {
    let products = getProducts();
    const productIndex = products.findIndex(p => p.id == req.params.id);

    if (productIndex !== -1) {
        let imageUrl = products[productIndex].image_name;  // Mantener imagen existente

        // Subir nueva imagen si se ha proporcionado una
        if (req.file) {
            const imagePath = path.join(__dirname, '../public/product-images', req.file.filename);
            imageUrl = await uploadImageToWordPress(imagePath, req.file.filename);
        }

        products[productIndex] = {
            ...products[productIndex],
            name: req.body.name || products[productIndex].name,
            price: req.body.price || products[productIndex].price,
            stock: req.body.stock || products[productIndex].stock,
            image_name: req.file ? req.file.filename : products[productIndex].image_name,
            sku: req.body.sku || products[productIndex].sku,
            manage_stock: true
        };

        saveProducts(products);

        // Sincronizar con WooCommerce
        try {
            await updateProductInWooCommerce(products[productIndex].id, {
                name: products[productIndex].name,
                regular_price: products[productIndex].price.toString(),
                stock_quantity: products[productIndex].stock,
                manage_stock: true,
                images: imageUrl ? [{ src: imageUrl }] : []
            });
        } catch (error) {
            console.error('Error al actualizar producto en WooCommerce:', error.message);
        }

        res.redirect('/');
    } else {
        res.status(404).send('Producto no encontrado');
    }
};


// Eliminar producto
export const deleteProduct = async (req, res) => {
    let products = getProducts();
    const productIndex = products.findIndex(p => p.id == req.params.id);
    if (productIndex !== -1) {
        const imageName = products[productIndex].image_name;

        // Eliminar la imagen asociada si existe
        if (imageName) {
            const imagePath = path.join(__dirname, '../public/product-images', imageName);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error al eliminar la imagen:', err);
                } else {
                    console.log('Imagen eliminada:', imageName);
                }
            });
        }

        // Eliminar el producto del array
        const deletedProduct = products.splice(productIndex, 1)[0];

        saveProducts(products);

        // Sincronizar con WooCommerce
        try {
            await deleteProductFromWooCommerce(deletedProduct.id);
        } catch (error) {
            console.error('Error al eliminar producto de WooCommerce:', error.message);
        }

        res.redirect('/');
    } else {
        res.status(404).send('Producto no encontrado');
    }
};

export const getAllWooCommerceInventory = async (req, res) => {
    try {
        const data = await getAllWooCommerceProducts();
        res.json(data)
    } catch (error) {
        res.status(500).send('Error al eliminar inventario de WooCommerce.');
    }
};


// Eliminar todo el inventario de WooCommerce
export const clearWooCommerceInventory = async (req, res) => {
    try {
        await deleteAllWooCommerceProducts();
        res.redirect('/');
    } catch (error) {
        res.status(500).send('Error al eliminar inventario de WooCommerce.');
    }
};


// Función para agregar todos los productos a WooCommerce
export const addAllProductsToWooCommerce = async (req, res) => {
    try {
        let products = getProducts();
        const response = await uploadAllProductsToWooCommerce(products);

        // Agregar los id generados por WooCommerce        
        const wooCommerceIds = response.data.create.map(producto => {
            return {
                id: producto.id,
                sku: producto.sku
            };
        });

        const skuMap = new Map();

        // Llenamos el Map con los skus de wooCommerceIds como claves y los ids como valores
        wooCommerceIds.forEach(product => {
            skuMap.set(product.sku, product.id);
        });

        // Iteramos sobre products y asignamos el id correspondiente desde el Map
        products.forEach(product => {
            const id = skuMap.get(product.sku);
            
            if (id) {
                product.id = id;
            }
        });

        const productsWithId = products.map(product => {
            const id = skuMap.get(product.sku);
            
            return {
              ...product,
              ...(id && { id }) // Solo agrega el id si existe en el Map
            };
        });
        
        //Guardamos los productos con los id generados por woocommerce
        saveProducts(productsWithId);

        res.redirect('/');
    } catch (error) {
        console.error('Error al sincronizar productos con WooCommerce:', error.response?.data || error.message);
        res.status(500).send('Error al sincronizar productos con WooCommerce');
    }
};