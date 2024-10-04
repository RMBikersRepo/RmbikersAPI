import axios from 'axios';
import getQueryDB from '../../../../../servicios/sqlServ/query.js';
import { getTokenByStoreId } from '../../Auth/sellers.js';
import * as XLSX from 'xlsx';

// Obtener datos de productos con stock de proveedor >= 50
async function getStockProveedor() {
    const query = `
        SELECT p.MLM, p.SKU, pr.SKU AS SKU_PROVEEDOR, p.ventas, p.Stock, pr.stock_Porcentaje, p.tipoSKU, p.Estatus AS Tipo_SKU, p.vendedor
        FROM productos_ml p
        INNER JOIN proveedor pr
        ON p.SKU = pr.SKU
        WHERE pr.stock_Porcentaje >= 50
        ORDER BY p.SKU
    `;
    const result = await getQueryDB(query);
    console.table(result);
    await dataStocks(result);
}

// Obtener el total de stock desde la base de datos


// Procesar los datos de stock y realizar la distribución basada en ventas
async function dataStocks(items) {
    const groupedBySKU = items.reduce((acc, item) => {
        if (item.SKU) {
            if (acc[item.SKU]) {
                acc[item.SKU].push(item);
            } else {
                acc[item.SKU] = [item];
            }
        }
        return acc;
    }, {});

    const allProductDistributions = [];
    const errores = []; // Array para almacenar productos con errores
   
    for (const [sku, products] of Object.entries(groupedBySKU)) {
        
        const totalStock = products.reduce((sum, item) => sum + item.Stock, 0);
        const totalSales = products.reduce((sum, item) => sum + item.ventas, 0);
        const stockPorcentaje = products[0].stock_Porcentaje;
       
        
        let stockDistribuido = stockPorcentaje;
        let remainingStock = stockDistribuido;

        if (totalSales === 0) {
            const stockEquitativo = Math.floor(stockDistribuido / products.length);
            products.forEach(product => {
                product.Stock_Distribuido = Math.max(5, stockEquitativo);
            });
            remainingStock -= stockEquitativo * products.length;
        } else {
            const factorEquitativo = 0.5;
            products.forEach(product => {
                const proporciónVentas = product.ventas / totalSales;
                const stockEquitativo = (1 - factorEquitativo) * (stockDistribuido / products.length);
                const stockVenta = factorEquitativo * (stockDistribuido * proporciónVentas);
                const stockAssigned = Math.max(5, Math.round(stockEquitativo + stockVenta));

                product.Stock_Distribuido = stockAssigned;
                remainingStock -= stockAssigned;
            });
        }

        while (remainingStock > 0) {
            for (let i = 0; i < products.length && remainingStock > 0; i++) {
                products[i].Stock_Distribuido += 1;
                remainingStock -= 1;
            }
        }

        allProductDistributions.push(...products);
        
        await actualizarProductos(products, errores); // Pasar array de errores
    }

    // Generar el archivo Excel con las distribuciones
    generateExcel(allProductDistributions);

    // Si hay errores, generar un archivo de errores
    if (errores.length > 0) {
        generateErrorReport(errores);
    }
}

function generateExcel(data) {
    const wb = XLSX.utils.book_new();
    const fechaActual = new Date().toLocaleString();

    const groupedData = data.reduce((acc, item) => {
        const sku = item.SKU;
        if (!acc[sku]) {
            acc[sku] = [];
        }
        acc[sku].push({
            MLM: item.MLM,
            SKU: item.SKU,
            SKU_PROVEEDOR: item.SKU_PROVEEDOR,
            ventas: item.ventas,
            Stock: item.Stock,
            stock_Porcentaje: item.stock_Porcentaje,
            tipoSKU: item.tipoSKU,
            Tipo_SKU: item.Tipo_SKU,
            vendedor: item.vendedor,
            Stock_Distribuido: item.Stock_Distribuido,
            Fecha_Actualizacion: fechaActual
        });
        return acc;
    }, {});

    const allRows = [];
    
    for (const [sku, rows] of Object.entries(groupedData)) {
        allRows.push({ SKU: sku, MLM: '', SKU_PROVEEDOR: '', ventas: '', Stock: '', stock_Porcentaje: '', tipoSKU: '', Tipo_SKU: '', vendedor: '', Stock_Distribuido: '', Fecha_Actualizacion: '' });
        allRows.push(...rows);
        allRows.push({});
    }

    const ws = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    XLSX.writeFile(wb, "reporte_distribuciones.xlsx");
}

async function actualizarProductos(productos) {
    for (const producto of productos) {
        const token = getTokenByStoreId(producto.vendedor);
        let data;

        if (producto.variaciones && producto.variaciones.length > 0) {
            // Si el producto tiene variaciones, construimos el objeto data para variaciones
            data = {
                variations: producto.variaciones.map(variacion => ({
                    id: variacion.id, // ID de la variación
                    available_quantity: variacion.Stock_Distribuido // Nuevo stock
                }))
            };
        } else {
            // Si no tiene variaciones, usamos la propiedad disponible
            data = {
                available_quantity: producto.Stock_Distribuido // Asegúrate de que este valor sea correcto
            };
        }

        if (!token) {
            console.warn(`No se encontró el token para el vendedor ID: ${producto.vendedor}`);
            continue; // Si no hay token, pasa al siguiente producto
        }

        try {
            const apiUrl = `https://api.mercadolibre.com/items/${producto.MLM}`;
            const response = await axios.put(apiUrl, data, {
                headers: {
                    'x-version': '1',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            console.log(`Actualizado ${producto.MLM} con stock:`, response.data);
        } catch (error) {
            if (error.response) {
                console.error(`Error al actualizar ${producto.MLM}:`, error.response.data);
            } else {
                console.error(`Error desconocido:`, error);
            }
        }
    }
}


function generateErrorReport(errores) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errores);
    XLSX.utils.book_append_sheet(wb, ws, 'Errores');

    XLSX.writeFile(wb, "reporte_errores.xlsx");
}

// Llama a la función principal
getStockProveedor();
