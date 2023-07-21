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


module.exports = router;