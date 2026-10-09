import express from 'express';
import { generateMessage } from '../controllers/genai.js';

const route = express.Router();

route.post('/sent-message', generateMessage);

export default route;