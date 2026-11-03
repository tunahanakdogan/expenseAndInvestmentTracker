import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  function setup(session: object | null) {
    localStorage.clear();
    if (session) {
      localStorage.setItem('finans.session', JSON.stringify(session));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => controller.verify());

  it('geçerli oturumda Authorization başlığı ekler', () => {
    setup({ token: 'jwt', expiresAt: '2999-01-01T00:00:00Z' });
    http.get('/api/x').subscribe();
    expect(controller.expectOne('/api/x').request.headers.get('Authorization')).toBe('Bearer jwt');
  });

  it('süresi dolmuş oturumda başlık eklemez', () => {
    setup({ token: 'jwt', expiresAt: '2000-01-01T00:00:00Z' });
    http.get('/api/x').subscribe();
    expect(controller.expectOne('/api/x').request.headers.has('Authorization')).toBe(false);
  });

  it('401 gelirse oturumu kapatıp girişe yönlendirir', () => {
    setup({ token: 'jwt', expiresAt: '2999-01-01T00:00:00Z' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    http.get('/api/x').subscribe({ error: () => {} });
    controller.expectOne('/api/x').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('finans.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/giris');
  });
});
