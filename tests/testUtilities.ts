import mongoose from 'mongoose';

export async function expectValidationError (Model : mongoose.Model<any>, data : any) : Promise<mongoose.Error.ValidationError> {
    let error : mongoose.Error.ValidationError | undefined;

    try {
        const instance = new Model(data);
        await instance.save();
    } catch (e) {
        if (e instanceof mongoose.Error.ValidationError) error = e;
    }

    if (error === undefined) throw new Error('Expected a validation error but none was thrown');

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    return error;
}
