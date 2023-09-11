const express = require('express');
const router = express.Router();
const Movement = require('../models/movement');

const muscleGroups = ['Deltoids', 'Triceps', 'Biceps', 'Forearms', 'Chest', 'Abdominals', 'Upper Back', 'Lower Back', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves'];
const pageSize = 15;

// index
router.get('/movements', async function (req, res) {
    try {
        const page = req.query.page || 1;

        // creates filtering parameters
        const filter = {}
        if (req.query.muscle) filter.musclesWorked = { $all: req.query.muscle };

        // count of all the movements accessible by user
        const totalMovements = await Movement.countDocuments({
            $and: [
                filter,
                {
                    createdBy: { $in: [req.session.userId, null] }
                }
            ]
        });

        const totalPages = Math.ceil(totalMovements / pageSize);

        const movements = await Movement.find({
            $and: [
                filter,
                {
                    createdBy: { $in: [req.session.userId, null] }
                }
            ]
        })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean();

        res.render('movement/index.ejs', {
            movements,
            muscleGroups,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching movements.');
    }
});

// new
router.get('/movements/new', function (req, res) {
    res.render('movement/new.ejs', {
        muscleGroups,
    });
});

// delete
router.delete('/movements/:id', async function (req, res) {
    try {
        const deletedMovement = await Movement.findOneAndDelete({
            createdBy: req.session.userId,
            _id: req.params.id
        });

        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while deleting the movement.');
    }
});

// update
router.put('/movements/:id', async function (req, res) {
    try {
        const editMovement = formatMovementData(req.body, req.session.userId); // format req.body per schema

        const updatedMovement = await Movement.findOneAndUpdate({
            createdBy: req.session.userId,
            _id: req.params.id
        }, editMovement, {
            new: true
        });

        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the movement.');
    }
});

// create
router.post('/movements', async function (req, res) {
    try {
        const newMovement = formatMovementData(req.body, req.session.userId); // format req.body per schema

        const createdMovement = await Movement.create(newMovement);

        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the movement.');
    }
});

// edit
router.get('/movements/:id/edit', async function (req, res) {
    try {
        const foundMovement = await Movement.findById(req.params.id)
            .lean();
        res.render('movement/edit.ejs', {
            movement: foundMovement,
            muscleGroups
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching the movement.');
    }
});

// format the movement data from req.body
function formatMovementData(movementData, userId) {
    const selectedMuscles = Object.keys(movementData.musclesWorked).filter(function (key) {
        return muscleGroups.includes(key);
    });
    const musclesWorked = [...selectedMuscles];

    const type = movementData.type
    const createdBy = userId;

    return {
        ...movementData,
        musclesWorked,
        type,
        createdBy,
    };
}


module.exports = router;