// import { getTokenByStoreId } from '../../Auth/sellers.js';
const main = require('../models/productos.js');
const getML_ID = require('../models/getProductos.js');

const tiendas = {
    420711769: 'APP_USR-889807737673414-100413-631cfa0ff453c5238fca6d3c25d7d1e5-420711769', // RMB
    781409517: 'APP_USR-6701816583415401-100413-bd13b4d0bda9ffc1e71df50a5712f3fa-781409517', // MTP
    1087951399: 'APP_USR-5390595089408138-100413-9533c808876e62b30e30b46a8dd93a66-1087951399' // ZTK
};

function clearCache() {
    // Lógica para limpiar la caché
    console.log('Caché eliminada.');
}

async function initProductos() {
    for (const [storeId, token] of Object.entries(tiendas)) {
        console.table({ storeId, token }); // Mostrar storeId y token en la tabla

        try {
            await main(storeId, token); // Llama a main para cada tienda
            console.log(`Datos obtenidos para la tienda ${storeId}.`);
            if (storeId) {
                const updateProductos = await getML_ID(storeId, token);
                console.log(updateProductos);
            }
        } catch (error) {
            console.error(`Error al ejecutar main para la tienda ${storeId}:`, error);
        }
    }

    // Al finalizar todas las peticiones, limpiar la caché
    clearCache();

    // Esperar 4 horas antes de reintentar
    console.log('Esperando 4 horas antes de reintentar...');
    await new Promise(resolve => setTimeout(resolve, 4 * 60 * 60 * 1000)); // 4 horas en milisegundos

    // Reintentar (puedes modificar esto según tus necesidades)
    await initProductos(); // Llama nuevamente a initProductos para reintentar
}



module.exports = {initProductos};