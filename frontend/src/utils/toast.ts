import toast from 'react-hot-toast';

// Toast configuration with BIAT brand colors
const toastConfig = {
  duration: 4000,
  style: {
    background: '#fff',
    color: '#134a21',
    border: '1px solid #1a6b2e',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  success: {
    iconTheme: {
      primary: '#134a21',
      secondary: '#fff',
    },
  },
  error: {
    iconTheme: {
      primary: '#dc3545',
      secondary: '#fff',
    },
    duration: 5000,
  },
};

// Success toast
export const showSuccess = (message: string) => {
  toast.success(message, {
    ...toastConfig,
    ...toastConfig.success,
  });
};

// Error toast
export const showError = (message: string) => {
  toast.error(message, {
    ...toastConfig,
    ...toastConfig.error,
  });
};

// Info toast
export const showInfo = (message: string) => {
  toast(message, {
    ...toastConfig,
    icon: 'ℹ️',
  });
};

// Warning toast
export const showWarning = (message: string) => {
  toast(message, {
    ...toastConfig,
    icon: '⚠️',
    style: {
      ...toastConfig.style,
      border: '1px solid #ffc107',
    },
  });
};

// Loading toast
export const showLoading = (message: string) => {
  return toast.loading(message, toastConfig);
};

// Dismiss toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Promise toast - shows loading, then success/error based on promise result
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    toastConfig
  );
};
