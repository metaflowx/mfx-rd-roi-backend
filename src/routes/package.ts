import { Hono } from 'hono';
import { packageModel } from '../handlers';
import { isAdmin, protect } from '../middleware';

const packageRoutes = new Hono();

packageRoutes.post('/add', protect, isAdmin, (c) => packageModel.addPacakge(c)); // Add Package (Admin Only)
packageRoutes.put('/edit/:id', protect, isAdmin, (c) => packageModel.editPacakge(c)); // Edit Package (Admin Only)
packageRoutes.delete('/delete/:id', protect, isAdmin, (c) => packageModel.deletePacakge(c)); // Delete Package (Admin Only)
packageRoutes.get('/all', (c) => packageModel.getPacakges(c)); // Public - Get All Packages
packageRoutes.get('/:id', (c) => packageModel.getPackageById(c));

packageRoutes.post('/buyPacakgePlan', protect, (c) => packageModel.buyPacakgePlan(c));

export default packageRoutes;
