// import queryDB from './query';
import xlsx from 'xlsx'

function getDataExcel() {
    const excelPath = '../../control/Path_Control/autenticacionApi/webScrapp/GlobalMLRMBikers.xlsx'
    const workBook = xlsx.readFile(excelPath);
    const sheetName = workBook.SheetNames[0];

    const sheet = workBook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Obtener los encabezados (primera fila)
    const headers = data.shift();

    // Crear una nueva matriz para almacenar los datos formateados
    const formattedData = data.map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row[index];
        });
        setDataFromExcel(rowData);
    });


    
}

async function setDataFromExcel(excelData){
    const dataMapPrepare = excelData.data(productos => {
        const sql = 'INSERT INTO producto (SKU, Nombre, id_proveedor, Stock, Precio, Categoria) VALUES (?,?,?,?,?,?)';
        const values = productos.map(producto=>[
            producto.Titulo || 'Nombre no asignado',
            producto.precio || 'Sin Precio',
            producto.SKU_INTERNO || 'SKU-NO ASIGNADO',
            producto.marca ||
             

        ])
    })
}

getDataExcel();