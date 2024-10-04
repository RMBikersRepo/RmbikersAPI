const checkSession = (req, res, next) =>{
    const headerAuth = req.headers.authorization || '';

    const token = headerAuth.split(' ').pop();
    if(!token){
        res.status(405);
        res.send({error: "El token ingresado no es valido"});
    }else{ 
        next();
    }
} 

module.exports = { checkSession };