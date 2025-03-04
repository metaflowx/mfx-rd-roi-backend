import { Context } from "hono";
import AssetsModel from "../models/assetsModel";
import WalletModel from "../models/walletModel";
import TransactionModel from "../models/transactionModel";
import UserModel from "../models/userModel";
import { comparePassword } from "../utils";
import transactionModel from "../models/transactionModel";
import { updateWalletBalance } from "../repositories/wallet";



export const txRequestForDeposit = async (c: Context) => {
    const { userId, assetId } = c.req.query();
    try {

        const asset = await AssetsModel.findById({ _id: assetId, depositEnabled: true });
        if (!asset) {
            return c.json({ message: 'Asset not allowed for deposit' }, 400);
        }

        const wallet = await WalletModel.findOne({ userId });
        if (!wallet) {
            return c.json({ message: 'Wallet not found' }, 404);
        }
        const tx = await transactionModel.create({
            userId: userId,
            assetId: assetId,
            txType: 'deposit',
        })
        return c.json({
            txId: tx._id,
            asset: asset,
            depositAddress: wallet.address,
        });
    } catch (error) {
        return c.json({ message: 'Error fetching deposit details', error }, 500);
    }
}

export const txConfirmRequestForDeposit = async (c: Context) => {
    const user = c.get('user');
    const { txId } = c.req.query();
    try {
        const txData = await transactionModel.findOne({
            $and: [
                { _id: txId },
                { userId: user._id },
                { txStatus: { $ne: 'completed' } },
            ]
        })
        if (!txData) {
            return c.json({ message: 'Transaction not found' }, 404);
        }
        console.log("lol");
        await transactionModel.updateOne({
            _id: txId
        }, { $set: { txStatus: "confirmed" } }, { new: true });

        return c.json({ message: 'Transaction confirmed' });

    } catch (e) {
        return c.json({ message: 'Error fetching transaction details', error: e }, 500);
    }
}

export const txRequestForWithdrawal = async (c: Context) => {
    const { assetId, withdrawalAddress, withdrawalAmount, password } = await c.req.json();
    const user = c.get('user');
    try {

        const asset = await AssetsModel.findById({ _id: assetId, withdrawalEnabled: true });
        if (!asset) {
            return c.json({ message: 'Asset not allowed for withdrawal' }, 400);
        }
        const data = await UserModel.findById({ _id: user._id })
        if (!data) {
            return c.json({ message: 'User not found' }, 404);
        }
        const isPasswordValid = comparePassword(password, data.password);
        if (!isPasswordValid) {
            return c.json({ message: 'Invalid password' }, 401);
        }
        const tx = await TransactionModel.create({
            userId: user._id,
            assetId: assetId,
            txType: 'withdrawal',
            receiverAddress: withdrawalAddress,
            amountInWei: withdrawalAmount,
        });
        return c.json({ message: 'Withdrawal request created successfully', data: tx }, 201);
    } catch (error) {
        return c.json({ message: 'Error fetching withdrawal details', error }, 500);
    }
}

export const getTransactionById = async (c: Context) => {
    const { txId } = c.req.param();
    try {
        const tx = await TransactionModel
            .findById(txId)
            .populate('userId', '-password')
            .populate('assetId');
        if (!tx) {
            return c.json({ message: 'Transaction not found' }, 404);
        }
        return c.json({ message: "Transaction fetching done", data: tx });
    } catch (error) {
        return c.json({ message: 'Error fetching transaction details', error }, 500);
    }
}

export const getTransactionList = async (c: Context) => {
    const user = c.get('user');

    const { txType, txStatus, settlementStatus, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = c.req.query();

    try {
        const filter: any = { userId: user._id };
        if (txType) filter.txType = txType;
        if (txStatus) filter.txStatus = txStatus;
        if (settlementStatus) filter.settlementStatus = settlementStatus;

        const page_ = parseInt(page) || 1;
        const limit_ = parseInt(limit) || 10;
        const skip = (page_ - 1) * limit_;

        const txs = await TransactionModel
            .find(filter)
            .populate('assetId')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit_);

        const total = await TransactionModel.countDocuments(filter);

        return c.json({
            message: "Transactions fetching done",
            page: page_,
            limit: limit_,
            total,
            totalPages: Math.ceil(total / limit_),
            data: txs,
        });
    } catch (error) {
        return c.json({ message: 'Error fetching transactions', error }, 500);
    }
}

export const updateTx = async (req: any, query?: any) => {
    try {

    } catch (error) {

    }
}

export const updateDepositTx = async (depositReq: any,balanceReq?:any, query?: any) => {
    try {

        /// Check if transaction exists
        const existingTx = await TransactionModel.findOne({ _id: query?.id });

        if (!existingTx) {
            console.error('Transaction does not exist. Skipping update.');
            return { success: false, message: 'Transaction not found' };
        }
        /// Update the transaction
        const updatedTx = await TransactionModel.findByIdAndUpdate(
            query.id,
            { $set: depositReq },
            { new: true, upsert: false }
        );

        if (!updatedTx) {
            return { success: false, message: 'Transaction update failed' };
        }

        console.log('Deposit Tx updated:', updatedTx);
        if(Number(balanceReq.amountInWei)>0){
            await updateWalletBalance(balanceReq.userId,balanceReq.assetId,balanceReq.amountInWei)
        }
        
        return { success: true, message: 'Transaction updated successfully', data: updatedTx };
    } catch (error) {
        console.error('Error in updateDepositTx:', error);
        return { success: false, message: 'Internal server error', error };
    }
};


export const updateWithdrawalTx = async (req: any) => {
    try {
        const withdrawalTx = await TransactionModel.findOne({ txType: 'withdrawal' });
        if (!withdrawalTx) return;
        const updatedTx = await TransactionModel
            .findByIdAndUpdate(withdrawalTx._id, { set: req }, { new: true });
        console.log('Withdrawal Tx updated:', updatedTx);
        return updatedTx

    } catch (error) {
        console.log({ error });
    }
}


