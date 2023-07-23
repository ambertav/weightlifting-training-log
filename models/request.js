const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestSchema = new Schema({
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted'],
        default: 'pending'
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Request', requestSchema);