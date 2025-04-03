require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
//stockController= require('./controller/stockController'); 

if (process.env.NODE_ENV !== 'production') {
    const morgan = require('morgan');
    app.use(morgan('dev'));
}

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN }));



//Minhas rotas igual eu faço com o horse 
//app.get('/stock', stockController.doSyncStock);

app.get('/health', (req, res) => res.send(`OK [${new Date()}] - App listening on port ${process.env.NODE_PORT}`));


module.exports = app; 
