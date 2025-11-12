import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import courseRoutes from './routes/courses.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/courses', courseRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Course Planner API is running!');
});

app.get('/test-departments', async (req, res) => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  const { data, error } = await supabase.from('Departments').select('*');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
