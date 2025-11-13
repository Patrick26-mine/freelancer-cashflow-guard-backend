import express from 'express';
import { getSummary, getActivity } from '../../controllers/dashboardController.js';

const router = express.Router();

router.get('/summary', getSummary);
router.get('/activity', getActivity);

export default router;
