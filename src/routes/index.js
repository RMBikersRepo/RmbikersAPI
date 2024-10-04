// HELPER AUTOMATIC ROUTES - HAR
const express = require('express');
const router = express.Router();
const fs = require('fs');
const PATH_ROUTH = __dirname;

const cleanFileName = (fileName) =>{
    const clean = fileName.split('.').shift();
    return clean;
}

fs.readdirSync(PATH_ROUTH).filter(fileName =>{
    const prefixRoute = cleanFileName(fileName);
    if (prefixRoute !== "index") {
        console.log("Ruta: ", prefixRoute);
        router.use(`/${prefixRoute}`, require(`./${prefixRoute}.js`));
    }
});

module.exports = {router}; 

// import { skuController } from '../control/Busquedas/busquedaSKU.js'; // Ajusta esta ruta

// const router = express.Router();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Ruta principal que envía el archivo HTML
// router.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../vista/index.html')); // Asegúrate de que la ruta sea correcta
// });