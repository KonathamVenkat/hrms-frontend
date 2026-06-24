import { MenuService } from '../services/menu.service';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(MenuService);
  const platformId = inject(PLATFORM_ID);

  const token = localStorage.getItem('hrms_access_token'); // or localStorage.getItem('hrms_access_token')
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }
  // ✅ Only skip actual login and refresh — NOT /menu/sidebar
  const isPublicEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/register');

  if (token && !isPublicEndpoint) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  return next(req);
};
