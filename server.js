require('dotenv-safe').config(); 
const db = require('./config/db'); 
const app = require('./app') ;
const logger = require('./utils/logger') ;
const agenda = require('./agenda');


( async()=>{
    logger('system', `Starting the server apps...`);
    const server = app.listen(process.env.NODE_PORT, () => {
        logger('system', 'App is running at ' + process.env.NODE_PORT);

    logger('system', `Starting the Agenda...`);
    agenda.init();
      
    })
})(); 