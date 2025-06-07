import { OnboardingData, OnboardingResponse, Chapter } from '../types';

export const fetchOnboarding = async (): Promise<OnboardingData | null> => {
  try {
    const res = await fetch('http://localhost:8000/onboarding', {
      method: 'GET',
      credentials: 'include',
    });

    const data: OnboardingResponse = await res.json();

    if (res.status !== 200) {
      console.error('Failed to fetch onboarding:', data);
      return null;
    }

    const [job, traits, learningStyle, depth, topics, interests, schedule] =
      data.answers;

    const onboarding: OnboardingData = {
      name: data.name,
      job,
      traits,
      learningStyle,
      depth,
      topics,
      interests,
      schedule,
      quizzes: data.quizzes,
    };

    return onboarding;
  } catch (err) {
    console.error('Error loading onboarding data:', err);
    return null;
  }
};

export const fetchChapters = async (
  courseId?: string,
  pfId?: string,
): Promise<Chapter[]> => {
  try {
    let url = '';
    if (pfId) {
      url = `http://localhost:8000/student/personalized-files/${pfId}`;
    } else if (courseId) {
      url = `http://localhost:8000/courses/${courseId}`;
    } else {
      console.warn('No courseId or pfId provided.');
      return [];
    }

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Expecting { id, content }
    const content = data.content || data?.content?.chapters;
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;

    if (parsed?.chapters) {
      const formattedChapters: Chapter[] = parsed.chapters.map((ch: any) => ({
        chapterTitle: ch.chapterTitle,
        subsections: ch.subsections.map((sub: any) => ({
          title: sub.title,
          fullText: sub.fullText,
        })),
      }));

      console.log(
        'Loaded personalized chapters with fullText:',
        formattedChapters,
      );
      return formattedChapters;
    } else {
      console.warn('No chapters found in personalized file content.');
      return [];
    }
  } catch (err) {
    console.error('Failed to load content:', err);
    return [];
  }
};
