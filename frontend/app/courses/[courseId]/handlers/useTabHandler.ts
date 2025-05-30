import { useRouter } from 'next/navigation';
import { useCourseContext, courseActions } from '../context/CourseContext';

export function useTabHandler() {
  const router = useRouter();
  const { dispatch } = useCourseContext();

  const handleTabChange = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.pathname + url.search);
    dispatch(courseActions.setActiveTab(tab));
  };

  return { handleTabChange };
}