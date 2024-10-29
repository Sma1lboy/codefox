import { GET_MODEL_TAGS, ModelTagsData } from '@/graphql/request';
import { useQuery } from '@apollo/client';
import { toast } from 'sonner';

export const useModels = () => {
  const { data, loading, error } = useQuery<ModelTagsData>(GET_MODEL_TAGS);

  if (error) {
    toast.error('Failed to load models');
  }

  return {
    models: data?.modelTags.tags || [],
    loading,
    error,
  };
};
