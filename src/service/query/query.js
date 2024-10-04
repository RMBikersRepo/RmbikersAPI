const pool = require('./connection');

async function getQueryDB(sqlQuery, values = []) {
    const connection = await pool.getConnection(); // Obtén la conexión del pool
    try {
        // Realiza la consulta usando promesas
        const [results] = await connection.query(sqlQuery, values); // Solo necesitas los resultados
        return results; // Devuelve los resultados
    } catch (error) {
        console.error('Error al consultar:', error);
        throw error; // Rechaza la promesa en caso de error
    } finally {
        connection.release(); // Asegúrate de liberar la conexión
    }
}

async function executeTransaction(queries) {
    const connection = await pool.getConnection(); // Obtén la conexión del pool
    try {
        await connection.beginTransaction(); // Iniciar la transacción

        for (const { sql, values } of queries) {
            await connection.query(sql, values); // Ejecutar cada consulta
        }

        await connection.commit(); // Confirmar la transacción
    } catch (error) {
        await connection.rollback(); // Revertir la transacción en caso de error
        console.error('Error en la transacción:', error);
        throw error; // Rechaza la promesa en caso de error
    } finally {
        connection.release(); // Asegúrate de liberar la conexión
    }
}

module.exports =  getQueryDB ;