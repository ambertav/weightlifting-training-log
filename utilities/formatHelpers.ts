import { MovementDocument } from '../models/movement';
import { ExerciseDocument } from '../models/workout';
import { muscleGroups } from './constants';

// TEMPORARY TYPES
interface ExerciseData {
    movement : string[];
    weight : string[];
    sets : string[];
    reps : string[];
    distance : string[];
    minutes : string[];
    caloriesBurned : string[];
    [key: string] : string[];
}

interface MovementData {
    name : string;
    description : string;
    musclesWorked : {
        string : 'on'
    };
    type : 'cardio' | 'weighted';
}

// formatting the exercise array for create and update routes
export function formatWorkoutExercise (exercise : ExerciseData) {
    const exerciseObjects = [];
    const properties = ['movement', 'weight', 'sets', 'reps', 'distance', 'minutes', 'caloriesBurned']; // all possible properties

    // iterating through indices of 'movement' array to get access to indices of values in each key
    for (let i = 0; i < exercise.movement.length; i++) {
        const exerciseObject : any = {};
        // iterating through properties to process values
        for (const prop of properties) {
            const value = exercise[prop][i];
            if (value !== '') exerciseObject[prop] = value; // only saving values if not empty string as to not have null keys in database
        }
        exerciseObjects.push(exerciseObject); // adding each formatted exercise to array
    }
    return exerciseObjects;
}

// format the movement data from req.body
export function formatMovementData (movementData : MovementData, userId : string) {
    let selectedMuscles : string[] = [];

    if (movementData.type === 'weighted') 
        selectedMuscles = Object.keys(movementData.musclesWorked).filter(function (key) {
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

export function formatFavoriteExercise (exercise : ExerciseDocument, movement : MovementDocument) {
    const exerciseObj : any = {
        movement: movement._id
    }

    const keysByType = {
        weighted: ['weight', 'sets', 'reps'],
        cardio: ['distance', 'minutes', 'caloriesBurned']
    }

    // determines what keys the object will have based on type of movement
    const keys = keysByType[movement.type]

    for (const key of keys) {
        if (exercise[key as keyof ExerciseDocument] !== undefined) exerciseObj[key] = exercise[key as keyof ExerciseDocument];
    }

    return exerciseObj;
}

export function formatExerciseStats (volumePerMovement : any) {
    const musclePercent : any = {};

    let totalVolume = 0;
    let totalMinutes = 0;
    let totalCalories = 0;
  
    for (const movement of volumePerMovement) {
        totalVolume += movement.volume;
        totalMinutes += movement.minutes;
        totalCalories += movement.calories;

        // assuming that each muscle worked within a movement is worked equally:
        // divide movement volume by amount of muscles to get volume per muscle in each movement
        for (const muscle of movement.musclesWorked) {
            musclePercent[muscle] = (musclePercent[muscle] || 0) + (movement.volume / movement.musclesWorked.length);
        }
    }
  
    // convert volume per muscle in each movement to percentage per muscle of total volume
    for (const muscle in musclePercent) {
        musclePercent[muscle] = +(musclePercent[muscle] / totalVolume * 100).toFixed(1);
    }

    // store total minutes and calories burned
    const cardioStats = {
        totalMinutes,
        totalCalories
    }
  
    return {
        musclePercent,
        cardioStats
    };
}