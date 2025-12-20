import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key'; // In prod, keep these secure!

export const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            is_staff: user.is_staff, 
            is_superuser: user.is_superuser 
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: '60m' }
    );
    const refreshToken = jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            is_staff: user.is_staff, 
            is_superuser: user.is_superuser 
        },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
};
