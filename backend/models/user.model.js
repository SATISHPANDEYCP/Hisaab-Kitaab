import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpiry: {
        type: Date
    },
    income: {
        type: Number,
        default: 0
    },
    monthlyBudget: {
        type: Number,
        default: 0
    }
},
    { timestamps: true }
);

userSchema.index(
    { email: 1 },
    { name: 'user_email_unique', unique: true }
);

userSchema.index(
    { mobile: 1 },
    { name: 'user_mobile_unique', unique: true }
);

const User = mongoose.model('User', userSchema);

export default User;