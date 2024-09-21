import { Router } from 'express';
import { getAllProducts, createProduct, updateProduct, deleteProduct, clearWooCommerceInventory, addAllProductsToWooCommerce, getAllWooCommerceInventory } from '../controllers/productController.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

// Listar productos
router.get('/', getAllProducts);

// Crear nuevo producto (subida de imagen)
router.post('/new', upload.single('image'), createProduct);

// Actualizar producto (subida de imagen)
router.post('/edit/:id', upload.single('image'), updateProduct);

// Eliminar producto
router.post('/delete/:id', deleteProduct);

// Eliminar todo el inventario de WooCommerce
router.post('/woocommerce/delete-all', clearWooCommerceInventory);

// Sincronizar todos los productos con WooCommerce
router.post('/woocommerce/add-all', addAllProductsToWooCommerce);


router.get('/woocommerce/get-all', getAllWooCommerceInventory);


export default router;
