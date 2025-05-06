const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// 从前端常量文件导入
const { SUGGESTION_TYPES, SUGGESTION_CATEGORIES, REVIEW_STATUS, IMPLEMENTATION_STATUS } = require('../../client/src/constants/suggestions');

// 审核模式
const ReviewSchema = new Schema({
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // 考虑是否真的需要 required，如果审核可能为空
    // required: true
  },
  result: {
    type: String,
    enum: ['APPROVED', 'REJECTED', 'PENDING'],
    default: 'PENDING'
  },
  comments: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    // default: Date.now // 审核时间不应有默认值，应在实际审核时设置
  }
});

// 评论模式
const CommentSchema = new Schema({
  content: {
    type: String,
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 附件模式
const AttachmentSchema = new Schema({
  filename: String,
  originalname: String,
  path: String,
  mimetype: String,
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// 审核状态常量
const SUGGESTION_STATUS = REVIEW_STATUS;

// 实施状态流转规则
const IMPLEMENTATION_STATUS_FLOW = {
  NOT_STARTED: ['CONTACTING', 'CANCELLED'],
  CONTACTING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'DELAYED', 'CANCELLED'],
  DELAYED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['EVALUATED'],
  EVALUATED: [],
  CANCELLED: ['CONTACTING'] // 考虑是否允许从取消回到联系中
};

// 建议模式
const SuggestionSchema = new Schema({
  title: {
    type: String,
    required: [true, '建议标题不能为空'],
    trim: true
  },
  type: {
    type: String,
    required: [true, '建议类型不能为空'],
    enum: {
        values: Object.keys(SUGGESTION_TYPES), // 使用导入的 SUGGESTION_TYPES
        message: '无效的建议类型'
    }
  },
  content: {
    type: String,
    required: [true, '建议内容不能为空']
  },
  expectedBenefit: {
    type: String,
    required: [true, '预期效果不能为空']
  },
  attachments: [AttachmentSchema],
  submitter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: { // 考虑是否从 submitter 用户信息中获取，减少冗余
    type: String,
    required: true,
    // ref: 'User.team' // ref 通常指向模型名
  },
  reviewStatus: {
    type: String,
    enum: {
        values: Object.keys(REVIEW_STATUS), // 使用导入的 REVIEW_STATUS
        message: '无效的审核状态'
    },
    default: 'PENDING_FIRST_REVIEW'
  },
  implementationStatus: { // 顶层实施状态，可能与 implementation.status 同步
    type: String,
    enum: {
        values: Object.keys(IMPLEMENTATION_STATUS), // 使用导入的 IMPLEMENTATION_STATUS
        message: '无效的实施状态'
    },
    default: 'NOT_STARTED'
  },
  implementation: { // 考虑是否将实施信息独立为一个模型 (Implementation) 并用 ref 关联
    status: {
      type: String,
      enum: Object.keys(IMPLEMENTATION_STATUS), // 使用导入的 IMPLEMENTATION_STATUS
      default: 'NOT_STARTED'
    },
    responsiblePerson: { // 考虑使用 ObjectId ref: 'User'
        type: String
    },
    startDate: Date,
    plannedEndDate: Date,
    actualEndDate: Date,
    notes: String,
    attachments: [AttachmentSchema],
    completionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    timeCost: { // 实际耗时（天）
      type: Number,
      default: 0
    },
    history: [{ // 实施状态历史
      status: {
        type: String,
        enum: Object.keys(IMPLEMENTATION_STATUS) // 使用导入的 IMPLEMENTATION_STATUS
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      date: {
        type: Date,
        default: Date.now
      },
      notes: String
    }]
  },
  firstReview: ReviewSchema, // 嵌套 ReviewSchema
  secondReview: ReviewSchema, // 嵌套 ReviewSchema
  comments: [CommentSchema],
  statistics: {                 // 统计信息，考虑是否在查询时计算或异步更新
    reviewTime: Number,         // 审核耗时（天）
    implementationTime: Number, // 实施耗时（天）
    costReduction: Number,      // 成本降低（元）
    efficiencyImprovement: Number, // 效率提升（%）
    safetyImprovement: Boolean, // 是否提高安全性
    qualityImprovement: Boolean // 是否提高质量
  },
  scoring: { // 新增打分信息
    score: {
      type: Number,
      min: 0,
      max: 10 // Update max score
    },
    scorer: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    scorerRole: String, // 记录评分人角色
    scoredAt: Date,
    history: [{ // 评分历史记录
      score: {
        type: Number,
        min: 0,
        max: 10 // Update max score
      },
      scorer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      scorerRole: String,
      scoredAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: { virtuals: true }, // 确保虚拟属性被包含在 toJSON 输出中
  toObject: { virtuals: true } // 确保虚拟属性被包含在 toObject 输出中
});

// 添加索引以优化查询
SuggestionSchema.index({ submitter: 1 });
SuggestionSchema.index({ reviewStatus: 1 });
SuggestionSchema.index({ implementationStatus: 1 });
SuggestionSchema.index({ type: 1 });
SuggestionSchema.index({ team: 1 });
SuggestionSchema.index({ createdAt: -1 });

// 添加复合索引，支持常见查询模式
SuggestionSchema.index({ reviewStatus: 1, type: 1 });
SuggestionSchema.index({ submitter: 1, createdAt: -1 });
SuggestionSchema.index({ team: 1, reviewStatus: 1 });
SuggestionSchema.index({ 'implementation.status': 1, reviewStatus: 1 });
SuggestionSchema.index({ type: 1, createdAt: -1 });

// 添加嵌套字段索引
SuggestionSchema.index({ 'implementation.status': 1 });
SuggestionSchema.index({ 'implementation.responsiblePerson': 1 });
SuggestionSchema.index({ 'implementation.status': 1, 'implementation.responsiblePerson': 1 });
SuggestionSchema.index({ 'scoring.score': 1 });

// 添加保存前钩子确保数据一致性
SuggestionSchema.pre('save', function(next) {
  // 同步实施状态
  if (this.implementation && this.implementation.status) {
    this.implementationStatus = this.implementation.status;
  }
  
  // 检查并确保历史记录包含最新状态
  if (this.isModified('implementation.status') && this.implementation && this.implementation.status) {
    // 检查最新历史记录是否与当前状态匹配
    const history = this.implementation.history || [];
    const latestStatus = history.length > 0 ? history[history.length - 1].status : null;
    
    // 如果没有历史记录或最新历史状态与当前状态不匹配，添加新历史记录
    if (latestStatus !== this.implementation.status) {
      if (!this.implementation.history) {
        this.implementation.history = [];
      }
      
      this.implementation.history.push({
        status: this.implementation.status,
        date: new Date(),
        notes: '系统自动同步状态'
      });
    }
  }
  
  next();
});

// 添加虚拟属性，用于获取类型的中文名称
SuggestionSchema.virtual('typeName').get(function() {
  return SUGGESTION_TYPES[this.type] || '未知类型';
});

// 添加虚拟属性，用于获取审核状态的中文名称
SuggestionSchema.virtual('reviewStatusName').get(function() {
  return REVIEW_STATUS[this.reviewStatus] || '未知状态';
});

// 添加虚拟属性，用于获取实施状态的中文名称
SuggestionSchema.virtual('implementationStatusName').get(function() {
  // 优先使用内嵌文档的状态，其次使用顶层状态
  const status = this.implementation?.status || this.implementationStatus || 'NOT_STARTED';
  return IMPLEMENTATION_STATUS[status] || '未知状态';
});


// 确保在导出之前定义模型
const Suggestion = mongoose.model('Suggestion', SuggestionSchema);

module.exports = {
  Suggestion,
  // 不再需要单独导出这些常量，因为它们应从 client/src/constants/suggestions 导入
  // SUGGESTION_TYPES,
  // SUGGESTION_CATEGORIES,
  // REVIEW_STATUS,
  // IMPLEMENTATION_STATUS
}; 