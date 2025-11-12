import express from 'express';
import { supabase } from '../config/supabase.js';
import { readDegreePlan } from '../utils/readdegreeplan.js';

const router = express.Router();

// Main route function
router.post('/generate', async (req, res) => {
  try {
    const { major } = req.body;
    const degreeCode = mapMajorToDegreeCode(major);
    if (!degreeCode) {
      return res.status(400).json({ 
        success: false,
        error: 'Make sure to select a valid major of interest' 
      });
    }
    
    const majorCourses = readDegreePlan(degreeCode);
    if (!majorCourses) {
      return res.status(404).json({ 
        success: false,
        error: `Degree plan not found for ${degreeCode}` 
      });
    }

    const genMath = ["'Precalculus'", "'College Algebra'", "'Calculus 1'"];
    const genSoc = ["'Criminal Justice'", "'Psychology 1'", "'Sociology'"];
    const genArt = ["'Introduction to Music'", "'Introduction to Dance'", "'Introduction to Fine Art'"];
    const genSci = ["'Physics 1 + Lab'", "'General Chemistry I + Lab'", "'Biology 1 + Lab'"];

    let reqMath = 1;
    let reqSoc = 1;
    let reqArt = 1;
    let reqSci = 2;

    const genElectives = [];

    // Special rules based on degree code
    if (['CSCI', 'MATH', 'GEOG'].includes(degreeCode)) {
      genElectives.push("'Calculus 1'");
      reqMath = Math.max(0, reqMath - 1);
    }

    if (['GEOG', 'CSCI'].includes(degreeCode)) {
      genElectives.push("'General Chemistry I + Lab'");
      reqSci = Math.max(0, reqSci - 1);
    }

    // Placeholder function for using tags to select general edu electives
    function pickRandomCourse(courses) {
      return courses[Math.floor(Math.random() * courses.length)];
    }

    // Add remaining required courses randomly
    while (reqMath > 0) {
      const course = pickRandomCourse(genMath);
      if (!genElectives.includes(course)) {
        genElectives.push(course);
        reqMath--;
      }
    }

    while (reqSoc > 0) {
      const course = pickRandomCourse(genSoc);
      if (!genElectives.includes(course)) {
        genElectives.push(course);
        reqSoc--;
      }
    }

    while (reqArt > 0) {
      const course = pickRandomCourse(genArt);
      if (!genElectives.includes(course)) {
        genElectives.push(course);
        reqArt--;
      }
    }

    while (reqSci > 0) {
      const course = pickRandomCourse(genSci);
      if (!genElectives.includes(course)) {
        genElectives.push(course);
        reqSci--;
      }
    }

    const genEduCourses = readDegreePlan('GENERAL');
    if (!genEduCourses) {
      return res.status(404).json({ 
        success: false,
        error: `General Education courses not found` 
      });
    }

    let reqCourses = [...genEduCourses, ...genElectives, ...majorCourses];
    reqCourses = reqCourses.map(c => c.replace(/^'+|'+$/g, '').trim());

    console.log(reqCourses);
    

    const { data: requiredCourses, error } = await supabase
      .from('Courses')
      .select('*')
      .in('title', reqCourses);

    if (error) {
      console.error(error);
    } else {
      console.log("required courses: ", reqCourses.length);
      console.log("courses found in DB: ", requiredCourses.length);
    };
    
    // Initialize 8 semesters
    const semesters = Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      year: ['Freshman','Freshman','Sophomore','Sophomore','Junior','Junior','Senior','Senior'][i],
      season: i % 2 === 0 ? 'Fall' : 'Spring',
      courses: [],
      totalCredits: 0
    }));

    const TARGET_CREDITS = 12;
    const MAX_CREDITS = 15;
    const completedCourses = [];
    let inProgressCourses = [];
    let remainingCourses = [...requiredCourses];
    const numSemesters = semesters.length;
    const avgCoursesPerSemester = Math.ceil(requiredCourses.length / numSemesters);

    // Prioritize GenEd courses first, then by fewer prerequisites
    remainingCourses.sort((a, b) => {
      if (a.department_ID === 'GEN' && b.department_ID !== 'GEN') return -1;
      if (b.department_ID === 'GEN' && a.department_ID !== 'GEN') return 1;
      return (a.prerequisites?.length || 0) - (b.prerequisites?.length || 0);
    });

    let addedAnyCourse = true;

    while (remainingCourses.length > 0 && addedAnyCourse) {
      addedAnyCourse = false;

      for (let semester of semesters) {
        completedCourses.push(...inProgressCourses);
        inProgressCourses = [];

        let semesterUpdated = true;
        while (semesterUpdated && semester.totalCredits < MAX_CREDITS && semester.courses.length < avgCoursesPerSemester) {
          semesterUpdated = false;

          for (let course of remainingCourses) {
            if (!prerequisitesMet(course, completedCourses)) continue;
            if (semester.totalCredits + course.credits > MAX_CREDITS) continue;
            if (semester.totalCredits >= TARGET_CREDITS && (semester.totalCredits + course.credits) > TARGET_CREDITS) {
              if (semester.totalCredits + course.credits > MAX_CREDITS) continue;
            }
            
            semester.courses.push(
              formatCourse(course, course.department_ID === 'GEN' ? 'GenEd' : 'Major')
            );
            semester.totalCredits += course.credits;
            inProgressCourses.push(course);
            remainingCourses = remainingCourses.filter(c => c !== course);
            semesterUpdated = true;    
            addedAnyCourse = true;     
            break;                     
          }
        }

      console.log(`Semester ${semester.number} (${semester.year} ${semester.season}):`);
      console.log(`Total Credits: ${semester.totalCredits}`);
      console.log('Courses:');
      semester.courses.forEach(c => console.log(` - ${c.name} (${c.credits} credits)`));
      console.log('----------------------------------------');
      }
    }

    completedCourses.push(...inProgressCourses);
    inProgressCourses = [];

    if (remainingCourses.length > 0) {
      console.log("⚠️ Unscheduled Courses Detected:");
      remainingCourses.forEach(course => {
        console.log(
          ` - ${course.title} (${course.department_ID}${course.course_id}) | Credits: ${course.credits} | Prereqs: ${course.Prerequisites}`
        );
      });
    } else {
      console.log("✅ All required courses were scheduled!");
    }

    if (inProgressCourses.length > 0) {
      console.log("⚠️ Courses left in progress:");
      inProgressCourses.forEach(course => {
        console.log(` - ${course.title} (${course.department_ID}${course.course_id})`);
      });
    }

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

// Helper to get available majors
router.get('/majors', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
          { id: '1', name: 'Computer Science', degree: 'Bachelor of Science', duration: '4 years' },
          { id: '2', name: 'Fine Arts', degree: 'Bachelor of Arts', duration: '4 years' },
          { id: '3', name: 'Geography', degree: 'Bachelor of Science', duration: '4 years' },
          { id: '4', name: 'Legal Studies', degree: 'Bachelor of Arts', duration: '4 years' },
          { id: '5', name: 'Mathematics', degree: 'Bachelor of Science', duration: '4 years' }
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


// Helper function to parse prerequisites
const parsePrerequisites = (prereqString) => {
  if (!prereqString || prereqString === 'NULL') return [];
  return prereqString.split(',').map(p => p.trim());
};

// Helper function to check if prerequisites are met
function prerequisitesMet(course, completedCourses, semesterNumber) {
  if (!course.prerequisites || course.prerequisites.length === 0) return true;

  return course.prerequisites.every(prereq => {
    if (prereq === 'FINAL SEMESTER') {
      return semesterNumber === numSemesters;
    }
    return completedCourses.some(c => c.course_id === prereq);
  });
}

// Helper function to format course for frontend
const formatCourse = (course, courseType = 'Major') => ({
  code: `${course.department_ID}${course.course_id}`,
  name: course.title,
  credits: course.credits,
  type: courseType
});

// Helper to get department_ID from user input desired major
const mapMajorToDegreeCode = (majorId) => {
  const majorMap = {
    1: 'CSCI',
    2: 'ARTS',
    3: 'GEOG',
    4: 'LEGL',
    5: 'MATH'
  };
  return majorMap[majorId] || null;
}

export default router;