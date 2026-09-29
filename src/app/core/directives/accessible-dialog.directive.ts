import { Directive, input, output, OnInit, OnDestroy } from '@angular/core';

/**
 * Turns a hand-rolled modal box into a real dialog for assistive tech: adds
 * role="dialog"/aria-modal, closes on Escape, and returns focus to whatever
 * opened it. Pair with `cdkTrapFocus cdkTrapFocusAutoCapture` on the same
 * element for focus containment — this directive only handles the parts CDK
 * doesn't (labelling, Escape, focus return).
 */
@Directive({
  selector: '[appAccessibleDialog]',
  standalone: true,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-labelledby]': 'appAccessibleDialog()',
    '(document:keydown.escape)': 'dialogClosed.emit()',
  },
})
export class AccessibleDialogDirective implements OnInit, OnDestroy {
  /** id of the element (heading) that names this dialog */
  readonly appAccessibleDialog = input.required<string>();
  readonly dialogClosed = output<void>();

  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus?.();
  }
}
