// Next.js router mock for testing
export const useRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  query: {},
  pathname: '/test',
  asPath: '/test',
  route: '/test',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
});

export const usePathname = () => '/test';
export const useSearchParams = () => new URLSearchParams();

export default {
  useRouter,
  usePathname,
  useSearchParams,
};