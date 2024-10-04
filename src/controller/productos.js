const {initProductos} = require('../service/productos');
const getList = async(req, res) => {
    await initProductos();
};

const getDetalles = async(req, res) => {
    //active itemIdentify
    await initProductos();
};

const updateItem = (req, res) => {};

const createItem = (req, res) => {};

const deleteItem = (req, res) => {};

module.exports = {getList, getDetalles, updateItem, createItem, deleteItem}