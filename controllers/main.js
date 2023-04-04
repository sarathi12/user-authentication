const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const {PrismaClient} = require("@prisma/client");
const prisma = new PrismaClient();

router.post("/refresh_token", auth, async(req, res) => {
    try {
        // Get user input
        const {email} = req.body;

        // Validate user input
        if (!(email)){
            return res.status(400).send("Email input is required");
        }
        // Check if user already exist
        // Validate if user exist in our database
        const user = await prisma.user.findFirst({where: {email: email}});

        if(user) {
            // create token
            const token = jwt.sign(
                {user_id: user.id, email},
                process.env.TOKEN_KEY,
                {
                    expiresIn: "60",
                }
            );

            // return user
            return res.status(201).json({
                success: true,
                message: "Token refreshed successfully",
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
            
        
        }
        return res.status(400).send("Invalid User");
    }
    catch(err) {
        console.log("error ", err);
        return res.status(500).send("Server internal error");
    }
});

module.exports = router;