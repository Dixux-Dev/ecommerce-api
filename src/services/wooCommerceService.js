import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api/index.mjs";
import { wooCommerceApi, WordPressApi } from '../config/config.js';
import axios from 'axios';
import FormData from 'form-data';
import { Agent } from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// revisar si esto es necesario
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
        let totalPages = 1;

        do {
            const response = await api.get('products', {
                params: { per_page: 100, page } 
            });

            products = [...products, ...response.data]; 
            totalPages = parseInt(response.headers['x-wp-totalpages'], 10) || 1;
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
        const productIds = products.map(product => product.id);

        if (productIds.length === 0) {
            console.log('No hay productos para eliminar en WooCommerce.');
            return;
        }

        // Eliminar imágenes de cada producto
        await Promise.all(products.map(async (product) => {
            if (product.images && product.images.length > 0) {
                await Promise.all(product.images.map(async (image) => {
                    await deleteImageFromWordPress(image.id); // Asumiendo que image.id es el ID de la imagen en WordPress
                }));
            }
        }));

        // Elimina los productos de WooCommerce
        await api.post('products/batch', {
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
            let imageUrl = null;

            // Si el producto tiene una imagen asociada, la subimos a WordPress
            if (product.image_name) {
                const imagePath = path.join(__dirname, '../public/product-images', product.image_name);
                imageUrl = await uploadImageToWordPress(imagePath);
            }

            return {
                name: product.name,
                regular_price: product.price.toString(),
                stock_quantity: product.stock_quantity,
                manage_stock: true,
                sku: product.sku,
                images: imageUrl ? [{ src: imageUrl }] : [] // Añadir imagen si existe
            };
        }));

        // Crear productos en WooCommerce
        const response = await api.post('products/batch', {
            create: wooCommerceProducts
        });

        return response;
    } catch (error) {
        console.error('Error al agregar productos a WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};

// Agregar un producto a WooCommerce
export const addProductToWooCommerce = async (product, imagePath = null) => {
    try {
        let imageUrl = null;

        if (imagePath) {
            // Subir la imagen y obtener su URL
            imageUrl = await uploadImageToWordPress(imagePath);
        }

        const response = await api.post('products', {
            ...product,
            images: imageUrl ? [{ src: imageUrl }] : [] // Si hay una imagen, la añadimos
        });

        return response.data;
    } catch (error) {
        console.error('Error al agregar producto a WooCommerce:', error.response?.data || error.message);
        throw error;
    }
};

// Actualizar un producto en WooCommerce
export const updateProductInWooCommerce = async (productId, updatedProductData) => {
    try {
        let imageUrl = null;

        // Verificar si hay una imagen para subir
        if (updatedProductData.image_name) {
            const imagePath = path.join(__dirname, '../public/product-images', updatedProductData.image_name);
            imageUrl = await uploadImageToWordPress(imagePath); // Subir la imagen a WordPress
        }

        // Preparar los datos actualizados, incluyendo la imagen si existe
        const updatedData = {
            ...updatedProductData,
            images: imageUrl ? [{ src: imageUrl }] : []  // Agregar la imagen si fue subida
        };

        // Usar WooCommerceRestApi para actualizar el producto
        const response = await api.put(`products/${productId}`, updatedData);

        return response.data;
    } catch (error) {
        console.error('Error actualizando el producto en WooCommerce:', error.response?.data || error.message);
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
const uploadImageToWordPress = async (imagePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(imagePath)); // Lee la imagen desde el sistema de archivos

        const response = await axios.post(`${wooCommerceApi.url}/wp-json/wp/v2/media`, form, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${WordPressApi.user}:${WordPressApi.password}`).toString('base64')}`,
                ...form.getHeaders(),
            },
            httpsAgent,
        });
        
        // Retorna el enlace de la imagen
        return response.data.source_url;
    } catch (error) {
        console.error('Error al subir imagen a WordPress:', error.response?.data || error.message);
        throw error;
    }
};

export const deleteImageFromWordPress = async (imageId) => {
    try {
        const response = await axios.delete(`${wooCommerceApi.url}/wp-json/wp/v2/media/${imageId}`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${WordPressApi.user}:${WordPressApi.password}`).toString('base64')}`,
            },
            params: { force: true },
            httpsAgent,
        });

        console.log(`Imagen ${imageId} eliminada de WordPress.`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar imagen de WordPress:', error.response?.data || error.message);
        throw error;
    }
};