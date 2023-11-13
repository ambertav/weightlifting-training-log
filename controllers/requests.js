const Request = require('../models/request');


// create request
async function createRequest (req, res) {
    try {
        // checks if request exists
        const request = await Request.findOne({
            from: {$in: [req.body.from, req.body.to]},
            to: {$in: [req.body.from, req.body.to]}
        })
        .lean();
        
        // creates a request if none exists
        if (!request) await Request.create(req.body);

        res.redirect('/users/me');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the friend request.');
    }
}

// update request
async function handleRequest (req, res) {
    try {
        const foundRequest = await Request.findById(req.body.requestId)
        if (!foundRequest) return res.status(404).send('Friend request not found.');

        // if user accepts, update status and save
        if (req.body.decision === 'Accept') {
            foundRequest.status = 'accepted';
            await foundRequest.save();
        }

        // if user declined, delete request
        else await Request.findByIdAndDelete(foundRequest._id);
        
        res.redirect('/users/me')
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the friend request.')
    }
}


module.exports = { createRequest, handleRequest }