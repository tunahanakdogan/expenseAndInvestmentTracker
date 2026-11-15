import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Asset, NewAsset } from './models';

@Injectable({ providedIn: 'root' })
export class AssetApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Asset[]> {
    return this.http.get<Asset[]>('/api/assets');
  }

  create(asset: NewAsset): Observable<Asset> {
    return this.http.post<Asset>('/api/assets', asset);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/assets/${id}`);
  }
}
