import { startSession, Types } from "mongoose";
import walletModel, { IWallet } from "../models/walletModel";
import { getAssetPriceInUSD } from "../services/assetPriceFromCoingecko";
import assetsModel, { IAsset } from "../models/assetsModel";
import { formatUnits } from "viem";
import { Context } from "hono";
import { getTotalUserBalance, getUserBalance, updateWalletBalance } from "../repositories/wallet";


export const userWallet = async (c: Context) => {
    const user = c.get("user")
    try {
        const data = await walletModel.findOne({ userId: user._id }).select("-encryptedSymmetricKey -encryptedPrivateKey -salt")
        return c.json({ message: "user wallet fetching...", data: data }, 200)
    } catch (error) {
        return c.json({ message: "Error fetching balance" }, 500)
    }
}

export const updateWalletBalanceByAdmin = async (c: Context) => {
    const { userId, assetId, balance } = await c.req.json()
    try {
        const data = await updateWalletBalance(userId, assetId, balance)
        if (data) {
            return c.json({ message: "Balance updated successfully" }, 200)
        }
        return c.json({ message: "Error updating balance" }, 500)
    } catch (error) {
        return c.json({ message: "Something went wrong" }, 500)
    }
}

export const userBalance = async (c: Context) => {
    const { assetId } = c.req.query()
    const user = c.get("user")
    try {
        const data = await getUserBalance(user._id, new Types.ObjectId(assetId))
        return c.json({ message: "Balance fetching...", data: data }, 200)
    } catch (error) {
        return c.json({ message: "Error fetching balance" }, 500)
    }
}

export const totalUserBalance = async (c: Context) => {
    const user = c.get("user")
    try {
        const data = await getTotalUserBalance(user._id)
        return c.json({ message: "Balance fetching...", data: data }, 200)
    } catch (error) {
        return c.json({ message: "Error fetching balance" }, 500)
    }
}
