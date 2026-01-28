import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { message } from 'antd';

export const useAuth = () => {
  const { login: loginStore, logout: logoutStore } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      loginStore(data.user, data.access_token);
      message.success('Login successful!');
    },
    onError: (error: any) => {
      message.error(error.message || 'Login failed');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: (data) => {
      loginStore(data.user, data.access_token);
      message.success('Registration successful!');
    },
    onError: (error: any) => {
      message.error(error.message || 'Registration failed');
    },
  });

  const logout = () => {
    logoutStore();
    message.success('Logged out successfully');
  };

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    error: loginMutation.error || registerMutation.error,
  };
};