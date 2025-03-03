import { Hono } from 'hono';
import { wallet } from '../handlers';
import { protect } from '../middleware';

const walletRoutes = new Hono();

walletRoutes.get('detail',protect,(c)=> wallet.userWallet(c))
walletRoutes.put('/update',protect,(c)=> wallet.updateWalletBalanceByAdmin(c))
walletRoutes.get('/balance',protect, (c) => wallet.userBalance(c)); 
walletRoutes.get('/balances',protect, (c) => wallet.totalUserBalance(c)); 

export default walletRoutes;
