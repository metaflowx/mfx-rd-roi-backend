import { Hono } from 'hono';
import { referral } from '../handlers';
import { protect, isAdmin } from '../middleware';

const referralRoutes = new Hono();

// referralRoutes.post('/add', protect, (c) => referral.addReferral(c)); // Add a new referral (when a user is referred)
referralRoutes.get('/stats', protect, (c) => referral.getReferralStats(c)); // Get referral stats for the logged-in user
referralRoutes.get('/earnings', protect, (c) => referral.getReferralEarnings(c)); // Get total referral earnings
referralRoutes.get('/history', protect, (c) => referral.getReferralHistory(c)); // Get referral earnings history
referralRoutes.put('/disableReferral/:id', protect, isAdmin, (c) => referral.disableReferral(c)); 
referralRoutes.get('/ReferralListHistory', protect, isAdmin, (c) => referral.ReferralListHistory(c)); 

export default referralRoutes;
