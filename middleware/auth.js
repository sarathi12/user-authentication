const jwt = require("jsonwebtoken");

const config = process.env;

const verifyToken = (req, res, next) => {
    // const token = req.body.token || req.query.token || req.params.token || req.headers["x-access-token"];
    const token =  req.headers["x-access-token"];
    if(!token) {
        return res.status(403).send("A Token is required for authentication");
    }
    try {
        const decoded = jwt.verify(token, config.TOKEN_KEY);
        req.user = decoded;
    } catch(err) {
        if(err  instanceof jwt.TokenExpiredError) {
            if(req.originalUrl.includes("refresh_token")){
                return next();
            }
            return res.status(401).send("Token expired. Refresh the new token");
        }
        console.log("token expire error ", err);
        return res.status(401).send("Token invalid");
    }
    return next();

};

module.exports = verifyToken;