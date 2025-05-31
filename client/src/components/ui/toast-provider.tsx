import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

/**
 * Show a success toast notification
 */
export const showSuccessToast = (title: string, description?: string) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: 'default',
  });
};

/**
 * Show an error toast notification
 */
export const showErrorToast = (
  title: string, 
  description?: string, 
  action?: { label: string; onClick: () => void }
) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: 'destructive',
    action: action ? (
      <ToastAction altText={action.label} onClick={action.onClick}>
        {action.label}
      </ToastAction>
    ) : undefined,
  });
};

/**
 * Show an info toast notification
 */
export const showInfoToast = (title: string, description?: string) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: 'default',
  });
};

/**
 * Toast provider hook wrapper
 * This is a workaround for the issue with useToast() hook being called outside of component context
 */
export function useToastProvider() {
  const { toast } = useToast();
  
  return {
    showSuccess: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'default',
      });
    },
    
    showError: (
      title: string, 
      description?: string, 
      action?: { label: string; onClick: () => void }
    ) => {
      toast({
        title,
        description,
        variant: 'destructive',
        action: action ? (
          <ToastAction altText={action.label} onClick={action.onClick}>
            {action.label}
          </ToastAction>
        ) : undefined,
      });
    },
    
    showInfo: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'default',
      });
    }
  };
}
