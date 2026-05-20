const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization token, access denied' });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No token found in bearer header' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'optify_secret_key_123');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        res.status(401).json({ message: 'Token is not valid or has expired' });
    }
};
