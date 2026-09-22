import express, { urlencoded } from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import auth_router from "./routes/auth.routes.js";

const app = express()


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended : true}))
app.use(cookieParser())

app.get("/" , (req ,res)=>{
    res.json({
        success: true,
        message: "ilmhub API is running"
    })
})

app.use("/api/auth" , auth_router)

export default app
