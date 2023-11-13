const mongoose = require('mongoose');


const favoriteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxLength: 30,
        trim: true
    },
    exercise: [{
        movement: {
            name: {
                type: String,
                required: true,
                maxLength: 30,
                trim: true
            },
            musclesWorked: {
                type: Array,
                required: true
            },
            type: {
                type: String,
                required: true
            },
        },
        weight: {
            type: Number,
            min: 0,
        },
        sets: {
            type: Number,
            min: 1,
        },
        reps: {
            type: Number,
            min: 1,
        },
        minutes: {
            type: Number,
            min: 1
        },
        caloriesBurned: {
            type: Number,
            min: 1
        },
    }],
    createdBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});


module.exports = mongoose.model('Favorite', favoriteSchema);