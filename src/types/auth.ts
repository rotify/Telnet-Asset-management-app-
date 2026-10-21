export type UserRole = "admin" | "manager" | "equipment_manager" | "vehicle_manager" | "document_manager" | "driver" | "staff";

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
