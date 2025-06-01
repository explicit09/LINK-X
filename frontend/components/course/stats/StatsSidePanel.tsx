'use client';

import { useTodos, useAchievements } from './hooks';
import {
  CourseDescriptionWidget,
  TodosWidget,
  ProgressWidget,
  AISuggestionsWidget,
  LoadingPlaceholder,
} from './widgets';
import type { StatsSidePanelProps } from './types';

export function StatsSidePanel({
  course,
  courseProgress,
  onUpdateDescription,
  userRole,
}: StatsSidePanelProps) {
  const { todos, loadingTodos, toggleTodo, deleteTodo } = useTodos(
    course,
    userRole,
  );
  const achievementBadges = useAchievements(courseProgress);

  if (!course) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Course Description */}
      <CourseDescriptionWidget
        course={course}
        onUpdateDescription={onUpdateDescription}
      />

      {/* Todo Items - Only for students */}
      {userRole === 'student' && (
        <TodosWidget
          todos={todos}
          loadingTodos={loadingTodos}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
        />
      )}

      {/* Progress & Stats */}
      <ProgressWidget
        courseProgress={courseProgress}
        achievementBadges={achievementBadges}
      />

      {/* AI Recommendations */}
      <AISuggestionsWidget courseId={course.id} />
    </div>
  );
}
