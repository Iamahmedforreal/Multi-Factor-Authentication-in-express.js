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
    const link = `http://localhost:7000/api/auth/verify-email?token=${token}`
    await trasnporter.sendMail({
        to:email,
        subject:"verify email",
        html:`<p> Click to verify your email </p>
             <a href="${link}">${link}</a>`
    })
}


export const  sendEmailResetPassword = async(email , token) =>{
    const link = `http://localhost:7000/api/auth/reset-password?token=${token}`
    await trasnporter.sendMail({
        to:email,
        subject:"reset password",
        html:`<p> Click to verify your email </p>
             <a href="${link}">${link}</a>`
    })
}

export const sendWarningEmail = async(email, action, meta ,) =>{
    let subject, text;
    
    if (action === 'RATE_LIMIT_EXCEEDED') {
        subject = "Security Alert: Too many attempts";
        text = `We noticed multiple failed refresh attempts from IP: ${meta.userAgent}. Your account is safe but temporarily throttled.`;
    } else if (action === 'NEW_LOGIN') {
        subject = "New Login Detected";
        text = `A new login occurred at ${meta.time}. If this wasn't you, change your password immediately.`;
    }
    await trasnporter.sendMail({
        to:email,
        subject:subject,
        text:text
    })
}


export default trasnporter;
