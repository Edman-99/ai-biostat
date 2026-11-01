import type { HttpClient } from '@/core/http/HttpClient'
import type { User } from './types'

export class AuthApi {
  constructor(private http: HttpClient) {}

  login(code: string, password: string) { return this.http.post<User>('/api/login', { code, password }) }
  logout() { return this.http.post<{ ok: boolean }>('/api/logout') }
  me() { return this.http.get<User>('/api/me') }
  updateProfile(first_name: string, last_name: string) {
    return this.http.put<User>('/api/profile', { first_name, last_name })
  }
  changePassword(old_password: string, new_password: string) {
    return this.http.put<{ ok: boolean }>('/api/password', { old_password, new_password })
  }
}
