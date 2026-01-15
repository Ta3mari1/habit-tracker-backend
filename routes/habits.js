const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { habitValidation, handleValidationErrors } = require('../middleware/validation');

const checkAndAwardBadges = async (userId, habits) => {
    const user = await User.findById(userId);
    const badges = [];

    const has7DayStreak = habits.some(h => h.streak >= 7);
    if (has7DayStreak && !user.badges.some(b => b.badgeId === 'week_warrior')) {
        badges.push({ badgeId: 'week_warrior', name: '7-Day Warrior' });
    }

    const has30DayStreak = habits.some(h => h.streak >= 30);
    if (has30DayStreak && !user.badges.some(b => b.badgeId === 'month_master')) {
        badges.push({ badgeId: 'month_master', name: 'Month Master' });
    }

    if (habits.length >= 3 && !user.badges.some(b => b.badgeId === 'habit_collector')) {
        badges.push({ badgeId: 'habit_collector', name: 'Habit Collector' });
    }

    const totalCompletions = habits.reduce((sum, h) => sum + h.totalCompletions, 0);
    if (totalCompletions >= 50 && !user.badges.some(b => b.badgeId === 'dedication_champion')) {
        badges.push({ badgeId: 'dedication_champion', name: 'Dedication Champion' });
    }

    if (badges.length > 0) {
        user.badges.push(...badges);
        await user.save();
    }

    return badges;
};

const calculatePoints = (habits) => {
    let points = 0;
    habits.forEach(habit => {
        points += habit.streak * 10;
        points += habit.totalCompletions * 5;
    });
    return points;
};

router.get('/', protect, async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.user.id, isActive: true })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: habits.length,
            data: habits
        });
    } catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.post('/', protect, habitValidation, handleValidationErrors, async (req, res) => {
    try {
        const { name, category } = req.body;

        const habit = await Habit.create({
            userId: req.user.id,
            name,
            category: category || 'health'
        });

        const allHabits = await Habit.find({ userId: req.user.id, isActive: true });
        await checkAndAwardBadges(req.user.id, allHabits);

        res.status(201).json({
            success: true,
            data: habit
        });
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.put('/:id/toggle', protect, async (req, res) => {
    try {
        const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const completedToday = habit.completedDates.some(date => {
            const completionDate = new Date(date);
            completionDate.setHours(0, 0, 0, 0);
            return completionDate.getTime() === today.getTime();
        });

        if (completedToday) {
            habit.completedDates = habit.completedDates.filter(date => {
                const completionDate = new Date(date);
                completionDate.setHours(0, 0, 0, 0);
                return completionDate.getTime() !== today.getTime();
            });
            habit.totalCompletions = Math.max(0, habit.totalCompletions - 1);
            habit.streak = Math.max(0, habit.streak - 1);
        } else {
            habit.completedDates.push(today);
            habit.totalCompletions += 1;

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const completedYesterday = habit.completedDates.some(date => {
                const completionDate = new Date(date);
                completionDate.setHours(0, 0, 0, 0);
                return completionDate.getTime() === yesterday.getTime();
            });

            if (completedYesterday || habit.streak === 0) {
                habit.streak += 1;
            } else {
                habit.streak = 1;
            }

            if (habit.streak > habit.bestStreak) {
                habit.bestStreak = habit.streak;
            }
        }

        await habit.save();

        const allHabits = await Habit.find({ userId: req.user.id, isActive: true });
        const totalPoints = calculatePoints(allHabits);
        await User.findByIdAndUpdate(req.user.id, { totalPoints });

        const newBadges = await checkAndAwardBadges(req.user.id, allHabits);

        res.json({
            success: true,
            data: habit,
            newBadges
        });
    } catch (error) {
        console.error('Toggle habit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        habit.isActive = false;
        await habit.save();

        res.json({
            success: true,
            message: 'Habit deleted successfully'
        });
    } catch (error) {
        console.error('Delete habit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;