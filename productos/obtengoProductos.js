import getQueryDB from '../../../../../servicios/sqlServ/query.js';

async function SKU(itemPast, allAttributes) {
    // Primera consulta para obtener el resumen
    const sqlSummary = `SELECT SKU, tipoSKU, count(MLM) AS total_productos FROM productos_ml WHERE SKU LIKE ? GROUP BY SKU, tipoSKU;`;
    const summaryRequest = await getQueryDB(sqlSummary, [`%${itemPast}%`]);

    if (allAttributes) {
        // Si se solicita todos los atributos, obtenemos más información
        const detailedResults = await Promise.all(summaryRequest.map(async (item) => {
            const detailedData = await dataProduct(item.SKU);
            return { ...item, detailedData }; // Combina el resumen con los detalles
        }));
        
        return detailedResults; // Retorna el resultado combinado
    }

    return summaryRequest; // Retorna solo el resumen si no se piden todos los atributos
}

async function dataProduct(itemSKU) {
    const sql = `SELECT * FROM productos_ml WHERE SKU = ?`;
    const request = await getQueryDB(sql, [`${itemSKU}`]);
    return request; // Asegúrate de retornar el resultado de la consulta
}

export { dataProduct };
export default SKU;
