const express = require('express');
const router = express.Router();
const Request = require('../models/request');
const User = require('../models/user');

// create request
router.post('/users/request', function (req, res) {
    Request.findOne({
        from: {$in: [req.body.from, req.body.to]},
        to: {$in: [req.body.from, req.body.to]}
    }, function (error, request) {
        if (!request) {
            Request.create(req.body, function (error, newRequest) {
                res.redirect('/users/me');
            });
        }
    });
});

// update request
router.put('/users/request/edit', function (req, res) {
    Request.findById(req.body.requestId, function (error, foundRequest) {
        if (req.body.decision === 'Accept') {
            User.find({
                _id: {$in: [foundRequest.from, foundRequest.to]}
            }, function (error, users) {
                    users[0].gymBuddies.push(users[1]._id)
                    users[1].gymBuddies.push(users[0]._id)
                    users[0].save().then(users[1].save());
            });
        }
        Request.findByIdAndDelete(foundRequest._id, function (error, deletedRequest) {
            res.redirect('/users/me');
        });
    });
});


module.exports = router;