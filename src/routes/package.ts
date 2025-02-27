import { Hono } from 'hono';
import { packageModel } from '../handlers';
import { isAdmin, protect } from '../middleware';

const packageRoutes = new Hono();

packageRoutes.post('/add', protect, isAdmin, (c) => packageModel.addPackage(c)); // Add Package (Admin Only)
packageRoutes.put('/edit/:id', protect, isAdmin, (c) => packageModel.editPackage(c)); // Edit Package (Admin Only)
packageRoutes.delete('/delete/:id', protect, isAdmin, (c) => packageModel.deletePackage(c)); // Delete Package (Admin Only)
packageRoutes.get('/all', (c) => packageModel.getPackages(c)); // Public - Get All Packages
packageRoutes.get('/:id', (c) => packageModel.getPackageById(c));

packageRoutes.post('/buyPacakgePlan', protect, (c) => packageModel.buyPackagePlan(c));

export default packageRoutes;
