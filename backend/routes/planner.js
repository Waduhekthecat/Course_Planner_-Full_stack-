import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Helper function to parse prerequisites
const parsePrerequisites = (prereqString) => {
  if (!prereqString || prereqString === 'NULL') return [];
  // Handle multiple prerequisites if needed (comma-separated)
  return prereqString.split(',').map(p => p.trim());
};

// Helper function to check if prerequisites are met
const prerequisitesMet = (course, completedCourses) => {
  const prereqs = parsePrerequisites(course.Prerequisites);
  if (prereqs.length === 0) return true;
  
  // Special case: "FINAL SEMESTER" courses go last
  if (prereqs.includes('FINAL SEMESTER')) return false;
  
  // Check if all prerequisites are in completed courses
  return prereqs.every(prereq => 
    completedCourses.some(completed => 
      `${completed.department_ID}${completed.course_id}` === prereq
    )
  );
};

// Helper function to format course for frontend
const formatCourse = (course) => ({
  code: `${course.department_ID}${course.course_id}`,
  name: course.title,
  credits: course.credits,
  type: 'Major' // We'll enhance this later with Core/Elective logic
});

// Generate 8-semester plan for CSCI major
router.post('/generate', async (req, res) => {
  try {
    const { major } = req.body;
    
    // For now, only support CSCI
    if (major !== '1') { // major ID '1' is Computer Science from frontend mock data
      return res.status(400).json({ 
        success: false,
        error: 'Only Computer Science major is currently supported' 
      });
    }
    
    // Fetch all CSCI courses from database
    // Note: Supabase requires exact column names with proper case
    const { data: csciCourses, error } = await supabase
      .from('Courses')
      .select('*')
      .eq('department_ID', 'CSCI')
      .order('course_id');
    
    console.log('Courses found:', csciCourses?.length, 'Error:', error);
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch courses' 
      });
    }
    
    if (!csciCourses || csciCourses.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No courses found for Computer Science major' 
      });
    }
    
    // Initialize 8 semesters
    const semesters = Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      year: ['Freshman', 'Freshman', 'Sophomore', 'Sophomore', 'Junior', 'Junior', 'Senior', 'Senior'][i],
      season: i % 2 === 0 ? 'Fall' : 'Spring',
      courses: [],
      totalCredits: 0
    }));
    
    // Track completed courses for prerequisite checking
    const completedCourses = [];
    const TARGET_CREDITS = 15;
    const MAX_CREDITS = 18;
    
    // Separate courses into intro (100-level), intermediate (200-level), and advanced (300+)
    const introCourses = csciCourses.filter(c => parseInt(c.course_id) < 200);
    const intermediateCourses = csciCourses.filter(c => parseInt(c.course_id) >= 200 && parseInt(c.course_id) < 300);
    const advancedCourses = csciCourses.filter(c => parseInt(c.course_id) >= 300);
    
    // Combine in order: intro -> intermediate -> advanced
    const orderedCourses = [...introCourses, ...intermediateCourses, ...advancedCourses];
    
    // Schedule courses semester by semester
    for (let semesterIndex = 0; semesterIndex < 8; semesterIndex++) {
      const semester = semesters[semesterIndex];
      
      // Find courses that can be taken this semester
      const availableCourses = orderedCourses.filter(course => {
        // Skip if already scheduled
        if (completedCourses.some(c => c.course_id === course.course_id)) {
          return false;
        }
        
        // Check prerequisites
        return prerequisitesMet(course, completedCourses);
      });
      
      // Add courses to semester until we hit target credits
      for (const course of availableCourses) {
        if (semester.totalCredits >= TARGET_CREDITS) break;
        if (semester.totalCredits + course.credits > MAX_CREDITS) continue;
        
        // Add course to semester
        semester.courses.push(formatCourse(course));
        semester.totalCredits += course.credits;
        completedCourses.push(course);
      }
    }
    
    // Handle any remaining unscheduled courses (courses with unmet prerequisites)
    const unscheduledCourses = orderedCourses.filter(course =>
      !completedCourses.some(c => c.course_id === course.course_id)
    );
    
    // Try to fit unscheduled courses in later semesters
    for (const course of unscheduledCourses) {
      for (let i = 4; i < 8; i++) { // Start from junior year
        if (semesters[i].totalCredits + course.credits <= MAX_CREDITS) {
          semesters[i].courses.push(formatCourse(course));
          semesters[i].totalCredits += course.credits;
          break;
        }
      }
    }
    
    // Return in the format the frontend expects
    res.json({
      success: true,
      data: {
        semesters,
        totalCredits: semesters.reduce((sum, sem) => sum + sem.totalCredits, 0),
        totalCourses: semesters.reduce((sum, sem) => sum + sem.courses.length, 0)
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

// Get available majors (for now, just return Computer Science)
router.get('/majors', async (req, res) => {
  try {
    // For now, return hardcoded majors that match frontend
    // Later this can query a majors table
    res.json({
      success: true,
      data: [
        { id: '1', name: 'Computer Science', degree: 'Bachelor of Science', duration: '4 years' }
      ]
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