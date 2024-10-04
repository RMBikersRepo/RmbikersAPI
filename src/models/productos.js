const axios = require('axios');
const getQueryDB = require('../service/query/query'); // Ajusta el path según tu estructura
const BASE_URL = 'https://api.mercadolibre.com';

// Obtiene todos los ítems
async function fetchAllItems(userId, token) {
  let allItemIds = [];
  let scrollId = null;

  while (true) {
    try {
      let url = `${BASE_URL}/users/${userId}/items/search?search_type=scan`;
      if (scrollId) {
        url += `&scroll_id=${scrollId}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = response.data;

      if (data.results && data.results.length > 0) {
        allItemIds = allItemIds.concat(data.results.map(id => ({
          seller_id: data.seller_id,  // Usa el seller_id del objeto
          MLM: id                       // El ID de la lista
        })));
        
      } else {
        console.warn('No se encontraron ítems en esta respuesta.', userId);
      }

      if (!data.scroll_id) {
        break;
      }

      scrollId = data.scroll_id;

    } catch (error) {
      console.error('Error al obtener los ítems:', error);
      break;
    }
  }
 
  await sendToSQL(allItemIds);
}

// Número máximo de ítems por lote para la inserción
const BATCH_SIZE = 1000;

// Función para verificar si un ID ya existe en la base de datos
async function idExistsInDB(item) {
  const query = `SELECT COUNT(*) FROM mlidentificador WHERE MLM='${item.MLM}'`;
  const result = await getQueryDB(query);
  return result[0]['COUNT(*)'] > 0;
}

async function sendToSQL(allItemIds) {
  const uniqueItems = [];

  const allMLM = allItemIds.map(item => item.MLM);

  if (allMLM.length === 0) {
    console.log('No hay IDs para verificar.');
    return; // Salir si no hay IDs
  }

  const existingItems = await getQueryDB(`SELECT MLM FROM mlidentificador WHERE MLM IN (${allMLM.map(id => `'${id}'`).join(',')})`);
  const existingSet = new Set(existingItems.map(item => item.MLM));

  for (const item of allItemIds) {
    if (!existingSet.has(item.MLM)) {
      uniqueItems.push(item);
    }
  }

  const chunks = [];
  for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
    chunks.push(uniqueItems.slice(i, i + BATCH_SIZE));
  }

  async function insertBatch(batch) {
    if (batch.length === 0) return;
    try {
      const values = batch.map(item => `('${item.MLM}', '${item.seller_id}')`).join(',');
      const query = `INSERT INTO mlidentificador (MLM, seller_id) VALUES ${values};`;
      await getQueryDB(query);
      console.log(`Inserted ${batch.length} records`);
     
      //
    } catch (error) {
      console.error('Error al insertar los registros en la base de datos:', error);
      throw error;
    }
  }

  try {
    await Promise.all(chunks.map(chunk => insertBatch(chunk)));
    console.log('Todos los registros han sido insertados correctamente.');
  } catch (error) {
    console.error('Error al insertar algunos lotes de registros:', error);
  }
}

// Ejecutar la función en un intervalo
async function main(token, userId) {
  while (true) {
    await fetchAllItems(token, userId);
    return true;
  }
}

module.exports = main;
