import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api/index.mjs";
import { wooCommerceApi } from '../config/config.js';

import axios from 'axios';
import FormData from 'form-data';
import { Agent } from 'https';
import fs from 'fs';

const httpsAgent = new Agent({ rejectUnauthorized: false })

const api = new WooCommerceRestApi({
    url: wooCommerceApi.url,
    consumerKey: wooCommerceApi.consumerKey,
    consumerSecret: wooCommerceApi.consumerSecret,
    version: wooCommerceApi.version,
    queryStringAuth: true,
    axiosConfig: { 
        httpsAgent,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        } 
    }
});

// Obtener todos los productos de WooCommerce
export const getAllWooCommerceProducts = async () => {
    try {
        let products = [];
        let page = 1;
        let totalPages;

        do {
            const response = await api.get('products', {
                per_page: 100,
                page
            });
            products = products.concat(response.data);
            totalPages = response.headers['x-wp-totalpages'];
            page++;
        } while (page <= totalPages);

        return products;
    } catch (error) {
        console.error('Error al obtener productos de WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};


// Eliminar todos los productos de WooCommerce
export const deleteAllWooCommerceProducts = async () => {
    try {
        const products = await getAllWooCommerceProducts();
        console.log(products)
        // Extrae los IDs de los productos
        const productIds = products.map(product => product.id);

        if (productIds.length === 0) {
            console.log('No hay productos para eliminar en WooCommerce.');
            return;
        }
        // Elimina los productos en un solo paso
        const response = await api.post('products/batch', {
            delete: productIds
        });
        console.log('Productos eliminados de WooCommerce');
    } catch (error) {
        console.error('Error al eliminar productos de WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};

export const uploadAllProductsToWooCommerce = async (products) => {
    try {
        const wooCommerceProducts = await Promise.all(products.map(async product => {
            return {
                name: product.name,
                regular_price: product.price.toString(),
                stock_quantity: product.stock,
                manage_stock: product.manage_stock,
                sku: product.sku,
            };
        }));

        // Crear productos en WooCommerce
        const response = await api.post('products/batch', {
            create: wooCommerceProducts
        });

        return response;
    } catch (error) {
        console.error('Error al agregar productos de WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};

// Agregar un producto a WooCommerce
export const addProductToWooCommerce = async (product) => {
    try {
        const response = await api.post('products', product);
        return response.data;
    } catch (error) {
        console.error('Error al agregar producto a WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};


// Actualizar un producto en WooCommerce
export const updateProductInWooCommerce = async (id, product) => {
    try {
        const response = await api.put(`products/${id}`, product);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar producto en WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};

// Eliminar un producto de WooCommerce
export const deleteProductFromWooCommerce = async (id) => {
    try {
        await api.delete(`products/${id}`, { force: true });
        console.log(`Producto ${id} eliminado de WooCommerce.`);
    } catch (error) {
        console.error(`Error al eliminar producto ${id} de WooCommerce:`, error.response?.data || error.message);
        throw error;
    }
};


// Subir imagen a WordPress
export const uploadImageToWordPress = async (imagePath, imageName) => {
    try {
        console.log(`imagePath: ${imagePath}`);
        console.log(`imageName: ${imageName}`);
        const data = new FormData();
        data.append('file', fs.createReadStream(imagePath), imageName);

        const response = await axios.post(`${wooCommerceApi.url}/wp-json/wp/v2/media`, data, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                'Authorization': `Basic ${Buffer.from(`${wooCommerceApi.consumerKey}:${wooCommerceApi.consumerSecret}`).toString('base64')}`
            }
        });

        return response.data.source_url;  // URL de la imagen subida
    } catch (error) {
        console.error('Error al subir imagen a WordPress:', error.message);
        throw error;
    }
};