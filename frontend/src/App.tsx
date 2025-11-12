import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { AcademicPlanGrid } from './components/AcademicPlanGrid';
import { Calendar, GraduationCap, Tags, Zap, Moon, Sun } from 'lucide-react';

// Backend API URL *********
const API_URL = 'http://localhost:5000';

const majors = [
  { id: '1', name: 'Computer Science', degree: 'Bachelor of Science', duration: '4 years' },
  { id: '2', name: 'Fine Arts', degree: 'Bachelor of Arts', duration: '4 years' },
  { id: '3', name: 'Geography', degree: 'Bachelor of Science', duration: '4 years' },
  { id: '4', name: 'Legal Studies', degree: 'Bachelor of Arts', duration: '4 years' },
  { id: '5', name: 'Mathematics', degree: 'Bachelor of Science', duration: '4 years' }
];

const availableTags = [
  'Research-Oriented', 'Industry-Focused', 'Theoretical', 'Hands-On Learning', 'Interdisciplinary',
  'STEM Track', 'Liberal Arts', 'Pre-Professional', 'Creative Projects', 'Data Analysis',
  'Leadership Development', 'Global Perspective', 'Entrepreneurship', 'Social Impact', 'Technology Integration',
  'Laboratory Work', 'Field Experience', 'Internship Preparation', 'Graduate School Prep', 'Career-Ready Skills'
];

interface Course {
  code: string;
  name: string;
  credits: number;
  type?: 'Core' | 'Elective' | 'Major' | 'Minor';
}

interface Semester {
  number: number;
  year: string;
  season: string;
  courses: Course[];
  totalCredits: number;
}

export default function App() {
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [academicPlan, setAcademicPlan] = useState<Semester[]>([]);
  const [currentSemesterIndex, setCurrentSemesterIndex] = useState(0); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  // *********
  const [error, setError] = useState<string>('');

  // Handle dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const generateAcademicPlan = async () => {
    if (!selectedMajor) return;
    
    setIsGenerating(true);
    // *********
    setError('');

    try {
      const response = await fetch(`${API_URL}/courses/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ major: selectedMajor}),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate academic plan');
      }

      setAcademicPlan(result.data.semesters);
      setCurrentSemesterIndex(0);
      setIsGenerating(false);

    } catch (err) {
      console.error('Error generating plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate plan. Please try again.');
      setIsGenerating(false);
    }
  };

  const resetSelection = () => {
    setSelectedMajor('');
    setSelectedTags([]);
    setAcademicPlan([]);
    setCurrentSemesterIndex(0);
    setError('');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          {/* Dark Mode Toggle - Top Right */}
          <div className="absolute top-0 right-0">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="w-10 h-10"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Header Content */}
          <div className="text-center space-y-2">
            <h1 className="flex items-center justify-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              Academic Career Planner
            </h1>
            <p className="text-muted-foreground">
              Select your major and interests to generate your complete 8-semester academic plan
            </p>
          </div>
        </div>

        {/* Main Content - Left Controls, Right Timetable */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Left Sidebar - Controls */}
          <div className="space-y-6">
            {/* Major Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Select Major
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your major field of study" />
                  </SelectTrigger>
                  <SelectContent>
                    {majors.map((major) => (
                      <SelectItem key={major.id} value={major.id}>
                        <div className="flex flex-col items-start">
                          <span>{major.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {major.degree} • {major.duration}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMajor && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm">
                      <strong>Selected:</strong>{' '}
                      {majors.find(m => m.id === selectedMajor)?.name}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="w-5 h-5" />
                  Academic Interests & Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleTagSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add interests to customize your academic path" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags
                      .filter(tag => !selectedTags.includes(tag))
                      .map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {selectedTags.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-muted-foreground">Selected interests:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleTagSelect(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-xs text-muted-foreground">
                  Select up to 5 interests • Click to remove
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={generateAcademicPlan}
                disabled={!selectedMajor || isGenerating}
                className="w-full py-3"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Academic Plan
                  </>
                )}
              </Button>
              
              {(selectedMajor || selectedTags.length > 0 || academicPlan.length > 0) && (
                <Button variant="outline" onClick={resetSelection} className="w-full">
                  Reset Selection
                </Button>
              )}
            </div>
          </div>

          {/* Right Side - Academic Plan */}
          <div className="min-h-0">
            {academicPlan.length > 0 ? (
              <AcademicPlanGrid 
                semesters={academicPlan} 
                majorName={majors.find(m => m.id === selectedMajor)?.name || ''} 
              />
            ) : (
              <Card className="h-full min-h-[600px]">
                <CardContent className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <GraduationCap className="w-16 h-16 text-muted-foreground/50" />
                  <div>
                    <h3 className="text-muted-foreground">No academic plan generated yet</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Select a major and click "Generate Academic Plan" to see your 8-semester plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}