import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import Bull, { Job } from "bull";

const app = express();

app.use(bodyParser.json());

// Bull Queue in Redis
const emailQueue = new Bull("email");

type EmailType = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

// Producer
const sendNewEmail = async (email: EmailType) => {
  emailQueue.add({ ...email });
};

// Worker
const processEmailQueue = async (job: Job) => {
  //Use a test account as this is a tutorial
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  const { from, to, subject, text } = job.data;

  console.log("Sending mail to %s...", to);

  let info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: `<strong>${text}</strong>`,
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

  return nodemailer.getTestMessageUrl(info);
};

// Connect the Worker to the queue
emailQueue.process(processEmailQueue);

app.post("/send-email", async (req, res) => {
  const { from, to, subject, text } = req.body;

  await sendNewEmail({ from, to, subject, text });
  console.log("Email added to queue");

  res.json({
    message: "Email sent",
  });
});

app.listen(4300, () => {
  console.log("Server started at http://localhost:4300");
});
