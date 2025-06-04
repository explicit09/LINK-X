'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCourseContext } from '../../context/CourseContext';
import { getCourseColor } from '../../utils/courseHelpers';
import { Quiz } from '../../types/course.types';

interface QuizzesTabProps {
  courseId: string;
}

export default function QuizzesTab({ courseId }: QuizzesTabProps) {
  const { state } = useCourseContext();
  const { quizzes } = state;
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);

  const colors = getCourseColor(courseId);

  const handleStartQuiz = (quiz: Quiz) => {
    try {
      if (!quiz || !quiz.id) {
        toast.error('Invalid quiz selected');
        return;
      }

      if (!state.currentUser) {
        toast.error('Please log in to take quizzes');
        return;
      }

      setSelectedQuiz(quiz);
      setQuizDialogOpen(true);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error('Failed to start quiz');
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      toast.info('Quiz generation not yet implemented in the backend');
      return;
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      toast.error('Failed to generate quiz');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-2 h-8 rounded-full bg-gradient-to-b',
              colors.gradient,
            )}
          />
          <h2 className="text-2xl font-semibold text-gray-900">
            Practice Quizzes
          </h2>
        </div>
        <Button
          onClick={handleGenerateQuiz}
          className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Generate Quiz
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card
            key={quiz.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                {quiz.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-600" />
                )}
              </div>
              <h3 className="font-medium mb-2">{quiz.title}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {quiz.questions} questions • {quiz.createdAt}
              </p>

              {quiz.completed ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Score:</span>
                    <Badge variant="secondary">{quiz.score}%</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleStartQuiz(quiz)}
                  >
                    Review Results
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleStartQuiz(quiz)}
                >
                  Start Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {quizzes.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No quizzes available
                </h3>
                <p className="text-gray-500 mb-4">
                  Generate your first quiz to test your knowledge!
                </p>
                <Button onClick={handleGenerateQuiz}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Generate Your First Quiz
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              {selectedQuiz?.title || 'Practice Quiz'}
            </DialogTitle>
            <DialogDescription>
              {selectedQuiz?.completed
                ? 'Review your quiz results and performance.'
                : 'Take a practice quiz to test your knowledge of the course material.'}
            </DialogDescription>
          </DialogHeader>

          {selectedQuiz && (
            <div className="space-y-6">
              {selectedQuiz.completed ? (
                <div className="space-y-4">
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-800 mb-2">
                      Quiz Completed!
                    </h3>
                    <p className="text-green-700">
                      You scored {selectedQuiz.score}% on this quiz
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Quiz Summary:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Questions: {selectedQuiz.questions}</div>
                      <div>Score: {selectedQuiz.score}%</div>
                      <div>
                        Correct:{' '}
                        {Math.round(
                          ((selectedQuiz.score || 0) / 100) *
                            selectedQuiz.questions,
                        )}
                      </div>
                      <div>
                        Incorrect:{' '}
                        {selectedQuiz.questions -
                          Math.round(
                            ((selectedQuiz.score || 0) / 100) *
                              selectedQuiz.questions,
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      View Detailed Results
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setQuizDialogOpen(false);
                        handleGenerateQuiz();
                      }}
                    >
                      Take Another Quiz
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Ready to start?</h4>
                      <p className="text-sm text-gray-600">
                        {selectedQuiz.questions} questions • Estimated time:{' '}
                        {Math.ceil(selectedQuiz.questions * 1.5)} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedQuiz.questions}
                      </div>
                      <div className="text-xs text-gray-500">Questions</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Quiz Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Read each question carefully</li>
                      <li>Select the best answer from the options provided</li>
                      <li>
                        You can review and change your answers before submitting
                      </li>
                      <li>Click "Submit Quiz" when you're ready to finish</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setQuizDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        toast.info(
                          'Quiz taking functionality not yet implemented',
                        );
                      }}
                    >
                      Start Quiz
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
