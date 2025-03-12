import UserModel from '../models/userModel';
import WalletModel from '../models/walletModel';
import ReferralEarnings from '../models/referralModel';
import { Context } from 'hono';
import { generateJwtToken, comparePassword  , generateUniqueReferralCode} from '../utils/index';
import { addReferral } from '../repositories/referral'; // Import the function
import { generateRandomWallet } from '../services';
import { accessTokenPublicKey, hybridEncrypt } from '../utils/cryptography';
import { calculateInvestmentStats } from '../repositories/investment';
import InvestmentModel from '../models/investmentModel';



// Create User
export const createUser = async (c: Context) => {
    try {
        const { email, mobileNumber, password,confirmPassword, referralCode } = await c.req.json();

        // Ensure either email or mobile number is provided
        if (!password || !confirmPassword) {
            return c.json({ message: 'Password or Confirm Password is required' }, 400);
        }

        // Ensure passwords match
        if (password !== confirmPassword) {
            return c.json({ message: 'Passwords do not match' }, 400);
        }
        if (!referralCode) {
            return c.json({ message: 'referralCode is required' }, 400);
        }
        if (!email && !mobileNumber) {
            return c.json({ message: 'Either email or mobile number is required' }, 400);
        }

        // Build dynamic query to avoid matching null/undefined values
        const query: any = {};
        if (email) query.email = email;
        if (mobileNumber) query.mobileNumber = mobileNumber;

        // Check if user already exists
        const existingUser = await UserModel.findOne(query);
        if (existingUser) {
            return c.json({ message: 'User already exists' }, 400);
        }
        
        const hashPassword = await Bun.password.hash(password,"bcrypt")
     
        const data = await UserModel.create({
            email:email,
            mobileNumber: mobileNumber,
            password: hashPassword
        })
        if(!data._id){
            return c.json({
                message: 'something went wrong'
            })
        }

        const { address, privateKey } = generateRandomWallet()

        const { encryptedSymmetricKey, encryptedData, salt } = hybridEncrypt(accessTokenPublicKey, privateKey, data._id.toString());

        await WalletModel.create({
            userId: data._id,
            address: address,
            encryptedSymmetricKey: encryptedSymmetricKey,
            encryptedPrivateKey: encryptedData,
            salt: salt,
        })

        /// Directly call addReferral function
        if (referralCode) {
            let referData = await ReferralEarnings.findOne({ referralCode: referralCode });

            if(!referData){
                return c.json({
                    message: 'something went wrong'
                })
            }
            const newReferralCode = await generateUniqueReferralCode();
            if (!newReferralCode) {
                throw new Error("Referral code cannot be null");
            }
            const referralContext = { userId: data._id, referrerBy: referData.userId, referralCode: newReferralCode };
            await addReferral(referralContext);
        }
        
        /// Generate JWT Token
        const token = await generateJwtToken(data._id.toString());

        return c.json({ message: 'User created successfully', user: data, token}, 200);
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};


export const loginUser = async (c: Context) => {
    try {
      const { email, mobileNumber, password } = await c.req.json();

        // Ensure email or mobile number is provided
        if (!email && !mobileNumber) {
            return c.json({ message: 'Either email or mobile number is required' }, 400);
        }

        // Build query dynamically based on provided login credential
        const query: any = {};
        if (email) query.email = email;
        if (mobileNumber) query.mobileNumber = mobileNumber;

        // Find user by email or mobile number
        const user = await UserModel.findOne(query);
        if (!user) {
            return c.json({ message: 'Invalid email or mobile number' }, 401);
        }  

       // Compare password
        const isPasswordValid =  comparePassword(password, user.password);
        if (!isPasswordValid) {
            return c.json({ message: 'Invalid password' }, 401);
        }
      
        if(!user._id){
            return c.json({
                message: 'something went wrong'
            })
        }
  
        const token =await generateJwtToken(user._id.toString());
        return c.json({ message: 'Login successful', token, user });
    } catch (error) {
      return c.json({ message: 'Server error', error }, 500);
    }
};

// Get All Users
// export const getAllUsers = async (c: Context) => {
//     try {
//         const users = await UserModel.find();

//         return c.json(users);
//     } catch (error) {
//         return c.json({ message: 'Server error', error }, 500);
//     }
// };


// Get All Users with Wallets and Decrypt Private Key
export const getAllUsers = async (c: Context) => {
    try {
        const { status, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = c.req.query();
        const page_ = parseInt(page) || 1;
        const limit_ = parseInt(limit) || 10;
        const skip = (page_ - 1) * limit_;
        const filter: any = { role: "USER" };

        const usersWithWallets = await UserModel.aggregate([
            { $match: filter },
            { $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } },
            { $skip: skip },
            { $limit: limit_ },
        ]);
        const usersWithInvestments = await Promise.all(
            usersWithWallets.map(async (user) => {

                const wallets = await WalletModel.findOne({ userId: user._id }).select("address");                
                const packageData = await InvestmentModel.findOne(
                    { userId: user._id },
                    {
                        buyPackagesDetails: {
                            $filter: {
                                input: "$buyPackagesDetails",
                                as: "package",
                                cond: status ? { $eq: ["$$package.status", status] } : true
                            }
                        }
                    }
                ).populate('buyPackagesDetails.packageId');
                if (!packageData || packageData.buyPackagesDetails.length === 0) {
                    return {
                        ...user,
                        wallets,
                        stats: null 
                    };
                }        
                const stats = calculateInvestmentStats(packageData);
        
                return {
                    ...user,
                    wallets,
                    stats 
                };
            })
        );
        const total = await UserModel.countDocuments(filter);
        
        return c.json({
            message: "users fetching done",
            page: page_,
            limit: limit_,
            total,
            totalPages: Math.ceil(total / limit_),
            data: usersWithInvestments,
        });
    } catch (error) {
        console.error(error);
        return c.json({ message: 'Server error', error }, 500);
    }
};

// Get User by ID
export const getUserById = async (c: Context) => {
    try {
        const userId = c.get('user'); // Get user ID from middleware
        if (!userId) {
            return c.json({ message: 'Unauthorized' }, 401);
        }
        const user = await UserModel.findById(userId).select('-password'); // Exclude password
        if (!user) return c.json({ message: 'User not found' }, 404);
        // Find referral code by userId
        const referral = await ReferralEarnings.findOne({ userId });
        const referralCode = referral ? referral.referralCode : null; // Assuming referral code field is "code"

        return c.json({ ...user.toObject(), referralCode });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

// update password 
export const updatePassword = async (c: Context) => {
    try {
        const userId = c.get('user'); // Extract user ID from middleware
        if (!userId) {
            return c.json({ message: 'Unauthorized' }, 401);
        }

        const { oldPassword, newPassword, confirmNewPassword } = await c.req.json();

        // Check if all required fields are provided
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return c.json({ message: 'All fields are required' }, 400);
        }

        // Ensure new passwords match
        if (newPassword !== confirmNewPassword) {
            return c.json({ message: 'New passwords do not match' }, 400);
        }

        // Fetch user from database
        const user = await UserModel.findById(userId);
        if (!user) {
            return c.json({ message: 'User not found' }, 404);
        }

        // Verify old password
        const isOldPasswordValid = await comparePassword(oldPassword, user.password);
        if (!isOldPasswordValid) {
            return c.json({ message: 'Incorrect old password' }, 401);
        }

        // Hash new password
        const hashedNewPassword = await Bun.password.hash(newPassword, "bcrypt");

        // Update password in database
        user.password = hashedNewPassword;
        await user.save();

        return c.json({ message: 'Password updated successfully' });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

// Delete User
export const deleteUser = async (c: Context) => {
    try {
        const userId = c.get('user'); // Get user ID from middleware
        if (!userId) {
            return c.json({ message: 'Unauthorized' }, 401);
        }
        const user = await UserModel.findByIdAndDelete(userId);
        if (!user) return c.json({ message: 'User not found' }, 404);

        return c.json({ message: 'User deleted successfully' });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};


// Change User Status
export const changeUserStatus = async (c: Context) => {
    try {

        // Extract userId from params
        const userId = c.req.param('id');
        if (!userId) {
            return c.json({ message: 'User ID is required' }, 400);
        }

        // Get new status from request body
        const { status } = await c.req.json();
        const validStatuses = ['ACTIVE', 'DELETE', 'INACTIVE', 'BLOCK', 'FREEZE'];

        if (!validStatuses.includes(status)) {
            return c.json({ message: 'Invalid status' }, 400);
        }

        // Update user status
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
        );

        if (!updatedUser) {
            return c.json({ message: 'User not found' }, 404);
        }

        return c.json({ message: 'User status updated successfully'});
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};
