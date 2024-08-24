import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../models/friend-request';


// create request
export async function createRequest (req : Request, res : Response) {
    try {
        // verifies that both associated users have valid ids
        if (!mongoose.Types.ObjectId.isValid(req.body.from) || !mongoose.Types.ObjectId.isValid(req.body.to)) {
            return res.status(400).json({ error: 'Requests can only be made between valid users', reload: true });
        }

        // checks if request exists with count
        const count = await FriendRequest.countDocuments({
            from: {$in: [req.body.from, req.body.to]},
            to: {$in: [req.body.from, req.body.to]}
        });
        
        // returns error if request exists
        if (count) return res.status(409).json({ error: 'Duplicate request', reload: true });
        
        // creates a request if none exists
        else await FriendRequest.create(req.body);

        res.redirect('/users/me');
    } catch (error) {
        res.status(500).send('An error occurred while creating the friend request');
    }
}

// update request
export async function handleRequest (req : Request, res : Response) {
    try {
        // search by request id and userId to ensure request exists and the logged in user is authorized to make decision
        const foundRequest = await FriendRequest.findOne({ _id: req.body.requestId, to: req.session.userId });
        // else return error
        if (!foundRequest) return res.status(404).json({ error: 'Friend request not found', reload: true });

        // if user accepts, update status and save
        if (req.body.decision === 'Accept') {
            foundRequest.status = 'accepted';
            await foundRequest.save();
        }
        // if user decline, delete request
        else if (req.body.decision === 'Decline') await FriendRequest.findByIdAndDelete(foundRequest._id);
        else return res.status(400).json({ error: 'Invalid decision for status update', reload: true });
        
        res.redirect('/users/me');
    } catch (error) {
        res.status(500).send('An error occurred while updating the friend request');
    }
}