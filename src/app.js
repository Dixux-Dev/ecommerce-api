import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import productRoutes from './routes/productRoutes.js';
import { PORT }  from './config/config.js';
import fs from 'fs'

const app = express();

// Configuración de la ruta base
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../server.key')),
  cert: fs.readFileSync(path.join(__dirname, '../server.cert'))
};

// Configuración de Handlebars
app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Archivos Estaticos
app.use('/', express.static(__dirname + '/public'))

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas
app.use('/', productRoutes);

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});