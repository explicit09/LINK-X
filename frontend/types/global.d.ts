declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set',
      targetId: string,
      config?: {
        [key: string]: any;
      }
    ) => void;
  }
}

export {};