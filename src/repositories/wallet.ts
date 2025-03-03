import walletModel, { IWallet } from "../models/walletModel";
import { getAssetPriceInUSD } from "../services/assetPriceFromCoingecko";
import assetsModel, { IAsset } from "../models/assetsModel";
import { formatUnits, parseUnits } from "viem";
import mongoose, { ClientSession, Schema, Types } from "mongoose";

/// Function to update wallet balance with transactions
export const updateWalletBalance = async (
  userId: Types.ObjectId,
  assetId: Types.ObjectId,
  balanceChange: string // Positive for deposit, negative for withdrawal
) => {
  try {
    // Find the wallet and the specific asset
    
    const wallet = await walletModel.findOne({ userId: userId}).populate('assets.assetId')
    if (!wallet) {
      throw new Error('Wallet not found for the user. This should not happen!');
    }

    /// If the asset exists, update its balance
    const asset = wallet.assets.find((asset) => asset.assetId.equals(assetId));
    if (asset) {
      const currentBalance = Number(asset.balance);
      const change = Number(balanceChange);
      asset.balance = (currentBalance + change).toString();
      await wallet.save(); // Save the updated wallet within the transaction
    } else {
      /// If the asset does not exist, add it to the wallet
      await walletModel.updateOne(
        { userId: userId },
        {
          $push: {
            assets: {
              assetId: assetId,
              balance: balanceChange, // Initial balance
              lock: "0", // Default lock value
            },
          },
        },
      );
    }
    console.log('Wallet balance updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    throw error; // Throw error to trigger transaction rollback
  }
};


export const getUserBalance = async (
  userId: string,
  assetId: Types.ObjectId
) => {
  try {
    const wallet = await walletModel.findOne({ userId: userId }).populate('assets.assetId');

    if (!wallet) {
      return 'Wallet not found';
    }

    const asset = wallet.assets.find((asset) => asset.assetId.equals(assetId));

    if (!asset) {
      return 'Asset not found in wallet';
    }
    const assetData = await assetsModel.findOne({ _id: asset.assetId }) as IAsset;
    const assetPriceInUSD = await getAssetPriceInUSD(assetData.coinGeckoId);

    /// Convert balance and lock to USD
    let balanceInUSD = Number(formatUnits(BigInt(asset.balance), assetData.decimals)) * Number(assetPriceInUSD)
    let lockInUSD = Number(formatUnits(BigInt(asset.lock), assetData.decimals)) * Number(assetPriceInUSD)

    balanceInUSD = Number(parseUnits(balanceInUSD.toString(), assetData.decimals))
    lockInUSD = Number(parseUnits(lockInUSD.toString(), assetData.decimals))

    return {
      balance: asset.balance,
      lock: asset.lock,
      balanceInUSD: balanceInUSD,
      lockInUSD: lockInUSD,
    };
  } catch (error) {
    console.error('Error fetching balance and lock:', error);
  }
}


/// Function to get user balance with total in USD
export const getTotalUserBalance = async (userId: string) => {
  try {
    const wallet = await walletModel.findOne({ userId }).populate('assets.assetId').select("-encryptedSymmetricKey -encryptedPrivateKey -salt");

    if (!wallet) {
      return 'Wallet not found';
    }

    let totalBalanceInWeiUsd = 0;
    let totalLockInWeiUsd = 0;

    for (const asset of wallet.assets) {
      const assetData = await assetsModel.findOne({ _id: asset.assetId }) as IAsset;

      const assetPriceInUSD = await getAssetPriceInUSD(assetData.coinGeckoId);

      /// Convert balance and lock to USD

      const balanceInUSD = Number(formatUnits(BigInt(asset.balance), assetData.decimals)) * Number(assetPriceInUSD)
      const lockInUSD = Number(formatUnits(BigInt(asset.lock), assetData.decimals)) * Number(assetPriceInUSD)

      totalBalanceInWeiUsd += Number(parseUnits(balanceInUSD.toString(), assetData.decimals));
      totalLockInWeiUsd += Number(parseUnits(lockInUSD.toString(), assetData.decimals));
    }

    return {
      wallet,
      totalBalanceInWeiUsd: totalBalanceInWeiUsd.toString(),
      totalLockInWeiUsd: totalLockInWeiUsd.toString(),
    };
  } catch (error) {
    console.error('Error fetching user balance:', error)
  }
}

