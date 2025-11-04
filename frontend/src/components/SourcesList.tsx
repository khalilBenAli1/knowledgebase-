interface SourcesListProps {
  sources: Array<{
    documentId: string;
    documentName: string;
    page?: number;
    article?: string;
    heading?: string;
  }>;
}

export default function SourcesList({ sources }: SourcesListProps) {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sources utilisées</h3>
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <div className="font-medium text-sm text-blue-900">{source.documentName}</div>
            <div className="mt-1 text-xs text-gray-600 space-y-1">
              {source.page && <div>Page: {source.page}</div>}
              {source.article && <div>Article: {source.article}</div>}
              {source.heading && <div>Section: {source.heading}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
