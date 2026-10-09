import dotenv from "dotenv";
import mongoose, { mongo } from "mongoose";
   
dotenv.config();

export const dbConnect = async () => {
  try {
    const connect = mongoose.connect(process.env.DB_STRING);
    if (connect){
       console.log("Database Connected Successfully");
      connect.then((res)=>console.log('Database Host',res.connection.host))
       ;}
    else console.log(`Failed To Connect Database`);
  } catch (err) {
    console.log("Error : " + err.message);
  } 
};
 