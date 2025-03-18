const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Nitish <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME, // SendGrid username (from environment variables)
          pass: process.env.SENDGRID_PASSWORD, // SendGrid API key (from environment variables)
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // SMTP host (e.g., smtp.mailtrap.io, smtp.gmail.com)
      port: process.env.EMAIL_PORT, // SMTP port (e.g., 587 for TLS, 465 for SSL, 2525 for Mailtrap)
      auth: {
        user: process.env.EMAIL_USERNAME, // SMTP username (from environment variables)
        pass: process.env.EMAIL_PASSWORD, // SMTP password (from environment variables)
      },
    });
  }

  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName, // Replace 'firstName' with the actual user's first name
      url: this.url, // Replace 'url' with the actual URL for the booking confirmation page
      subject,
    });
    const mailOptions = {
      from: this.from, // Sender email with name
      to: this.to, // Recipient email
      subject,
      html, // Email subject
      text: htmlToText.fromString(html), // Plain text email content
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes'
    );
  }
};
