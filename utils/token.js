
import tokenService from '../services/tokenService.js';

export const generateAccessToken = (user) => {
    return tokenService.generateAccessToken(user);
}

export const generateRefreshToken = (user) => {
    return tokenService.generateRefreshToken(user);
}

export const genarateTemporaryToken = (user) => {
    return tokenService.generateTemporaryToken(user);
}

// Export service for direct access
export default tokenService;
