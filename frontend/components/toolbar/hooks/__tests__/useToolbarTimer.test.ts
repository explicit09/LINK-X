import { renderHook, act } from '@testing-library/react';
import { useToolbarTimer } from '../useToolbarTimer';

jest.useFakeTimers();

describe('useToolbarTimer', () => {
  it('should start and cancel timer correctly', () => {
    const setSelectedTool = jest.fn();
    const setIsToolbarVisible = jest.fn();

    const { result } = renderHook(() =>
      useToolbarTimer(setSelectedTool, setIsToolbarVisible),
    );

    // Start timer
    act(() => {
      result.current.startCloseTimer();
    });

    // Timer should not have fired yet
    expect(setSelectedTool).not.toHaveBeenCalled();
    expect(setIsToolbarVisible).not.toHaveBeenCalled();

    // Cancel timer
    act(() => {
      result.current.cancelCloseTimer();
    });

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Timer should not fire after being cancelled
    expect(setSelectedTool).not.toHaveBeenCalled();
    expect(setIsToolbarVisible).not.toHaveBeenCalled();
  });

  it('should execute callback after timeout', () => {
    const setSelectedTool = jest.fn();
    const setIsToolbarVisible = jest.fn();

    const { result } = renderHook(() =>
      useToolbarTimer(setSelectedTool, setIsToolbarVisible),
    );

    act(() => {
      result.current.startCloseTimer();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(setSelectedTool).toHaveBeenCalledWith(null);
    expect(setIsToolbarVisible).toHaveBeenCalledWith(false);
  });
});
