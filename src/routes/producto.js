const express = require('express');
const router = express.Router();
const {checkSession} = require('../middlewares/origin');
const {getList, getDetalles, updateItem, createItem, deleteItem} = require('../controller/productos');
//EndPoints solo productos
router.get("", getList);

router.get("/", getDetalles);

router.get("/:id",checkSession, updateItem);

router.get("/:id",checkSession, createItem);

router.get("/:id",checkSession, deleteItem);

module.exports = router;