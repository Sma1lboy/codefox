'use client';

import { useState } from 'react';
import { SendIcon } from 'lucide-react';

export default function HomePage() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="h-[400px] p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-3 max-w-[80%]">
                <p className="text-gray-800 dark:text-gray-200">
                  Hello! How can I help you today?
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <button className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <SendIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}