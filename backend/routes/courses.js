import express from 'express';
import { supabase } from '../config/supabase.js';
import { 
  readDegreePlan, 
  calculateCoursePriority, 
  mapMajorToDegreeCode, 
  bestCreditSubset, 
  buildPrerequisiteMap,
  countCourseCredits
} from '../utils/index.js';

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

    let reqCourses = [...genElectives, ...genEduCourses, ...majorCourses];
    reqCourses = reqCourses.map(c => {
      // Remove leading/trailing single quotes
      let cleaned = c.replace(/^'+|'+$/g, '');
      
      /** 
       * No longer needed, cleaned up DB
      // Add a leading space for specific courses
      if (cleaned === 'Advanced Fibers' || cleaned === 'Advanced Life Drawing') {
        cleaned = ' ' + cleaned;
      }
      */
      return cleaned;
    });

    console.log(reqCourses);

    const { data: requiredCourses, error } = await supabase
      .from('combined_data')
      .select('*')
      .in('title', reqCourses);

    if (error) {
      console.error(error);
    } else {
      //console.log("start query dump")
      //console.log(requiredCourses)
      //console.log("end query dump")
      console.log("required courses: ", reqCourses.length);
      console.log("courses found in DB: ", requiredCourses.length);
    };

    /**
     * No longer needed to to change in DB
    requiredCourses.forEach(course => {
      course.course_code = getCourseCode(course);
    });
    */
    const prereqMap = buildPrerequisiteMap(requiredCourses);

    const priorityMap = calculateCoursePriority(prereqMap);

    requiredCourses.forEach(course => {
      course.priority = priorityMap[course.title] || 0;
    });

    // console.log("Prereq Map: ", prereqMap);
    // console.log("Priority map: ", priorityMap);

    const semesters = Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      year: ['Freshman', 'Freshman', 'Sophomore', 'Sophomore', 'Junior', 'Junior', 'Senior', 'Senior'][i],
      season: i % 2 === 0 ? 'Fall' : 'Spring',
      courses: [],
      totalCredits: 0
    }));

    console.log(countCourseCredits(requiredCourses));

    let completed = [];
    let inProgress = [];
    let remainingCourses = [...requiredCourses];

    for (let semester of semesters) {
      completed.push(...inProgress);
      inProgress = [];

      const schedulableCourses = remainingCourses.filter(course => prereqMet(course, completed, semester));

      if (schedulableCourses.length === 0) {
        console.log(`Semester ${semester.number}: no courses can be scheduled this semester (prereqs or credits)`);
        continue;
      }

      const pGroups = {};
      for (let course of schedulableCourses) {
        if (!pGroups[course.priority]) pGroups[course.priority] = [];
        pGroups[course.priority].push(course);
      }

      const sortedPGroups = Object.keys(pGroups)
        .map(Number)
        .sort((a,b)=>b-a);

      for (let priority of sortedPGroups) {
        const tierCourses = pGroups[priority];
        const remainingCredits = 16-semester.totalCredits;

        const availCourses = tierCourses.filter(c=>c.credits<=remainingCredits);

        let coursesToAdd;
        const totalAvailCredits = availCourses.reduce((sum,c) => sum + c.credits, 0);
        
        if (totalAvailCredits <= remainingCredits) {
          coursesToAdd = availCourses;
        } else {
          coursesToAdd = bestCreditSubset(availCourses, remainingCredits);
        }

        for (let course of coursesToAdd) {
          semester.courses.push(course);
          semester.totalCredits += course.credits;
          inProgress.push(course);

          const idx = remainingCourses.indexOf(course);
          if (idx > -1) remainingCourses.splice(idx, 1);

        }
      }
      if (semester.totalCredits < 12) {
        const underfillCourses = remainingCourses.filter(c => prereqMet(c, completed, semester));
        for (let course of underfillCourses) {
          if (semester.totalCredits >= 12) break;
          semester.courses.push(course);
          semester.totalCredits += course.credits;
          inProgress.push(course);

          const idx = remainingCourses.indexOf(course);
          if (idx > -1) remainingCourses.splice(idx, 1);
        }
      }
    }

    if (remainingCourses.length > 0) {
      console.log("⚠️ Unscheduled Courses Detected:");
      remainingCourses.forEach(course => {
        console.log(
          ` - ${course.title}`
        );
      });
    } else {
      console.log("✅ All required courses were scheduled!");
    }

    const formatSemesters = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(course => ({
        code: course.course_code,
        name: course.title,
        credits: course.credits,
        type: 'Major',
        professor: `Dr. ${course.last_name}, ${course.first_name}`,
        professor_rating: course.rating,
        course_days: course.day_of_week,
        course_start_time: course.start_time,
        course_end_time: course.end_time
      }))
    }));

    res.json({
      success: true,
      data: {
        semesters: formatSemesters,
        totalCredits: formatSemesters.reduce((sum, sem) => sum + sem.totalCredits, 0),
        totalCourses: formatSemesters.reduce((sum, sem) => sum + sem.courses.length, 0)
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

/** 
 * No longer needed due to change in DB
 function getCourseCode(course) {
  if (!course || !course.department_ID || !course.course_id) return null;
  return `${course.department_ID}${course.course_id}`;
}
  */

function prereqMet(course, completed, semester) {
  if (!course.Prerequisites || course.Prerequisites === 'NULL') return true;
  if (course.Prerequisites == 'FINAL SEMESTER' && semester.number == 8) return true;
  if (completed.some(c => c.course_code === course.Prerequisites)) return true;
  return false;
}

export default router;