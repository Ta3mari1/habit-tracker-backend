const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Habit name is required'],
        trim: true,
        maxlength: [100, 'Habit name cannot exceed 100 characters']
    },
    category: {
        type: String,
        enum: ['health', 'learning', 'productivity', 'social'],
        default: 'health'
    },
    streak: {
        type: Number,
        default: 0,
        min: 0
    },
    bestStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    completedDates: [{
        type: Date
    }],
    totalCompletions: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

habitSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Habit', habitSchema);