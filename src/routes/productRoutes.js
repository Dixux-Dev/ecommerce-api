import { Router } from 'express';
import { getAllProducts, createProduct, updateProduct, deleteProduct, clearWooCommerceInventory, addAllProductsToWooCommerce, getAllWooCommerceInventory } from '../controllers/productController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configuración de multer (debes asegurarte de que se utiliza en las rutas correctas)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../public/product-images'));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  }
});

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
