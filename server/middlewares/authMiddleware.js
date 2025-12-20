import { verifyAccessToken } from '../utils/jwt.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    try {
        const user = verifyAccessToken(token);
        req.user = user;
        next();
    } catch (err) {
        return res.sendStatus(403);
    }
};
