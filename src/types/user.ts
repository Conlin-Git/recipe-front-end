export interface User {
  id: number
  username: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  created_at: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams extends LoginParams {
  email?: string
}

export interface TokenResult {
  access_token: string
  token_type: string
}
