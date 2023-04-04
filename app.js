require("dotenv").config();
const {PrismaClient} = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("./middleware/auth");
const users = require("./controllers/user");
const main = require("./controllers/main");
const app = express();

app.use(express.json({limit: "100mb"}));

app.use('/users', users);
app.use('', main);

module.exports = app;




