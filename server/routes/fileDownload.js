const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

// 处理文件下载
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { originalname } = req.query;
    
    console.log('文件下载请求:', {
      文件名: filename,
      原始文件名: originalname,
      解码后的原始文件名: decodeURIComponent(originalname || '')
    });

    // 检查文件是否存在
    const filePath = path.join(__dirname, '../uploads', filename);
    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      return res.status(404).json({ message: '文件不存在' });
    }

    // 获取文件状态信息
    const stat = fs.statSync(filePath);
    
    // 设置正确的Content-Disposition头，处理中文文件名
    // 使用RFC 5987编码方式
    let decodedOriginalname;
    try {
      // 先尝试解码，以防传入的文件名已经是URL编码后的
      decodedOriginalname = decodeURIComponent(originalname || filename);
    } catch (e) {
      // 如果解码失败，直接使用原始文件名
      decodedOriginalname = originalname || filename;
    }
    
    // 确保文件名编码正确
    const encodedFilename = encodeURIComponent(decodedOriginalname)
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
    
    // 设置响应头
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 同时设置UTF-8编码格式和传统格式的header，增加兼容性
    res.setHeader('Content-Disposition', 
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    
    // 记录下载成功信息
    console.log('文件下载成功:', {
      文件名: filename,
      解码后的原始文件名: decodedOriginalname,
      编码后的文件名: encodedFilename,
      文件大小: stat.size
    });

    // 使用流式传输文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ message: '文件下载失败', error: error.message });
  }
});

module.exports = router; 