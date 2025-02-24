import { Hono } from 'hono';
import { investment } from '../handlers';

const investmentRoutes = new Hono();

investmentRoutes.get('/getActivePlan/:userId', (c) => investment.getActivePlanByuserId(c));

export default investmentRoutes;
