export default function TypingIndicator() {
  return (
    <div className="flex items-start justify-start">
      <div className="max-w-3xl px-5 py-3 rounded-xl shadow-sm bg-biat-50 border border-biat-100 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-biat-primary rounded-full animate-bounce dark:bg-biat-primary" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-biat-primary rounded-full animate-bounce dark:bg-biat-primary" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-biat-primary rounded-full animate-bounce dark:bg-biat-primary" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
