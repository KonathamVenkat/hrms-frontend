import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('hrms_access_token');
  const expiry = localStorage.getItem('hrms_token_expiry');
  const valid = token && expiry && Date.now() < parseInt(expiry, 10);

  if (valid) return true;

  router.navigateByUrl('/auth/login');
  return false;
};
