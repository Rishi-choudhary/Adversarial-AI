'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ThemeResult {
  url: string;
  screenshot?: string;
  stats: {
    sections: number;
    templates: number;
    css: number;
    js: number;
  };
  sections: string[];
  fileSize: string;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [result, setResult] = useState<ThemeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStructure, setShowStructure] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/preview/${jobId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch results');
        }
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  const handleDownload = () => {
    window.location.href = `/api/jobs/${jobId}/download`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">🔄</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Results</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Link href="/" className="btn-primary inline-block">
            Start New Conversion
          </Link>
        </div>
      </div>
    );
  }

  const displayUrl = result?.url ? new URL(result.url).hostname : 'website';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
              ThemeForge
            </span>
          </Link>
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            New Conversion
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-full mb-4">
              <span className="text-lg">✅</span>
              <span className="font-medium">Theme Ready!</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {displayUrl}
            </h1>
          </div>

          {/* Theme Preview Card */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Theme Preview
            </h2>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              {result?.screenshot ? (
                <img
                  src={result.screenshot}
                  alt="Website screenshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-400 dark:text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Preview not available</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Generated Files
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-2xl mb-1">📁</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {result?.stats.sections || 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">sections</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-2xl mb-1">📄</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {result?.stats.templates || 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">templates</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-2xl mb-1">🎨</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {result?.stats.css || 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">CSS</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {result?.stats.js || 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">JS</div>
              </div>
            </div>
          </div>

          {/* Sections Created */}
          {result?.sections && result.sections.length > 0 && (
            <div className="card p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Sections Created
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.sections.map((section, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Download Section */}
          <div className="card p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <button onClick={handleDownload} className="btn-primary text-lg py-4 px-8 w-full sm:w-auto">
                ⬇️ Download Theme ZIP ({result?.fileSize || '0 MB'})
              </button>
              <button
                onClick={() => setShowStructure(!showStructure)}
                className="btn-secondary text-lg py-4 px-8 w-full sm:w-auto"
              >
                👁️ {showStructure ? 'Hide' : 'Preview'} Structure
              </button>
            </div>
          </div>

          {/* File Structure Preview (Page 4 integrated) */}
          {showStructure && <FileExplorer jobId={jobId} />}

          {/* Installation Instructions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📖</span> How to install
            </h2>
            <ol className="space-y-3 text-slate-600 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <span>Go to Shopify Admin → Online Store → Themes</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <span>Click &quot;Add theme&quot; → &quot;Upload zip file&quot;</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <span>Upload your theme.zip</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold">
                  4
                </span>
                <span>Click &quot;Customize&quot; to edit content</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

// File Explorer Component (Page 4)
function FileExplorer({ jobId }: { jobId: string }) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  interface FileNode {
    name: string;
    type: 'folder' | 'file';
    children?: FileNode[];
    path?: string;
    count?: number;
  }

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const response = await fetch(`/api/preview/${jobId}?tree=true`);
        if (response.ok) {
          const data = await response.json();
          setFileTree(data.tree);
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    };
    fetchTree();
  }, [jobId]);

  const fetchFileContent = async (path: string) => {
    try {
      const response = await fetch(`/api/preview/${jobId}?file=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content);
        setSelectedFile(path);
      }
    } catch {
      // Ignore errors
    }
  };

  const getFileIcon = (name: string, type: string) => {
    if (type === 'folder') return '📁';
    if (name.endsWith('.css')) return '🎨';
    if (name.endsWith('.js')) return '⚡';
    if (name.endsWith('.liquid')) return '💧';
    if (name.endsWith('.json')) return '📋';
    if (name.match(/\.(webp|png|jpg|jpeg|gif|svg)$/)) return '🖼️';
    return '📄';
  };

  const renderTree = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'folder';
    const icon = getFileIcon(node.name, node.type);

    return (
      <div key={node.path || node.name} style={{ marginLeft: depth * 16 }}>
        <div
          className={`file-tree-item ${isFolder ? 'file-tree-folder' : 'file-tree-file'}`}
          onClick={() => !isFolder && node.path && fetchFileContent(node.path)}
        >
          <span>{icon}</span>
          <span className="flex-1">{node.name}</span>
          {node.count && <span className="text-xs text-slate-400">({node.count} files)</span>}
          {!isFolder && node.name.endsWith('.liquid') && (
            <span className="text-xs text-orange-500 hover:text-orange-600">[Preview]</span>
          )}
        </div>
        {isFolder && node.children?.map((child) => renderTree(child, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin text-2xl">🔄</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Theme Structure Preview
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
        {/* File Tree */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-h-96 overflow-auto">
          {fileTree ? (
            renderTree(fileTree)
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">
              File tree not available
            </p>
          )}
        </div>

        {/* File Content Preview */}
        <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-auto">
          {selectedFile ? (
            <>
              <div className="text-xs text-slate-400 mb-2">{selectedFile}</div>
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {fileContent}
              </pre>
            </>
          ) : (
            <p className="text-slate-500 text-center py-4">
              Click any file to preview its code
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
