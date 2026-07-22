import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Share2, Loader2, AlertCircle, X, Search, UserPlus } from 'lucide-react';
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

interface Collaborator {
  _id: string;
  name: string;
  permissions: string[];
}

interface ProfileSearchResult {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
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

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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

    const fetchCollaborators = async () => {
      try {
        const res = await api.get(`/documents/${id}/collaborators`);
        setCollaborators(res.data.collaborators || []);
      } catch (err) {
        console.error('Failed to load collaborators', err);
      }
    };
    
    if (id) {
      fetchDoc();
      fetchCollaborators();
    }
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

  const handleSaveDocument = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const htmlContent = quillRef.current?.root.innerHTML || '';
      await api.put(`/documents/${id}`, { title, content: htmlContent });
    } catch (err) {
      console.error('Failed to save document', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSearchProfiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/profiles/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.profiles || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddCollaborator = async (profileId: string) => {
    try {
      await api.post(`/invites/documents/${id}`, { profileId, role: 'editor' });
      
      // We don't refresh collaborators immediately because they have to accept first
      // But we can clear the search and maybe show a quick toast or alert.
      setSearchQuery('');
      setSearchResults([]);
      alert("Invite sent successfully!");
    } catch (err: any) {
      console.error('Failed to send invite', err);
      alert(err.response?.data?.error || 'Failed to send invite');
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
            onBlur={handleSaveDocument}
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

          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          
          <button 
            onClick={handleSaveDocument}
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

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Share Document</h2>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-neutral-500" />
              </div>
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={handleSearchProfiles}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
              />
              {searching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mb-6 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-neutral-900/50 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase">
                  Search Results
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {searchResults.map(p => (
                    <div key={p._id} className="flex items-center justify-between p-3 border-b border-neutral-800/50 last:border-0 hover:bg-neutral-900 transition-colors">
                      <div>
                        <div className="text-sm font-medium text-neutral-200">@{p.username}</div>
                        <div className="text-xs text-neutral-500">{p.firstName} {p.lastName}</div>
                      </div>
                      <button 
                        onClick={() => handleAddCollaborator(p._id)}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                        title="Add as Editor"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Collaborators</h3>
              {collaborators.length === 0 ? (
                <p className="text-sm text-neutral-500 italic">No collaborators yet.</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map(c => (
                    <div key={c._id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold ring-1 ring-purple-500/30">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-medium text-neutral-200">{c.name}</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-neutral-900 text-neutral-400 rounded-md capitalize">
                        {c.permissions.includes('write') ? 'Editor' : 'Viewer'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
