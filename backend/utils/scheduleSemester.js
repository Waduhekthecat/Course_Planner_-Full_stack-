export function selectCoursesForSemester(availableCourses, priorityMap, courseCredits, targetHours = 15) {
    // Sort by descending priority (most influential first)
    availableCourses.sort((a, b) => priorityMap[b] - priorityMap[a]);

    const selected = [];
    let totalHours = 0;

    for (const course of availableCourses) {
        const credits = courseCredits[course];
        if (totalHours + credits <= targetHours) {
            selected.push(course);
            totalHours += credits;
        }
    }

    // If totalHours < target, try to fill remaining space with low-credit courses
    if (totalHours < targetHours) {
        const remaining = availableCourses.filter(c => !selected.includes(c));
        for (const course of remaining) {
            const credits = courseCredits[course];
            if (totalHours + credits <= targetHours) {
                selected.push(course);
                totalHours += credits;
            }
        }
    }

    return selected;
}
