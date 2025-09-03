import React, { useState, useEffect } from 'react'; 
import { Plus, Tag, X } from 'lucide-react';
import { WhiteboardNote, Stream, User } from '../data/rtgAEDataModel';
import { ProjectAwareDataStorage } from '../data/projectManager';

const WhiteboardLevel = () => {
  const [notes, setNotes] = useState([]);
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState('all');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [projectDates, setProjectDates] = useState({
    kickoff: '',
    goLive: '',
    helpdeskHandoff: ''
  });
  const [showProjectDatesModal, setShowProjectDatesModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedNotes = ProjectAwareDataStorage.load('whiteboard_notes', []);
    const loadedStreams = ProjectAwareDataStorage.load('streams', []);
    const loadedUsers = ProjectAwareDataStorage.loadUsers();
    const loadedProjectDates = ProjectAwareDataStorage.load('project_dates', {
      kickoff: '',
      goLive: '',
      helpdeskHandoff: ''
    });
    
    // Filter out promoted notes
    const unpromoted = loadedNotes.filter(note => !note.promoted_to_l1);
    setNotes(unpromoted);
    setStreams(loadedStreams);
    setUsers(loadedUsers);
    setProjectDates(loadedProjectDates);
  };

  const filteredNotes = notes.filter(note => {
    const matchesStream = selectedStream === 'all' || note.stream === selectedStream;
    return matchesStream;
  });

  const handleCreateNote = (noteData) => {
    const newNote = new WhiteboardNote(
      ProjectAwareDataStorage.generateId(),
      noteData.title,
      noteData.description,
      noteData.tags,
      noteData.stream
    );
    
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    
    // Save to storage
    const allNotes = ProjectAwareDataStorage.load('whiteboard_notes', []);
    allNotes.push(newNote);
    ProjectAwareDataStorage.save('whiteboard_notes', allNotes);
    
    setShowNoteModal(false);
  };

  const handleDeleteNote = (noteId) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    
    // Update storage
    const allNotes = ProjectAwareDataStorage.load('whiteboard_notes', []);
    const filteredAllNotes = allNotes.filter(note => note.id !== noteId);
    ProjectAwareDataStorage.save('whiteboard_notes', filteredAllNotes);
  };

  const handleSaveProjectDates = (dates) => {
    setProjectDates(dates);
    ProjectAwareDataStorage.save('project_dates', dates);
    setShowProjectDatesModal(false);
  };

  const handleCreateUser = (userData) => {
    const newUser = new User(
      ProjectAwareDataStorage.generateId(),
      userData.name,
      userData.email,
      userData.role
    );
    
    ProjectAwareDataStorage.addUser(newUser);
    setUsers([...users, newUser]);
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleUpdateUser = (userData) => {
    const updatedUser = ProjectAwareDataStorage.updateUser(editingUser.id, userData);
    if (updatedUser) {
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      setShowUserModal(false);
      setEditingUser(null);
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      ProjectAwareDataStorage.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">L0</span>
            </div>
            Whiteboard
          </h2>
          <p className="text-gray-600 mt-1">Free-form problem mapping and early-stage thinking</p>
        </div>
        <button
          onClick={() => setShowNoteModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Project Start to Finish Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Start to Finish</h3>
          <button
            onClick={() => setShowProjectDatesModal(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {projectDates.kickoff || projectDates.goLive || projectDates.helpdeskHandoff ? 'Edit Dates' : 'Set Dates'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Kickoff</div>
            <div className="font-medium text-gray-900">
              {projectDates.kickoff ? new Date(projectDates.kickoff).toLocaleDateString() : 'Not set'}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Go Live Projection</div>
            <div className="font-medium text-gray-900">
              {projectDates.goLive ? new Date(projectDates.goLive).toLocaleDateString() : 'Not set'}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Helpdesk Handoff</div>
            <div className="font-medium text-gray-900">
              {projectDates.helpdeskHandoff ? new Date(projectDates.helpdeskHandoff).toLocaleDateString() : 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Team Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
          <button
            onClick={() => setShowUserModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </button>
        </div>
        
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No team members added yet.</p>
            <p className="text-sm mt-1">Add team members to assign deliverables and track accountability.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(user => (
              <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{user.name}</h4>
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setShowUserModal(true);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end mb-6">
        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        >
          <option value="all">All Streams</option>
          <option value={null}>Unassigned</option>
          {streams.map(stream => (
            <option key={stream.id} value={stream.id}>{stream.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            streams={streams}
            onDelete={handleDeleteNote}
          />
        ))}
        
        {filteredNotes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
            <p className="text-gray-500 mb-4">Start capturing problems, ideas, and early-stage thinking</p>
            <button
              onClick={() => setShowNoteModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Create First Note
            </button>
          </div>
        )}
      </div>

      {showNoteModal && (
        <NoteModal
          streams={streams}
          onSave={handleCreateNote}
          onClose={() => setShowNoteModal(false)}
        />
      )}

      {showProjectDatesModal && (
        <ProjectDatesModal
          projectDates={projectDates}
          onSave={handleSaveProjectDates}
          onClose={() => setShowProjectDatesModal(false)}
        />
      )}

      {showUserModal && (
        <UserModal
          editingUser={editingUser}
          onSave={editingUser ? handleUpdateUser : handleCreateUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

const NoteCard = ({ note, streams, onDelete }) => {
  const stream = streams.find(s => s.id === note.stream);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 flex-1">{note.title}</h3>
        <button
          onClick={() => onDelete(note.id)}
          className="text-gray-400 hover:text-red-500 ml-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-3">{note.description}</p>
      
      {stream && (
        <div className="mb-3">
          <span
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: stream.color }}
          >
            {stream.name}
          </span>
        </div>
      )}
      
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const NoteModal = ({ streams, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({
        title: title.trim(),
        description: description.trim(),
        stream: selectedStream || null,
        tags
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Note</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Capture problems, ideas, and early-stage thinking..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stream/Domain
            </label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No stream assigned</option>
              {streams.map(stream => (
                <option key={stream.id} value={stream.id}>{stream.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectDatesModal = ({ projectDates, onSave, onClose }) => {
  const [kickoff, setKickoff] = useState(projectDates.kickoff || '');
  const [goLive, setGoLive] = useState(projectDates.goLive || '');
  const [helpdeskHandoff, setHelpdeskHandoff] = useState(projectDates.helpdeskHandoff || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      kickoff,
      goLive,
      helpdeskHandoff
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Project Start to Finish Dates</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kickoff Date
            </label>
            <input
              type="date"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Go Live Projection
            </label>
            <input
              type="date"
              value={goLive}
              onChange={(e) => setGoLive(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Helpdesk Handoff Date
            </label>
            <input
              type="date"
              value={helpdeskHandoff}
              onChange={(e) => setHelpdeskHandoff(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save Dates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserModal = ({ onSave, onClose, editingUser = null }) => {
  const [name, setName] = useState(editingUser?.name || '');
  const [email, setEmail] = useState(editingUser?.email || '');
  const [role, setRole] = useState(editingUser?.role || 'Team Member');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onSave({ name: name.trim(), email: email.trim(), role });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingUser ? 'Edit Team Member' : 'Add Team Member'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Team Member">Team Member</option>
              <option value="Lead">Lead</option>
              <option value="Manager">Manager</option>
              <option value="Director">Director</option>
              <option value="Contractor">Contractor</option>
              <option value="Consultant">Consultant</option>
            </select>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {editingUser ? 'Update' : 'Add'} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WhiteboardLevel;
