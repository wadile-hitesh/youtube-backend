//require('dotenv').config({path : './env})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import {app} from './app.js'
const port = process.env.PORT || 8000

dotenv.config({
    path : './env'
})

connectDB()
.then(()=>{
    app.on("error", (error) => {
        console.log("Error : ", error)
        throw err
    })
    app.listen(port, ()=>{
        console.log(`Server is running at PORT : ${port}`);
    })
})
.catch((err)=>{
    console.log("Mongo DB Connection Failed !!!",err);
})
/*
import express from "express";
const app = express()
;(async ()=>{
    try {
        await mongoose.console(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Error : ",error)
            throw err
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("Error: ", error)
        throw err
    }
})()
*/