import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config()

const connectDB = async() => {
    try {
        const mongoURI = process.env.MONGO_URI;       
        if(!mongoURI){
            throw new error("Mongo URI is missing")
        }
        const connection = await mongoose.connect(mongoURI)
        console.log("MongoDB connected")        
    } catch (error) {
        console.log("MongoDb Connection Failed");
        console.log(error.message);
       
    }
}

export default connectDB