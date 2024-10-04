import { getTokenByStoreId } from '../../Auth/sellers.js';
import main from './productos.js';
import getML_ID from './getProductos.js';

const tiendas = {
    420711769: 'APP_USR-889807737673414-100310-3c1ea95a9d7af8580c40f3df23d47e52-420711769', // RMB
    781409517: 'APP_USR-6701816583415401-100310-41c26485affa35406c085e65218f2212-781409517', // MTP
    1087951399: 'APP_USR-5390595089408138-100310-cd53d44be05c50230a5ec9039ac75956-1087951399' // ZTK
};

function clearCache() {
    // Lógica para limpiar la caché
    console.log('Caché eliminada.');
}

export default async function initProductos() {
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

// Llamar a la función sin argumentos
initProductos();
