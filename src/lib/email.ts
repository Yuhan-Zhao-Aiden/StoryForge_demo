// src/lib/email.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(to: string, subject: string, text: string, html: string) {
  await transporter.sendMail({
    from: `"StoryForge" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  })
}
