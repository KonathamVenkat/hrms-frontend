import { DestroyRef, signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timedMessage } from './timed-message';

describe('timedMessage', () => {
  let destroyCallbacks: (() => void)[];
  const destroyRef = {
    onDestroy: (fn: () => void) => {
      destroyCallbacks.push(fn);
      return () => undefined;
    },
  } as unknown as DestroyRef;

  beforeEach(() => {
    destroyCallbacks = [];
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('shows the message and clears it after the delay', () => {
    const target = signal<string | null>(null);
    const show = timedMessage(target, destroyRef, 3000);
    show('Saved');
    expect(target()).toBe('Saved');
    vi.advanceTimersByTime(2999);
    expect(target()).toBe('Saved');
    vi.advanceTimersByTime(1);
    expect(target()).toBeNull();
  });

  it('restarts the countdown when a newer message arrives', () => {
    const target = signal<string | null>(null);
    const show = timedMessage(target, destroyRef, 3000);
    show('first');
    vi.advanceTimersByTime(2000);
    show('second');
    vi.advanceTimersByTime(2000);
    expect(target()).toBe('second');
    vi.advanceTimersByTime(1000);
    expect(target()).toBeNull();
  });

  it('stops the timer when the component is destroyed', () => {
    const target = signal<string | null>(null);
    const show = timedMessage(target, destroyRef, 3000);
    show('Saved');
    destroyCallbacks.forEach((fn) => fn());
    vi.advanceTimersByTime(5000);
    expect(target()).toBe('Saved');
  });
});
