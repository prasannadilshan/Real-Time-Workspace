import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, LogOut, Search, Clock, Users, Trash2, X, Bell, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface Document {
  _id: string;
  title: string;
  updatedAt: string;
  ownerId: string;
  permissions: string[];
}

interface Invite {
  _id: string;
  documentId: {
    _id: string;
    title: string;
  };
  inviterProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  role: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Rename State
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Invites State
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showInvitesDropdown, setShowInvitesDropdown] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const res = await api.get('/invites');
      setInvites(res.data.invites || []);
    } catch (err) {
      console.error('Failed to fetch invites', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || creating) return;
    
    setCreating(true);
    try {
      const res = await api.post('/documents', { title: newDocTitle.trim() });
      navigate(`/document/${res.data.document._id}`);
    } catch (err) {
      console.error('Failed to create document', err);
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(d => d._id !== docId));
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation(); // prevent card click
    if (!renameTitle.trim()) {
      setRenamingDocId(null);
      return;
    }
    
    try {
      await api.put(`/documents/${docId}`, { title: renameTitle.trim() });
      setDocuments(documents.map(d => d._id === docId ? { ...d, title: renameTitle.trim() } : d));
      setRenamingDocId(null);
    } catch (err) {
      console.error('Failed to rename document', err);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await api.post(`/invites/${inviteId}/accept`);
      setInvites(invites.filter(i => i._id !== inviteId));
      fetchDocuments(); // refresh docs to show newly accepted doc
    } catch (err) {
      console.error('Failed to accept invite', err);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await api.post(`/invites/${inviteId}/decline`);
      setInvites(invites.filter(i => i._id !== inviteId));
    } catch (err) {
      console.error('Failed to decline invite', err);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 p-2 rounded-lg ring-1 ring-emerald-500/20">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">
                Real-time Editor
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setShowInvitesDropdown(!showInvitesDropdown)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {invites.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-neutral-900" />
                  )}
                </button>

                {showInvitesDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="p-3 text-sm font-semibold text-neutral-300 border-b border-neutral-800 bg-neutral-900/80">
                      Pending Invites ({invites.length})
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {invites.length === 0 ? (
                        <div className="p-6 text-center text-neutral-500 text-sm">
                          No pending invites
                        </div>
                      ) : (
                        invites.map(invite => (
                          <div key={invite._id} className="p-4 border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/50 transition-colors">
                            <div className="text-sm mb-3 text-neutral-300">
                              <span className="font-semibold text-white">@{invite.inviterProfileId.username}</span> invited you to edit <span className="font-semibold text-white">{invite.documentId.title}</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAcceptInvite(invite._id)}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button 
                                onClick={() => handleDeclineInvite(invite._id)}
                                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-neutral-400 hidden sm:block">
                @{user?.username}
              </div>
              <button
                onClick={logout}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Your Documents</h1>
          <button
            onClick={() => {
              setNewDocTitle('');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          >
            <Plus className="w-5 h-5" />
            New Document
          </button>
        </div>

        <div className="relative mb-8 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-500" />
          </div>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900/50 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-neutral-600"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-neutral-900/50 rounded-2xl animate-pulse border border-neutral-800/50"></div>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 border-dashed">
            <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-300 mb-1">No documents found</h3>
            <p className="text-neutral-500 text-sm">
              {search ? 'Try adjusting your search' : 'Get started by creating a new document'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocs.map((doc) => {
              const isOwner = doc.ownerId === user?._id;
              
              return (
              <div
                key={doc._id}
                onClick={() => navigate(`/document/${doc._id}`)}
                className="group bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all cursor-pointer flex flex-col h-48 relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4 flex-1">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "p-2 rounded-lg ring-1 mt-1 shrink-0",
                      isOwner ? "bg-blue-500/10 ring-blue-500/20 text-blue-400" : "bg-purple-500/10 ring-purple-500/20 text-purple-400"
                    )}>
                      {isOwner ? <FileText className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>
                    
                    {renamingDocId === doc._id ? (
                      <form 
                        onSubmit={(e) => handleRenameSubmit(e, doc._id)} 
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                          onBlur={(e) => handleRenameSubmit(e as any, doc._id)}
                          className="w-full bg-neutral-950 border border-neutral-700 text-white rounded px-2 py-1 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </form>
                    ) : (
                      <h3 className="text-lg font-medium text-neutral-200 line-clamp-2 group-hover:text-emerald-400 transition-colors break-words">
                        {doc.title}
                      </h3>
                    )}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0">
                    {isOwner && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTitle(doc.title);
                            setRenamingDocId(doc._id);
                          }}
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs p-1.5 rounded-md ring-1 ring-neutral-700 font-medium transition-colors"
                          title="Rename document"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteDocument(e, doc._id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs p-1.5 rounded-md ring-1 ring-red-500/20 font-medium transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <div className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 flex items-center rounded-md ring-1 ring-emerald-500/20 font-medium h-7">
                      Open
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-neutral-800/50 flex items-center justify-between text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <span className="capitalize px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {isOwner ? 'owner' : (doc.permissions?.includes('write') ? 'editor' : 'viewer')}
                  </span>
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* Create Document Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create Document</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDocument}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g., Project Proposal"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDocTitle.trim() || creating}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
