const Movement = require('../models/movement');

const { formatMovementData } = require('../utilities/formatHelpers');
const { muscleGroups } = require('../utilities/constants');

// index
async function getMovements (req, res) {
    try {
        const pageSize = 8;
        const page = req.query.page || 1;
        const typeFilter = req.query.typeFilter;
        const muscleFilter = req.query.muscle ? req.query.muscle.split(',') : [];

        // creates filtering parameters
        const filter = {}
        if (typeFilter === 'cardio') {
            filter.type = 'cardio';
        }
        else if (typeFilter === 'weighted') {
            filter.type = 'weighted';
            if (req.query.muscle) filter.musclesWorked = { $all: req.query.muscle };
        }

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
            typeFilter,
            muscleFilter,
            currentPage: page,
            totalPages
        });

    } catch (error) {
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

        if (!deletedMovement) return res.status(404).json({ error: 'Movement not found', reload: true });

        await deletedMovement.remove();

        res.redirect('/movements');
    } catch (error) {
        res.status(500).send('An error occurred while deleting the movement.');
    }
}

// update
async function updateMovement (req, res) {
    try {
        if (!req.body.name || !req.body.type) {
            return res.status(400).json({ error: 'Invalid input', reload: true });
        }

         // req.body in format of musclesWorked: { muscle: 'on', muscle: 'on' }, must reformat before creating instance
        const editMovement = formatMovementData(req.body, req.session.userId); // format req.body per schema

        const movement = await Movement.findOne({
            createdBy: req.session.userId,
            _id: req.params.id
        });

        if (!movement) return res.status(404).json({ error: 'Movement not found '});

        // apply updates and save 
            // works to use validation on pre save  
        Object.assign(movement, editMovement);
        await movement.save();

        res.redirect('/movements');

    } catch (error) {
        res.status(500).send('An error occurred while updating the movement.');
    }
}

// create
async function createMovement (req, res) {
    try {
        if (!req.body.name || !req.body.type) {
            return res.status(400).json({ error: 'Invalid input', reload: true });
        }

        // req.body in format of musclesWorked: { muscle: 'on', muscle: 'on' }, must reformat before creating instance
        const newMovement = formatMovementData(req.body, req.session.userId); // format req.body per schema

        const createdMovement = await Movement.create(newMovement);
        return res.redirect('/movements');

    } catch (error) {
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
        res.status(500).send('An error occurred while fetching the movement.');
    }
}


module.exports = { getMovements, newMovementView, deleteMovement, updateMovement, createMovement, editMovementView }