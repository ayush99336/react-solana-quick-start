import toast from 'react-hot-toast';

export const showTransactionToast = (signature: string, network: 'devnet' | 'mainnet' = 'devnet') => {
  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  
  // Show success toast with transaction info
  toast.success(
    `Transaction confirmed! ${signature.slice(0, 8)}...${signature.slice(-8)}`,
    {
      duration: 8000,
      style: {
        background: '#10b981',
        color: 'white',
        borderRadius: '8px',
        padding: '12px 16px',
        maxWidth: '400px'
      },
      iconTheme: {
        primary: '#10b981',
        secondary: 'white'
      }
    }
  );
  
  // Show clickable link toast
  setTimeout(() => {
    toast.custom(
      (t) => (
        <div 
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  View Transaction
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Click to open in Solana Explorer
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                window.open(explorerUrl, '_blank');
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Open
            </button>
          </div>
        </div>
      ),
      {
        duration: 6000,
        position: 'bottom-right'
      }
    );
  }, 1500);
};

export const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 5000,
    style: {
      background: '#ef4444',
      color: 'white',
      borderRadius: '8px',
      padding: '12px 16px'
    }
  });
};

export const showLoadingToast = (message: string) => {
  return toast.loading(message, {
    style: {
      background: '#6b7280',
      color: 'white',
      borderRadius: '8px',
      padding: '12px 16px'
    }
  });
};

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 4000,
    style: {
      background: '#10b981',
      color: 'white',
      borderRadius: '8px',
      padding: '12px 16px'
    }
  });
};
