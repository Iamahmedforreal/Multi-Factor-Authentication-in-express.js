import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const trasnporter = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS

    }
})

export const  sendEmailVerification = async(email , token) =>{
    const link = `http://localhost3000/verify-email?token=${token}`
    await trasnporter.sendMail({
        to:email,
        subject:"verify email",
        html:`<p> Click to verify your email </p>
             <a href="${link}">${link}</a>`
    })
}



export default trasnporter;