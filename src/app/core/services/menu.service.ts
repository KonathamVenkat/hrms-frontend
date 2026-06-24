import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SubMenuDto {
  subMenuId: number;
  subMenuCode: string;
  subMenuName: string;
  subMenuAction: string; // this is the route
  subMenuType: number;
  sortOrder: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MenuDto {
  mainMenuId: number;
  mainMenuName: string;
  icon: string;
  sortOrder: number;
  route: string | null;
  children: SubMenuDto[] | null;
}

export interface MenuResponse {
  success: boolean;
  message: string;
  data: MenuDto[];
  statusCode: number;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);

  getSidebarMenu(): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${environment.serviceUrl}/api/v1/menu/sidebar`);
  }
}
