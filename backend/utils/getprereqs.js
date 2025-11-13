export function buildPrerequisiteMap(courses) {
  const prereqMap = {}; 
  const courseLookup = {};

  for (const course of courses) {
    courseLookup[course.course_code] = course;
  }

  function getPrereqChain(course) {
    const chain = [];

    let current = course;
    while (current && current.Prerequisites && current.Prerequisites !== 'NULL') {
      const prereqCode = current.Prerequisites;
      const prereqCourse = Object.values(courseLookup).find(c =>
        c.course_code === prereqCode ||
        c.title === prereqCode 
      );

      if (!prereqCourse) break; 

      chain.push(prereqCourse.title);
      current = prereqCourse; 
    }

    return chain;
  }

  for (const course of courses) {
    const prereqs = getPrereqChain(course);
    prereqMap[course.title] = prereqs;
  }

  return prereqMap;
}
