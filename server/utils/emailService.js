const nodemailer = require('nodemailer');
const User = require('../models/User');
const config = require('../config');

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

/**
 * 发送电子邮件
 * @param {String} to 接收者邮箱
 * @param {String} subject 邮件主题
 * @param {String} content 邮件内容
 * @returns {Promise} 邮件发送结果
 */
exports.sendEmail = async (to, subject, content) => {
  try {
    const mailOptions = {
      from: `"合理化建议系统" <${config.email.user}>`,
      to,
      subject,
      html: content,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return info;
  } catch (error) {
    console.error('邮件发送失败:', error);
    throw error;
  }
};

/**
 * 根据角色向所有具有该角色的用户发送电子邮件
 * @param {String} role 用户角色
 * @param {String} subject 邮件主题
 * @param {String} content 邮件内容
 * @returns {Promise} 邮件发送结果
 */
exports.notifyByRole = async (role, subject, content) => {
  try {
    // 查找所有具有指定角色的用户
    const users = await User.find({ role });
    
    if (!users || users.length === 0) {
      console.warn(`未找到角色为 ${role} 的用户`);
      return;
    }
    
    // 提取用户邮箱
    const emails = users.map(user => user.email).filter(email => email && email.trim() !== '');
    
    if (emails.length === 0) {
      console.warn(`角色 ${role} 的用户没有有效的邮箱地址`);
      return;
    }
    
    // 发送邮件给所有用户
    return await exports.sendEmail(emails.join(','), subject, content);
  } catch (error) {
    console.error('根据角色发送通知邮件失败:', error);
    throw error;
  }
}; 