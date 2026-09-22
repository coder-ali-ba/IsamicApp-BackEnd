import dotenv from "dotenv"
dotenv.config()
import app from "./src/app.js"
import connectDB from "./src/configs/db.js"

const PORT = process.env.PORT || 8000
const startServer = async()=>{
    try {
        await connectDB()
        app.listen(PORT , ()=>{
            console.log(`Server is listening on http://localhost:${PORT}`);
            
        })
    } catch (error) {
        console.error("Server startup failed:");
        console.error(error.message);
    }
}

startServer()


