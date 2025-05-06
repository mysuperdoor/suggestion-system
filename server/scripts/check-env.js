const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('环境变量检查:');
console.log('=================');
console.log('当前工作目录:', process.cwd());
console.log('.env 文件路径:', path.join(__dirname, '../../.env'));
console.log('JWT_SECRET:', process.env.JWT_SECRET || '未设置');
console.log('MONGO_URI:', process.env.MONGO_URI || '未设置');
console.log('=================');

// 检查文件是否存在
const fs = require('fs');
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  console.log('.env 文件存在');
  console.log('文件内容:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(envContent.replace(/^/gm, '  '));
} else {
  console.log('.env 文件不存在');
}

const missingVars = [];

if (!process.env.JWT_SECRET) {
  missingVars.push('JWT_SECRET');
}

if (!process.env.MONGO_URI) {
  missingVars.push('MONGO_URI');
}

if (missingVars.length > 0) {
  console.error('警告: 以下环境变量未设置:');
  missingVars.forEach(variable => {
    console.error(`- ${variable}`);
  });
  console.error('\n请在 .env 文件中设置这些变量');
} else {
  console.log('所有必需的环境变量都已正确设置');
} 