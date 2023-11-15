const mongoose = require('mongoose');

async function expectValidationError(Model, data) {
    let error;
    try {
        const instance = new Model(data);
        await instance.save();
    } catch (e) {
        error = e;
    }
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    return error;
}


module.exports = { expectValidationError }
