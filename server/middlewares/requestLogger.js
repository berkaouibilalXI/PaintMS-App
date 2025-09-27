//bch n3rfou g3 les requetes li rhm ydoro f serveur LOL
const requestLogger = (req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
}
module.exports = requestLogger;