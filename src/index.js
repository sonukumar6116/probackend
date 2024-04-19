// require('dotenv').config({path:'./env'});
import dotenv from "dotenv";
import connect_db from "./db/connectdb.js";
import { app } from "./app.js";

dotenv.config({
      path:'./.env'
})

connect_db()
.then( ()=>{
      app.listen(process.env.Port , ()=>{
            console.log('server running on port');
      })
})
.catch(err=>{
      console.log("DB connecction fail " ,err);
})