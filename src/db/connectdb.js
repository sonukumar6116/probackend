import mongoose from "mongoose";
import { DB_NAME } from "../constraints.js";

const connect_db = async () => {
      try {
            const connect = await mongoose.connect(`${process.env.MongoDb_Uri}/${DB_NAME}`);
            console.log(connect.connection.host);
      } catch (error) {
            console.error("ERROR on Connecting DB --->", error);
            process.exit(1);
      }
}

export default connect_db;