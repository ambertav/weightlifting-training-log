const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const movementSchema = new Schema({
    name: {
        type: String,
        required: true,
        maxLength: 30,
        trim: true
    },
    description: {
        type: String,
        maxLength: 100,
        default: '',
        trim: true
    },
    musclesWorked: {
        type: Array,
        required: true
    },
    isCardio: {
        type: Boolean,
        required: true
    },
    isWeighted: {
        type: Boolean,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Movement', movementSchema);