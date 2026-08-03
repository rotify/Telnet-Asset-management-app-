export type UserRole = "admin" | "manager" | "driver" | "staff";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface LoginFormState {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  username?: string;
  password?: string;
  form?: string;
}
