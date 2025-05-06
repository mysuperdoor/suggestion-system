const path = require('path');
const fs = require('fs');
const { Suggestion } = require('../models/Suggestion');

/**
 * 获取上传文件
 * @param {Object} req.params.filename 文件名
 * @returns {File} 文件流
 */
exports.getUploadedFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // 安全检查：确保文件名不包含路径操作字符
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ message: '无效的文件名' });
    }
    
    // 构建文件路径
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '文件不存在' });
    }
    
    // 返回文件
    res.sendFile(filePath);
  } catch (error) {
    console.error('获取文件失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 下载建议的附件
 * @param {Object} req.params.id 建议ID
 * @param {Object} req.params.attachmentId 附件ID
 * @returns {File} 文件流
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    
    // 获取建议
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 查找附件
    const attachment = suggestion.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: '附件不存在' });
    }
    
    // 构建文件路径
    const filePath = path.join(__dirname, '../uploads', attachment.filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: '文件不存在，可能已被删除',
        userMessage: '抱歉，该文件已不存在于服务器中'
      });
    }
    
    // 设置Content-Disposition头，使用原始文件名
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalname)}`);
    
    // 返回文件
    res.sendFile(filePath);
  } catch (error) {
    console.error('下载附件失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 删除建议附件
 * @param {Object} req.params.id 建议ID
 * @param {Object} req.params.attachmentId 附件ID
 * @returns {Promise<Object>} 操作结果
 */
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    
    // 获取建议
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 检查权限（只有提交者或管理员可以删除附件）
    if (suggestion.submitter.toString() !== req.user.id && 
        !['部门经理', '安全科管理人员', '运行科管理人员'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: '无权删除附件',
        userMessage: '您没有权限删除此附件'
      });
    }
    
    // 如果建议已经获得批准，不允许删除附件
    if (suggestion.reviewStatus === 'APPROVED' || 
        suggestion.reviewStatus === 'PENDING_SECOND_REVIEW') {
      return res.status(400).json({ 
        message: '已审核的建议不能删除附件',
        userMessage: '此建议已进入审核流程，无法删除附件'
      });
    }
    
    // 查找附件
    const attachment = suggestion.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: '附件不存在' });
    }
    
    // 保存文件路径用于后续删除
    const filePath = path.join(__dirname, '../uploads', attachment.filename);
    
    // 从数据库中移除附件
    suggestion.attachments.pull(attachmentId);
    await suggestion.save();
    
    // 尝试从文件系统中删除文件
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsError) {
      console.error('删除文件失败:', fsError);
      // 不向客户端返回错误，因为数据库记录已更新
    }
    
    res.json({ 
      message: '附件删除成功',
      suggestion
    });
  } catch (error) {
    console.error('删除附件失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 