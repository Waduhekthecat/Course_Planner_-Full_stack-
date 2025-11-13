export function countCourseCredits(courses) {
  const creditHours = {};

  for (const course of courses) {
    if (course.title && typeof course.credits === 'number') {
      creditHours[course.title] = course.credits;
    }
  }

  return creditHours;
}