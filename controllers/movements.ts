import { Request, Response } from 'express';
import Movement from '../models/movement';

import { formatMovementData } from '../utilities/formatHelpers';
import { muscleGroups } from '../utilities/constants';


// TEMPORARY TYPE
interface MovementFilter {
    type? : 'cardio' | 'weighted';
    musclesWorked? : any;
}

// index
export async function getMovements (req : Request, res : Response) {
    try {
        const pageSize = 8;
        const page : number = Number(req.query.page) || 1;
        const typeFilter = req.query.typeFilter;
        const muscleFilter = req.query.muscle && typeof req.query.muscle === 'string' ? req.query.muscle.split(',') : [];

        // creates filtering parameters
        const filter : MovementFilter = {}
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
export function newMovementView (req : Request, res : Response) {
    res.render('movement/new.ejs', {
        muscleGroups,
    });
}

// delete
export async function deleteMovement (req : Request, res : Response) {
    try {
        const deletedMovement = await Movement.findOne({
            createdBy: req.session.userId,
            _id: req.params.id
        });

        if (!deletedMovement) return res.status(404).json({ error: 'Movement not found', reload: true });

        await deletedMovement.deleteOne();

        res.redirect('/movements');
    } catch (error) {
        res.status(500).send('An error occurred while deleting the movement.');
    }
}

// update
export async function updateMovement (req : Request, res : Response) {
    try {
        if (!req.body.name || !req.body.type) {
            return res.status(400).json({ error: 'Invalid input', reload: true });
        }

         // req.body in format of musclesWorked: { muscle: 'on', muscle: 'on' }, must reformat before creating instance
        const editMovement = formatMovementData(req.body, req.session.userId!); // format req.body per schema

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
export async function createMovement (req : Request, res : Response) {
    try {
        if (!req.body.name || !req.body.type) {
            return res.status(400).json({ error: 'Invalid input', reload: true });
        }

        // req.body in format of musclesWorked: { muscle: 'on', muscle: 'on' }, must reformat before creating instance
        const newMovement = formatMovementData(req.body, req.session.userId!); // format req.body per schema

        const createdMovement = await Movement.create(newMovement);
        return res.redirect('/movements');

    } catch (error) {
        res.status(500).send('An error occurred while creating the movement.');
    }
}

// edit
export async function editMovementView (req : Request, res : Response) {
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