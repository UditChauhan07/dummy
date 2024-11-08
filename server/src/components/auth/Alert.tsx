import React from 'react'; 

import * as AlertDialog from '@radix-ui/react-alert-dialog'; 
import { ExclamationTriangleIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';

import { AlertProps } from '@/interfaces'; 


const Alert: React.FC<AlertProps> = ({ type, title, message, isOpen, onClose }) => {
    const getAlertStyles = (): { bgColor: string; textColor: string; hoverColor: string; icon: JSX.Element } => {
        switch (type) {
          case 'error':
            return { bgColor: 'bg-rose-500', textColor: 'bg-rose-500', hoverColor: 'hover:bg-rose-700', icon: <CrossCircledIcon className="w-12 h-12 text-white" /> };
          case 'success':
            return { bgColor: 'bg-green-500', textColor: 'bg-green-500', hoverColor: 'hover:bg-green-700', icon: <CheckCircledIcon className="w-12 h-12 text-white" /> };
          case 'warning':
            return { bgColor: 'bg-yellow-400', textColor: 'bg-yellow-400', hoverColor: 'hover:bg-yellow-700', icon: <ExclamationTriangleIcon className="w-12 h-12 text-white" /> };
          default:
            return { bgColor: 'bg-gray-100', textColor: 'bg-gray-600', hoverColor: 'hover:bg-gray-700', icon: <ExclamationTriangleIcon className="w-12 h-12 text-gray-500" /> };
        }
      };
    
      const { bgColor, textColor, hoverColor, icon } = getAlertStyles();
    
      return (
        <AlertDialog.Root open={isOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`rounded-lg shadow-lg overflow-hidden min-w-52 max-w-80 w-full ${bgColor}`}>
                <div className="p-4">
                  <div className="flex justify-center">
                    {icon}
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 text-center">
                    <h3 className="ml-2 text-3xl font-semibold">{title}</h3>
                    <p className="mt-2 text-sm text-slate-500 break-words">{message}</p>
                  <AlertDialog.Action asChild>
                    <button
                      onClick={onClose}
                      className={`mt-4 px-4 py-1 text-sm font-medium text-white ${textColor} rounded-full ${hoverColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      Close
                    </button>
                  </AlertDialog.Action>
                </div>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      );
};

export default Alert;