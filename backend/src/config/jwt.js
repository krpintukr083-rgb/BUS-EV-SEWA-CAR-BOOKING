module.exports = {
  secret: process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure',
  expiresIn: process.env.JWT_EXPIRE || '7d'
};
