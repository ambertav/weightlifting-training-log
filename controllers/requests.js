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
            foundRequest.status = 'accepted'
            foundRequest.save().then(function () {
                res.redirect('/users/me')
            });
        } else {
            Request.findByIdAndDelete(foundRequest._id, function (error, deletedRequest) {
                res.redirect('/users/me');
            });
        }
    });
});


module.exports = router;