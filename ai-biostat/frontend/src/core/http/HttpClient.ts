/** Ошибка ответа сервера: текст берётся из поля detail (FastAPI). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Абстракция HTTP — классы API зависят от неё, а не от fetch (DIP). */
export interface HttpClient {
  get<T>(url: string): Promise<T>
  post<T>(url: string, body?: unknown): Promise<T>
  put<T>(url: string, body?: unknown): Promise<T>
}

export class FetchHttpClient implements HttpClient {
  get<T>(url: string) { return this.request<T>('GET', url) }
  post<T>(url: string, body?: unknown) { return this.request<T>('POST', url, body) }
  put<T>(url: string, body?: unknown) { return this.request<T>('PUT', url, body) }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const hasBody = body !== undefined
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      let detail = 'Ошибка сервера'
      try { detail = (await res.json()).detail || detail } catch { /* ответ не JSON */ }
      throw new ApiError(detail, res.status)
    }
    return res.json() as Promise<T>
  }
}
