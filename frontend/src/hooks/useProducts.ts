import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '../api/endpoints';
import { message } from 'antd';

export const useProducts = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsAPI.getAll(params),
  });

  const createProduct = useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      message.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create product');
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productsAPI.update(id, data),
    onSuccess: () => {
      message.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update product');
    },
  });

  const deleteProduct = useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => {
      message.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete product');
    },
  });

  return {
    products: data?.data || [],
    pagination: data?.meta,
    isLoading,
    error,
    refetch,
    createProduct: createProduct.mutate,
    updateProduct: updateProduct.mutate,
    deleteProduct: deleteProduct.mutate,
    isCreating: createProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
  };
};