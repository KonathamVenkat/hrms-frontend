import { DestroyRef, WritableSignal } from '@angular/core';
import { Subscription, timer } from 'rxjs';

/**
 * Returns a function that shows a message in `target` and clears it after `ms`. A newer message
 * restarts the countdown, and the timer is cancelled when the component is destroyed.
 */
export function timedMessage(
  target: WritableSignal<string | null>,
  destroyRef: DestroyRef,
  ms = 3000,
): (message: string) => void {
  let pending: Subscription | undefined;
  destroyRef.onDestroy(() => pending?.unsubscribe());
  return (message) => {
    pending?.unsubscribe();
    target.set(message);
    pending = timer(ms).subscribe(() => target.set(null));
  };
}
