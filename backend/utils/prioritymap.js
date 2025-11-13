export function calculateCoursePriority(prereqMap) {
    const priorityMap = {};
    for (const course in prereqMap) {
        priorityMap[course] = 0;
    }
    for (const [course, prereqs] of Object.entries(prereqMap)) {
        for (const prereq of prereqs) {
            if (priorityMap.hasOwnProperty(prereq)) {
                priorityMap[prereq] += 1;
            } else {
                priorityMap[prereq] = 1;
            }
        }
    }

    // Sort by descending numeric value
    const sortedEntries = Object.entries(priorityMap)
        .sort((a, b) => b[1] - a[1]);

    return Object.fromEntries(sortedEntries);
}
