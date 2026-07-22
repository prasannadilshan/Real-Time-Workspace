import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Share2, Loader2, AlertCircle } from 'lucide-react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import QuillCursors from 'quill-cursors';
import 'quill/dist/quill.snow.css';

import api, { getAuthToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Register Quill modules
Quill.register('modules/cursors', QuillCursors);

interface DocumentDetails {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  updatedAt: string;
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [docDetails, setDocDetails] = useState<DocumentDetails | null>(null);
  const [title, setTitle] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  // Fetch Initial Document Details
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/documents/${id}`);
        setDocDetails(res.data.document);
        setTitle(res.data.document.title);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchDoc();
  }, [id]);

  // Initialize Yjs and Quill
  useEffect(() => {
    if (loading || error || !id || !editorContainerRef.current) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const token = getAuthToken();
    const provider = new WebsocketProvider(
      'ws://localhost:4001',
      id,
      ydoc,
      { params: { token: token || '' } }
    );
    providerRef.current = provider;

    const ytext = ydoc.getText('quill');

    // Create Quill instance if it doesn't exist
    if (!quillRef.current) {
      const editorDiv = document.createElement('div');
      editorContainerRef.current.appendChild(editorDiv);

      const quill = new Quill(editorDiv, {
        theme: 'snow',
        modules: {
          cursors: true,
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image', 'code-block'],
            ['clean']
          ]
        },
        placeholder: 'Start collaborating...'
      });
      quillRef.current = quill;
    }

    const binding = new QuillBinding(ytext, quillRef.current, provider.awareness);

    // Set local awareness for cursors
    if (user && user.username) {
      // Generate a deterministic but pseudo-random color based on user's username
      const hash = user.username.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
      const color = '#' + Math.abs(hash).toString(16).substring(0, 6).padStart(6, '0');

      provider.awareness.setLocalStateField('user', {
        name: user.username,
        color: color
      });
    }

    return () => {
      binding.destroy();
      provider.disconnect();
      ydoc.destroy();
      
      // Cleanup DOM
      if (editorContainerRef.current && quillRef.current) {
         editorContainerRef.current.innerHTML = '';
         quillRef.current = null;
      }
    };
  }, [id, loading, error, user]);

  const handleSaveTitle = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      // Content is synced via Yjs, so we only need to update the title RESTfully here.
      // But we can also pass the plain text content or just leave it empty.
      const plainText = quillRef.current?.getText() || '';
      await api.put(`/documents/${id}`, { title, content: plainText });
    } catch (err) {
      console.error('Failed to save title', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !docDetails) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl ring-1 ring-red-500/20 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-xl font-semibold mb-2">Oops!</h2>
          <p className="text-red-400/80 mb-6">{error || 'Document not found'}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans">
      {/* Editor Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 flex-1">
          <button 
            onClick={() => navigate('/')}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            className="bg-transparent border-none outline-none text-white font-medium text-lg focus:ring-1 focus:ring-neutral-700 rounded px-2 py-0.5 w-full max-w-md truncate"
            placeholder="Document Title"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-950" title={user?.username}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-400 z-10" title="Online via Yjs">
              Yjs
            </div>
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm font-medium transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          
          <button 
            onClick={handleSaveTitle}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Editor Main Area using Quill */}
      <main className="flex-1 flex flex-col relative bg-neutral-950 items-center overflow-auto py-8">
        <div className="absolute top-4 right-8 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full ring-1 ring-emerald-500/40 flex items-center gap-2 z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium">Live Sync Active</span>
        </div>
        
        {/* Quill container with custom Tailwind styling for dark mode */}
        <div 
          ref={editorContainerRef} 
          className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden min-h-[600px] quill-dark-theme-override"
        />
      </main>
    </div>
  );
}
