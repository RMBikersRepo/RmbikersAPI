import axios from 'axios'; // Asegúrate de tener axios instalado
import getQueryDB, {executeTransaction} from '../../../../../servicios/sqlServ/query.js';
// const products = [
//     { id: 'MLM1378171676', ventas: 583, stock: 0 },
//     { id: 'MLM1520431143', ventas: 145, stock: 0 },
//     { id: 'MLM1520418142', ventas: 55, stock: 3 },
//     { id: 'MLM1520411502', ventas: 2, stock: 3 },
//     { id: 'MLM1520374180', ventas: 28, stock: 6 },
//     { id: 'MLM1520372279', ventas: 6, stock: 3 },
//     { id: 'MLM1520366108', ventas: 200, stock: 5 },
//     { id: 'MLM1448116805', ventas: 279, stock: 3 },
// ];

async function getStockFromMarket(){
    let sql = `SELECT SKU, MLM, Ventas, Stock, tipoSKU FROM productos_ml WHERE tipoSKU LIKE '%indirecto%' ORDER BY SKU`;
    try {
        const request = await getQueryDB(sql);
        const response = request.data;
        console.log(response);
    } catch (error) {
        
    }
}

const totalStock = 23; // total de stock
const initialAllocation = products.length; // 1 unidad por producto
const stockRemaining = totalStock - initialAllocation;

// Asignar 1 unidad a cada producto
products.forEach(product => {
    product.stock = 1; // Asignación inicial
});

// Calcular total de ventas
const totalVentas = products.reduce((sum, product) => sum + product.ventas, 0);

// Calcular stock adicional basado en ventas
products.forEach(product => {
    const proportion = product.ventas / totalVentas;
    const additionalStock = Math.floor(proportion * stockRemaining);
    product.stock += additionalStock;
});

// Ajustar el stock para que sume el total deseado
const totalAssigned = products.reduce((sum, product) => sum + product.stock, 0);
const difference = totalStock - totalAssigned;

// Si hay diferencia, distribuirla entre los productos
if (difference > 0) {
    products.sort((a, b) => b.ventas - a.ventas); // Ordenar por ventas
    for (let i = 0; i < difference; i++) {
        products[i % products.length].stock += 1; // Distribuir el resto
    }
}

// Función para actualizar el stock en Mercado Libre
async function updateStock(product) {
    const apiUrl = `https://api.mercadolibre.com/items/${product.id}`;
    const token = 'APP_USR-889807737673414-091910-c293bec739305f0a55f4aa1f70d183a3-420711769'; // Reemplaza con tu token

    const data = {
        available_quantity: product.stock,
    };

    try {
        const response = await axios.put(apiUrl, data, {
            headers: {
                'x-version': '1',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        console.log(`Actualizado ${product.id} con stock: ${response.data.available_quantity}`);
    } catch (error) {
        console.error(`Error actualizando ${product.id}:`, error.response.data);
    }
}

// Actualizar el stock para cada producto
async function updateAllStocks() {
    for (const product of products) {
        console.log(`Preparando actualización: ${product.id} con stock: ${product.stock}`);
        await updateStock(product);
    }
}

// Ejecutar la actualización
updateAllStocks();
