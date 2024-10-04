const axios = require('axios');
const getEndPointData = require('../service/ML/mercadoLibreEndPointProduct.js');
const getQueryDB = require('../service/query/query.js');

// Configura tus variables


// Función para obtener datos de un endpoin0t

async function getSaleFee(price, categoryId, listingTypeId) {
    const saleFeeUrl = ` https://api.mercadolibre.com/sites/MLM/listing_prices?price=${price}&category_id=${categoryId}&listing_type_id=${listingTypeId}&attributes=sale_fee_amount,sale_fee_details`;

    try {
        const response = await axios.get(saleFeeUrl);
        const { sale_fee_details } = response.data;
        return {
            percentageFee: sale_fee_details.percentage_fee,
            grossAmount: sale_fee_details.gross_amount
        };
    } catch (error) {
        console.error('Error al obtener la tarifa de venta:');
        return null;
    }
}
// Función para obtener la tarifa de venta

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Función para obtener el costo de envío por tipo de envío
// Función para obtener el costo de envío por tipo de envío
async function getShippingCosts(itemId, zipCode, categoryId, price, storeId, token) {
    const shippingUrl = `https://api.mercadolibre.com/users/${storeId}/shipping_options/free?item_id=${itemId}&verbose=true&item_price=${price}&category_id=${categoryId}`;

    let attempt = 0; // Contador de intentos

    while (true) {
        try {
            const response = await getEndPointData(shippingUrl, storeId, token);
            // Accede a list_cost
            const listCost = response.coverage?.all_country?.list_cost;
            if (listCost != null) {
                return { listCost }; // Retorna el costo de envío
            } else {
                console.warn('Estructura inesperada de la respuesta o datos faltantes:', response);
            }
        } catch (error) {
            // Manejo de error 429
            if (error.response && error.response.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 30; // Usa 'retry-after' si está disponible
                console.warn(`Límite de tasa alcanzado. Esperando ${retryAfter} segundos antes de reintentar...`);
                await delay(retryAfter * 1000); // Esperar el tiempo especificado o 30 segundos por defecto
            } else {
                console.error('Error al obtener los costos de envío:', error);
                await delay(Math.min(30000 * (attempt + 1), 300000)); // Retardo exponencial
                attempt++;
            }
        }
    }
}


function determinarTipoSKU(sku) {
    // Verifica si el SKU contiene ".100_" o ".200_"
    if (sku.includes('.100_') || sku.includes('.200_') || sku.includes('_')) {
        return 'Indirecto';
    }
    return 'Directo';
}

// Función principal para obtener todos los datos del producto
async function getDataProducto(id, zipCode, storeId, token) {
    const attributeId = 'SELLER_SKU';
    let shippingCostsDisplay = '';
    let shippingCosts = '';
    const url = `https://api.mercadolibre.com/items/${id}?include_attributes=all`;

    try {
        const itemDetails = await getEndPointData(url, storeId, token);
        
        if (!itemDetails || typeof itemDetails !== 'object') {
            throw new Error('La respuesta de la API para el artículo no es válida.');
        }

        // Obtener datos del costo de venta
        const saleFeeData = await getSaleFee(itemDetails.price, itemDetails.category_id, itemDetails.listing_type_id);
        shippingCosts = await getShippingCosts(id, zipCode, itemDetails.category_id, itemDetails.price, storeId,token);

        shippingCostsDisplay = itemDetails.price < 298 ? 0 : shippingCosts.listCost || '0';
        let sellerSKU;

        // Verificar si hay variaciones
        if (itemDetails.variations && itemDetails.variations.length > 0) {
            const firstVariation = itemDetails.variations[0];

            // Buscar el atributo con id "SELLER_SKU"
            const sellerSKUAttribute = firstVariation.attributes.find(attribute => attribute.id === "SELLER_SKU");

            // Si se encuentra el atributo, acceder a su valor
            if (sellerSKUAttribute) {
                sellerSKU = sellerSKUAttribute.value_name;

            } else {

            }
        } else {

        }

        // Si no se encontró en las variaciones, buscar en los atributos generales
        if (!sellerSKU && itemDetails.attributes && itemDetails.attributes.length > 0) {
            const sellerSkuAttribute = itemDetails.attributes.find(attribute => attribute.id === "SELLER_SKU");
            if (sellerSkuAttribute) {
                sellerSKU = sellerSkuAttribute.value_name;

            } else {

            }
        }
        const tipoSKU = determinarTipoSKU(sellerSKU);
        // Retornar los datos
        return {
            SKU: sellerSKU || 'N/A',
            id: itemDetails.id,
            CategoriaID: itemDetails.category_id,
            Titulo: itemDetails.title || 'N/A',
            Precio: itemDetails.price || '0',
            Comision: saleFeeData?.grossAmount || '0',
            Envio: shippingCostsDisplay || '0',
            Stock: itemDetails.available_quantity || '0',
            Ventas: itemDetails.sold_quantity || '0',
            Estatus: itemDetails.status || 'N/A',
            Calidad: itemDetails.health ? parseFloat(itemDetails.health) : null,
            vendedor: itemDetails.seller_id,
            TipoSKU: tipoSKU
        };

    } catch (error) {
        console.error("Error obteniendo detalles del artículo:", error.message || error);
        return { id, error: "Error en la solicitud de atributos" };
    }
}


async function getML_ID(storeId, token) {
    const sql = `SELECT MLM FROM mlidentificador WHERE seller_id = '${storeId}'`;
    try {
        const result = await getQueryDB(sql);
        const ids = result.map(item => item.MLM);
        console.log(`IDs obtenidos: ${ids.length}`);

        const zipCode = '55749';

        // Dividir IDs en bloques de 1000
        const blockSize = 1000;
        const idBlocks = [];
        for (let i = 0; i < ids.length; i += blockSize) {
            idBlocks.push(ids.slice(i, i + blockSize));
        }

        // Procesar cada bloque de IDs
        const allProducts = [];
        for (const block of idBlocks) {
            console.log(`Procesando bloque de ${block.length} IDs`);
            const productDataPromises = block.map(id => getDataProducto(id, zipCode, storeId, token));
            const products = await Promise.all(productDataPromises);
            allProducts.push(...products);

            // Inserta en SQL cada vez que hay 1000 registros
            if (allProducts.length >= 1000) {
                await exportToSQL(allProducts.slice(0, 1000)); // Inserta los primeros 1000
                allProducts.splice(0, 1000); // Elimina los primeros 1000 insertados
            }
        }

        // Inserta cualquier registro restante que no haya alcanzado los 1000
        if (allProducts.length > 0) {
            await exportToSQL(allProducts);
        }

    } catch (error) {
        console.error(`Error: ${error.message || error}`);
        throw error; // Propaga el error para que pueda ser manejado por la función que llama a getML_ID
    }
}



// Función para exportar datos a un archivo Excel
// function exportToExcel(items) {
//     try {
//         const worksheet = XLSX.utils.json_to_sheet(items);
//         const workbook = XLSX.utils.book_new();
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');
//         XLSX.writeFile(workbook, 'ZTK.xlsx');
//         console.log('Datos exportados a ZTK.xlsx');
//     } catch (error) {
//         console.error('Error al exportar a Excel:');
//     }
// }


async function exportToSQL(items) {
    if (items.length === 0) return; // Si no hay elementos, no hacer nada
    try {
        const values = [];
        const placeholders = items.map(item => {
            values.push(
                item.id, 
                item.SKU, 
                item.CategoriaID, 
                item.Titulo, 
                item.Precio, 
                item.Comision, 
                item.Envio, 
                item.Stock, 
                item.Ventas, 
                item.Calidad, 
                item.Estatus, 
                item.vendedor,
                item.TipoSKU,
                new Date()
            );
            return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'; // 13 placeholders
        });

        const joinedValues = placeholders.join(',');

        const query = `
            INSERT INTO productos_ml (MLM, SKU, CategoriaID, Titulo, Precio, Comision, Envio, Stock, Ventas, Calidad, Estatus, vendedor, TipoSKU, fecha_actualizacion) 
            VALUES ${joinedValues}
            ON DUPLICATE KEY UPDATE 
                SKU = VALUES(SKU), 
                CategoriaID = VALUES(CategoriaID),
                Titulo = VALUES(Titulo),
                Precio = VALUES(Precio), 
                Comision = VALUES(Comision), 
                Envio = VALUES(Envio), 
                Stock = VALUES(Stock), 
                Ventas = VALUES(Ventas), 
                Calidad = VALUES(Calidad), 
                Estatus = VALUES(Estatus), 
                vendedor = VALUES(vendedor),
                TipoSKU = VALUES(TipoSKU),
                fecha_actualizacion = CURRENT_TIMESTAMP; -- Actualiza la fecha en caso de duplicado
        `;
        await getQueryDB(query, values);
        console.log('Datos insertados/actualizados correctamente');
    } catch (error) {
        console.error('Error al exportar a SQL:', error);
    }
}



// Ejecuta la función principal
module.exports = getML_ID;