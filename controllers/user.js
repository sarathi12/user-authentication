require("dotenv").config();
const {PrismaClient} = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const crypto = require('crypto');
const router = express.Router();
const sendMail = require("../middleware/mailer");

router.post("/register", async (req, res) => {
    try {
        // Get user input
        const {name, email, password} = req.body;

        // Validate user input
        if (!(email && password && name)){
            return res.status(400).send("All input is required");
        }

        // Check if user already exist
        // Validate if user exist in our database
        const oldUser = await prisma.user.findFirst({where: {email: email}});

        if(oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }

        // encrypt password 
        const encryptPassword = await bcrypt.hash(password, 10);

        // create user in database
        const user = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: encryptPassword,
            }
        });

        // create token
        const token = jwt.sign(
            {user_id: user.id, email},
            process.env.TOKEN_KEY,
            {
                expiresIn: "1h",
            }
        );

        // save token
        user.token = token;

        // return new user
        return res.status(201).json({
            success: true,
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (err) {
        return res.status(500).send("Internal server error");
    }

});

router.post("/login", async (req, res) => {
    try {
        // Get user input
        const { email, password} = req.body;

        // Validate user input
        if (!(email && password)){
            return res.status(400).send("All input is required");
        }

        // Check if user already exist
        // Validate if user exist in our database
        const user = await prisma.user.findUnique({where: {email: email}});

        if(user && (await bcrypt.compare(password, user.password))) {
            // create token
            const token = jwt.sign(
                {user_id: user.id, email},
                process.env.TOKEN_KEY,
                {
                    expiresIn: "60",
                }
            );

            // save token
            // user.token = token;

            // return user
            return res.status(201).json({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        }
        
        return res.status(400).send("Invalid Credentails");
        
    }
    catch (err){
        console.log(err);
        return res.status(500).send("Internal server error");
    }

});

router.delete("/delete", async (req, res) => {
    try {
        // Get user input
        const {email} = req.body;
        if(!email) {
            return res.status(400).send("Email input required");
        }
        // check the user already exist
        const user = await  prisma.user.findFirst({where:{email: email}});
        if(user) {
           const deleteUser = await prisma.user.delete({where:{email: email}});
           if(deleteUser) {
            return res.status(200).json({
                success: true,
                message: "User deleted successfully"
            });
        }
        else{
            return res.status(200).json({
                success: false,
                message: "User delete failed"
            }); 
        }
        }        
        else {
            res.status(200).json({
                success: false,
                message: "User doesn't exist"
            });
        }

    }
    catch (err) {
        return res.status(500).send("Internal Server Error");
    }
}
);

router.post("/forgot_password", async (req, res) => {
    try {
    const {email} = req.body;
    if(!email) {
        return res.status(400).send("Email input required");
    }
    // check the user already exist
    const user = await prisma.user.findUnique({where:{email: email}});
    if(user) {
        var randomString = crypto.randomBytes(6).toString("hex");
        var forgotUser = await prisma.forgetPassword.findFirst({where:{userId: user.id}});
        if(forgotUser) {
            forgotUser.randomString = randomString
        }
        else {
            forgotUser = await prisma.forgetPassword.create({
                data: {
                    user: {connect:{id: user.id}},
                    randomString: randomString
                }
            });
        }
        if(forgotUser) {
            // send email id
            sendMail(
                user.name, user.email, randomString, function(err, data) {
                    if(err){
                        return res.status(400).json({
                            success: false,
                            message: "Send email failed."
                        });
                    }
                    else{
                        return res.status(200).json({
                            success: true,
                            message: "Reset password link sent to your Email."
                        });
                    }
                }
            );
        }
        else {
            return res.status(500).send("Internal Server Error");
        }
    
        
    }        
    else {
        res.status(200).json({
            success: false,
            message: "Email doesn't exist"
        });
    }
}
catch(err) {
    
    return res.status(500).send("Internal Server Error" + err);
}
});

router.post("/reset_password", async (req, res) => {
    try {
        const {randomString, email, password} = req.body;
        // Validate user input
        if (!(email && password && randomString)) {
            return res.status(400).send("All input is required");
        }
        
        const user = await prisma.user.findFirst({where: {email: email}});
        if(user) {
            // Check the randow string available or not
            var forgotUser = await prisma.forgetPassword.findUnique({where:{userId: user.id}});
            if(forgotUser) {
                console.log("randowm string ", randomString, forgotUser.randomString);
                if(forgotUser.randomString == randomString) {
                    // encrypt password 
                    const encryptPassword = await bcrypt.hash(password, 10);
                    user.password = encryptPassword;
                    const updateUser = await prisma.user.update({where:{id: user.id}, data:{password: encryptPassword}});
                    const isCheck =  await bcrypt.compare(password, encryptPassword)
                    // await prisma.forgetPassword.delete({where:{userId: updateUser.id}});
                    return res.status(200).json({
                        success: true,
                        message: "New password updated successfully."
                    });

                }
                else {
                    return res.status(400).send("Invalid auth information or may be expired auth information");
                }
            }
            else {
                return res.status(400).send("User doesn't have forgot password request");
            }
        }
        else{
            return res.status(400).send("Invalid User");
        }
        
    }
    catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

router.get("/profile", auth, async (req, res) => {
    console.log("req user: ", req.user, req.originalUrl);
    const user = await prisma.user.findUnique({where: {id: req.user.user_id}});
    if(user){
        const users = await prisma.user.findMany({ select: {id: true, email: true, name: true}});
        return res.status(200).json({
            success: true,
            message: "success",
            data: users
        });
    }

    return res.status(200).json({
        success: false,
        message: "Invalid user"
    });
  });


module.exports = router;




