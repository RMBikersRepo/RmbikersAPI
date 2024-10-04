const axios = require('axios');
// import getAuthFromMercadoApi from '../control/Path_Control/autenticacionApi/Auth/autenToken.js';

async function getEndPointData(url, userId, token) {
    //const tokenData = await getAuthFromMercadoApi();  // Obtén el token de autenticación
   
    const accessToken = token;

    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: url,
        headers: { 
            'Authorization': `Bearer ${accessToken}`
        }
    };

    try {
        const response = await axios.request(config);
        
        return response.data;  // Retorna directamente los datos
    } catch (error) {
        console.error("Error en la solicitud de endpoint:", error.message);
        throw error;  // Propaga el error
    }
}


 module.exports = getEndPointData;