import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { AuthService } from '@/services/auth.service';

/** Sign in: exchanges credentials for a session and stores it. */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: AuthService.login,
    onSuccess: (data) => setSession(data),
  });
}

/** Sign up: registers the account and stores the returned session. */
export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: AuthService.register,
    onSuccess: (data) => setSession(data),
  });
}

/** Sign out: revokes the refresh token server-side and clears local state. */
export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AuthService.logout(useAuthStore.getState().refreshToken),
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}

/** Forgot-password: always resolves (200) to avoid email enumeration. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => AuthService.forgotPassword(email),
  });
}

/** Reset-password with the token from the reset email. */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }) => AuthService.resetPassword({ token, password }),
  });
}

/** Current user via /auth/me; enabled only when an access token exists. */
export function useAuthUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: AuthService.me,
    enabled: Boolean(accessToken),
  });
}
