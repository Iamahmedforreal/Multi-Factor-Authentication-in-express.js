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

export const sendWarningEmail = async(email, action, meta = {}) =>{
    const ip = meta?.ip || 'unknown';
    const deviceInfo = meta?.device ||' unknown';

    const html = `<p> A new login to your account was detected:</p>
      <ul>
        <li><strong>IP:</strong> ${ip}</li>
        <li><strong>Device:</strong> ${deviceInfo}</li>
      </ul>
      <p>If this wasn't you, please change your password immediately.</p>`;


    await trasnporter.sendMail({
        to:email,
        subject:"Security Alert",
        html
    })
}

export const sendLoginAlertEmail = async(email, action , meta = {}) =>{
    const ip = meta?.ip || 'unknown';
    const deviceInfo = meta?.device ||  'unknown' ;

    const html = `<p> A new login to your account was detected:</p>
      <ul>
        <li><strong>IP:</strong> ${ip}</li>
        <li><strong>Device:</strong> ${deviceInfo}</li>
      </ul>
      <p>If this wasn't you, please change your password immediately.</p>`;

    await trasnporter.sendMail({
        to:email,
        subject:"New Login Detected",
        html
    })
    
}



export default trasnporter;
