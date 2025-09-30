import express from 'express';
import { supabase } from '../config/supabase.js';
const router = express.Router();

if (!process.env.SUPABASE_URL) {
  console.error('SUPABASE_URL is not set!');
}

// Get all courses
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('courses').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get all courses for a given major
router.get('/:major', async (req, res) => {
  const { major } = req.params;
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('major', major);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
