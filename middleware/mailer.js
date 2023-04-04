const nodemailer = require('nodemailer');
require("dotenv").config();
const config = process.env;
 
let mailTransporter = nodemailer.createTransport({
    service: config.EMAIL_SERVICE,
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASSWORD
    }
});
  
const sendMail = function (userName, email, randomString, callback )  {
    console.log("email ID :", email);
    var mailDetails = {
        from: config.EMAIL_USER,
        to: email,
        subject: 'Reset Password',
        html: "Hi "+ userName + ", Please use the below code for reset your password. code <b> "+randomString +"</b>."
    };
    mailTransporter.sendMail(mailDetails, function(err, data) {
        if(err) {
            callback(err);
        } else {
            callback(null, data);
        }
    });

}

module.exports = sendMail;

