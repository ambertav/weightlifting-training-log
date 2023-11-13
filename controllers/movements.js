const Movement = require('../models/movement');


const muscleGroups = ['Deltoids', 'Triceps', 'Biceps', 'Forearms', 'Chest', 'Abdominals', 'Upper Back', 'Lower Back', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves'];
const pageSize = 12;

const formatHelpers = require('../utilities/formatHelpers');

// index
async function getMovements (req, res) {
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
}

// new
function newMovementView (req, res) {
    res.render('movement/new.ejs', {
        muscleGroups,
    });
}

// delete
async function deleteMovement (req, res) {
    try {
        const deletedMovement = await Movement.findOneAndDelete({
            createdBy: req.session.userId,
            _id: req.params.id
        });

        if (!deletedMovement) return res.status(404).send('Movement not found.');

        await deletedMovement.remove();

        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while deleting the movement.');
    }
}

// update
async function updateMovement (req, res) {
    try {
        const editMovement = formatHelpers.formatMovementData(req.body, req.session.userId); // format req.body per schema

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
}

// create
async function createMovement (req, res) {
    try {
        const newMovement = formatHelpers.formatMovementData(req.body, req.session.userId); // format req.body per schema

        const createdMovement = await Movement.create(newMovement);

        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the movement.');
    }
}

// edit
async function editMovementView (req, res) {
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
}


module.exports = {
    getMovements, newMovementView, deleteMovement, updateMovement, createMovement, editMovementView,
}