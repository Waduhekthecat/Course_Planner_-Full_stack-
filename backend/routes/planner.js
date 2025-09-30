import express from 'express';
import { supabase } from '../config/supabase.js';
const router = express.Router();

// Helper function to parse time slots
const parseTimeSlot = (timeSlot) => {
  if (!timeSlot) return null;
  
  const [days, time] = timeSlot.split(' ');
  const [startTime, endTime] = time.split('-');
  
  return {
    days: days.split(''), // e.g., "MWF" -> ['M', 'W', 'F']
    startTime,
    endTime
  };
};

// Helper function to check if two courses have time conflicts
const hasTimeConflict = (course1, course2) => {
  const time1 = parseTimeSlot(course1.time_slot);
  const time2 = parseTimeSlot(course2.time_slot);
  
  if (!time1 || !time2) return false;
  
  // Check if they share any days
  const sharedDays = time1.days.some(day => time2.days.includes(day));
  if (!sharedDays) return false;
  
  // Check if times overlap
  return time1.startTime === time2.startTime || 
         (time1.startTime < time2.endTime && time1.endTime > time2.startTime);
};

// Helper function to distribute courses across 8 semesters
const scheduleCourses = (courses) => {
  const semesters = Array.from({ length: 8 }, () => ({
    courses: [],
    totalCredits: 0
  }));
  
  const TARGET_CREDITS = 15; // Target credits per semester
  const MAX_CREDITS = 18;    // Max credits per semester
  
  // Sort courses by credits (larger courses first for better distribution)
  const sortedCourses = [...courses].sort((a, b) => b.credits - a.credits);
  
  sortedCourses.forEach(course => {
    // Find the best semester for this course
    let bestSemester = 0;
    let minCredits = Infinity;
    
    for (let i = 0; i < 8; i++) {
      const semester = semesters[i];
      
      // Skip if adding this course would exceed max credits
      if (semester.totalCredits + course.credits > MAX_CREDITS) continue;
      
      // Check for time conflicts with existing courses in this semester
      const hasConflict = semester.courses.some(existingCourse => 
        hasTimeConflict(course, existingCourse)
      );
      
      if (hasConflict) continue;
      
      // Prefer semesters closer to target credits
      const creditsAfterAdding = semester.totalCredits + course.credits;
      const distanceFromTarget = Math.abs(creditsAfterAdding - TARGET_CREDITS);
      
      if (semester.totalCredits < minCredits && distanceFromTarget < Math.abs(minCredits - TARGET_CREDITS)) {
        minCredits = semester.totalCredits;
        bestSemester = i;
      }
    }
    
    // Add course to the best semester
    semesters[bestSemester].courses.push(course);
    semesters[bestSemester].totalCredits += course.credits;
  });
  
  return semesters;
};

// Generate 8-semester plan
router.post('/', async (req, res) => {
  try {
    const { major } = req.body;
    
    // Validate input
    if (!major) {
      return res.status(400).json({ 
        success: false,
        error: 'Major is required' 
      });
    }
    
    // Fetch required courses for major from degree_requirements table
    const { data: courses, error } = await supabase
      .from('degree_requirements')
      .select('*')
      .eq('degree_name', major);
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch degree requirements' 
      });
    }
    
    // Check if major exists
    if (!courses || courses.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: `No degree requirements found for major: ${major}` 
      });
    }
    
    // Schedule courses across 8 semesters
    const scheduledSemesters = scheduleCourses(courses);
    
    // Calculate total credits
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    
    // Format response for frontend
    const degreePlan = scheduledSemesters.map((semester, index) => ({
      semesterNumber: index + 1,
      semesterName: `Semester ${index + 1}`,
      courses: semester.courses.map(course => ({
        courseId: course.course_id,
        courseName: course.course_name,
        credits: course.credits,
        professor: course.professor,
        timeSlot: course.time_slot
      })),
      totalCredits: semester.totalCredits
    }));
    
    // Send success response
    res.json({
      success: true,
      data: {
        major,
        totalCredits,
        totalCourses: courses.length,
        degreePlan
      }
    });
    
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get available majors
router.get('/majors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('degree_requirements')
      .select('degree_name')
      .order('degree_name');
    
    if (error) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch majors' 
      });
    }
    
    // Get unique majors
    const uniqueMajors = [...new Set(data.map(row => row.degree_name))];
    
    res.json({
      success: true,
      data: uniqueMajors
    });
    
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

export default router;