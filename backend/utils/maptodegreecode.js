export const mapMajorToDegreeCode = (majorId) => {
  const majorMap = {
    1: 'CSCI',
    2: 'ARTS',
    3: 'GEOG',
    4: 'LEGL',
    5: 'MATH'
  };
  return majorMap[majorId] || null;
}