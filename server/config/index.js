require('dotenv').config();

module.exports = {
  // 服务器配置
  port: process.env.PORT || 5000,
  environment: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/suggestion-system',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // 邮件服务配置
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'user@example.com',
    password: process.env.EMAIL_PASSWORD || 'password',
    from: process.env.EMAIL_FROM || '合理化建议系统 <suggestions@example.com>'
  },
  
  // 文件上传配置
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads/',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5000000', 10) // 5MB
  }
}; 