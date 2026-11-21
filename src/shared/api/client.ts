export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
    throw new ApiError(body.error || 'Request failed', response.status)
  }
  return response.json() as Promise<T>
}
