// Password strength rules used when a user sets a new password.

export const MIN_PASSWORD_LENGTH = 12;

const COMMON = [
  "password",
  "passw0rd",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "telnet",
  "iloveyou",
  "123456",
  "abc123",
  "monkey",
  "dragon",
];

export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export function checkPassword(
  password: string,
  context: { username?: string | null; email?: string | null } = {}
): PasswordCheck[] {
  const lower = password.toLowerCase();
  const user = (context.username ?? "").toLowerCase();
  const emailName = (context.email ?? "").split("@")[0].toLowerCase();
  return [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      ok: password.length >= MIN_PASSWORD_LENGTH,
    },
    { label: "An uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "A lowercase letter", ok: /[a-z]/.test(password) },
    { label: "A number", ok: /\d/.test(password) },
    { label: "A symbol (e.g. ! @ # $ %)", ok: /[^A-Za-z0-9\s]/.test(password) },
    { label: "No spaces", ok: password.length > 0 && !/\s/.test(password) },
    {
      label: "Not a common word or your username/email",
      ok:
        password.length > 0 &&
        !COMMON.some((w) => lower.includes(w)) &&
        !(user.length >= 3 && lower.includes(user)) &&
        !(emailName.length >= 3 && lower.includes(emailName)) &&
        !/(.)\1{3,}/.test(password),
    },
  ];
}

export function isStrongPassword(
  password: string,
  context?: { username?: string | null; email?: string | null }
): boolean {
  return checkPassword(password, context).every((c) => c.ok);
}
