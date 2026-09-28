import { TranslateService } from '@ngx-translate/core';

/**
 * Maps a failed HttpClient response to a user-facing message, with per-screen overrides.
 * `overrides` values must already be resolved (e.g. via `translate.instant('...')` at the
 * call site) — this function only translates its own generic per-status-code fallbacks.
 */
export function getHttpErrorMessage(
  translate: TranslateService,
  err: any,
  overrides: Partial<Record<number, string>> = {},
): string {
  const status: number = err?.status;

  if (status != null && overrides[status]) {
    return overrides[status]!;
  }

  switch (status) {
    case 401:
      return translate.instant('common.httpErrors.unauthorized');
    case 403:
      return translate.instant('common.httpErrors.forbidden');
    case 404:
      return translate.instant('common.httpErrors.notFound');
    case 409:
      return err?.error?.message || translate.instant('common.httpErrors.conflict');
    case 400:
      return err?.error?.message || translate.instant('common.httpErrors.badRequest');
    case 0:
      return translate.instant('common.httpErrors.offline');
    default:
      return err?.error?.message || translate.instant('common.httpErrors.unexpected');
  }
}
