import axios from 'axios';
import getArticulosFromUserId from '../../../autenticacionApi/articulos/getProductos.js';
import getQueryDB from '../../../../../servicios/sqlServ/query.js'; // Ajusta el path según tu estructura

// Configura tus variables
const ACCESS_TOKEN = 'APP_USR-889807737673414-091717-6da33df320b750bc72bce23c463a7407-420711769';
const USER_ID = '1107927983';
const BASE_URL = 'https://api.mercadolibre.com';


const listadoDeProductos = async () => {
  try {
    const getdataProducto = await getArticulosFromUserId();
    if (!getdataProducto || !Array.isArray(getdataProducto)) {
      throw new Error(`ERROR: La respuesta de getArticulosFromUserId no es válida.`);
    }
    // Extraer los campos necesarios de cada producto
    const productos = getdataProducto.map(producto => ({
      name: producto.name,
      precio: producto.price,
      seller_sku: producto.attributes.value_name ? producto.attributes.value_name : 'N/A'
    }));
    return productos; // Devuelve la lista completa de productos con los campos necesarios
  } catch (error) {
    console.error('Error al obtener el listado de productos:', error);
    return [];
  }
};

// Obtiene todos los ítems
async function fetchAllItems() {
  let allItems = [];
  let scrollId = null;

  while (true) {
    try {
      let url = `${BASE_URL}/users/${USER_ID}/items/search?search_type=scan`;
      if (scrollId) {
        url += `&scroll_id=${scrollId}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });

      const data = response.data;
      const items = await Promise.all(data.results.map(async itemId => {
        // Obtén los detalles del ítem por cada ID
        const itemResponse = await axios.get(`${BASE_URL}/items/${itemId}`, {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        return {
          name: itemResponse.data.title,
          precio: itemResponse.data.price,
          seller_sku: itemResponse.data.attributes[19] ? itemResponse.data.attributes[19].value_name : 'N/A'
          
        };
      }));

      allItems = allItems.concat(items);

      if (!data.scroll_id) {
        break;
      }

      scrollId = data.scroll_id;

    } catch (error) {
      console.error('Error al obtener los ítems:', error);
      break;
    }
  }

  await sendToSQL(allItems); // Mueve el llamado a sendToSQL aquí para asegurarte de que los datos están listos antes de enviarlos
  return allItems;
}

// Número máximo de ítems por lote para la inserción
const BATCH_SIZE = 1000;

async function sendToSQL(allItems) {
  // Dividir los ítems en lotes
  const chunks = [];
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    chunks.push(allItems.slice(i, i + BATCH_SIZE));
  }

  // Función para insertar un lote de datos
  async function insertBatch(batch) {
    try {
      // Construir los valores para la consulta SQL
      const values = batch.map(item => `('${item.name}', ${item.precio}, '${item.seller_sku}')`).join(',');
      const query = `INSERT INTO competencias (name, precio, seller_sku) VALUES ${values};`;
      console.log('Executing query:', query);
      await getQueryDB(query);
      console.log(`Inserted ${batch.length} records`);
    } catch (error) {
      console.error('Error al insertar los registros en la base de datos:', error);
      throw error; // Lanzar el error para manejo en el proceso principal
    }
  }

  // Insertar todos los lotes en paralelo
  try {
    await Promise.all(chunks.map(chunk => insertBatch(chunk)));
    console.log('Todos los registros han sido insertados correctamente.');
  } catch (error) {
    console.error('Error al insertar algunos lotes de registros:', error);
  }
}


// Ejecutar la función principal
fetchAllItems();
