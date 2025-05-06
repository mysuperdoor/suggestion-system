const mongoose = require('mongoose');

// 审核级别枚举
const REVIEW_LEVELS = {
  FIRST_LEVEL: '一级审核',  // 值班主任审核
  SECOND_LEVEL: '二级审核'  // 安全科/运行科管理人员审核
};

// 审核结果枚举
const REVIEW_RESULTS = {
  PENDING: '待审核',
  APPROVED: '通过',
  REJECTED: '拒绝'
};

const reviewSchema = new mongoose.Schema({
  suggestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Suggestion',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: String,
    enum: Object.keys(REVIEW_LEVELS),
    required: true
  },
  result: {
    type: String,
    enum: Object.keys(REVIEW_RESULTS),
    default: 'PENDING'
  },
  approved: {
    type: Boolean,
    required: true
  },
  comments: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.level = REVIEW_LEVELS[ret.level];
      ret.result = REVIEW_RESULTS[ret.result];
      return ret;
    }
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = {
  Review,
  REVIEW_LEVELS,
  REVIEW_RESULTS
}; 