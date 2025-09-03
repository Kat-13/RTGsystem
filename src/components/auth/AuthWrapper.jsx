import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth } from '../../lib/supabase';
import dataService from '../../services/dataService';
import LoginForm from './LoginForm';

// Auth Context
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthWrapper');
  }
  return context;
};

function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
      setLoading(false);

      // If user exists, initialize their project
      if (currentUser) {
        const project = await dataService.initializeUserProject(currentUser.id);
        if (project) {
          setCurrentProject(project);
        }
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session.user);
          // Initialize user's project data
          const project = await dataService.initializeUserProject(session.user.id);
          if (project) {
            setCurrentProject(project);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setCurrentProject(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [currentProject]);

  const signIn = async (email, password) => {
    const { data, error } = await auth.signIn(email, password);
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await auth.signUp(email, password);
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await auth.signOut();
    if (error) throw error;
  };

  const authValue = {
    user,
    currentProject,
    signIn,
    signUp,
    signOut,
    loading
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RTG System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthContext.Provider value={authValue}>
        <LoginForm />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthWrapper;
