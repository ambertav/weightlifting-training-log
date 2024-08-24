import mongoose from 'mongoose';
import { UserDocument } from './user';


const friendRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
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

export interface FriendRequestDocument extends mongoose.Document {
    from : mongoose.Types.ObjectId | UserDocument;
    to : mongoose.Types.ObjectId | UserDocument;
    status : 'pending' | 'accepted';
}


export default mongoose.model <FriendRequestDocument> ('FriendRequest', friendRequestSchema);