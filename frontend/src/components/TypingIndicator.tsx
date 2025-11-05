export default function TypingIndicator() {
  return (
    <div className="flex items-start justify-start">
      <div className="max-w-3xl px-5 py-3 rounded-xl shadow-sm bg-biat-50 border border-biat-100">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-biat-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-biat-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-biat-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
