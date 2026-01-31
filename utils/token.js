
import tokenService from '../services/tokenService.js';
//generate tokens using tokenService
export const generateAccessToken = (user) => {
    return tokenService.generateAccessToken(user);
}
//generate refresh token using tokenService
export const generateRefreshToken = (user) => {
    return tokenService.generateRefreshToken(user);
}
//generate temporary token using tokenService
export const genarateTemporaryToken = (user) => {
    return tokenService.generateTemporaryToken(user);
}

// Export service for direct access
export default tokenService;
