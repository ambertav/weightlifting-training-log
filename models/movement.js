const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const movementSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: String,
    musclesWorked: Array,
    isCardio: Boolean,
    isWeighted: Boolean,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Movement', movementSchema);