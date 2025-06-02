'use client';

import { useState, useEffect } from 'react';
import { auth } from '../../firebaseconfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { courseAPI } from '@/lib/api';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Monitor auth state
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        addLog(`🔥 Firebase user authenticated: ${firebaseUser.email || firebaseUser.uid}`);
        
        // Try to get token
        firebaseUser.getIdToken().then(token => {
          addLog(`🎫 Firebase token length: ${token.length}`);
        }).catch(err => {
          addLog(`❌ Failed to get Firebase token: ${err.message}`);
        });
      } else {
        addLog('🚫 No Firebase user authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  const testAnonymousSignIn = async () => {
    try {
      addLog('🔄 Attempting anonymous sign in...');
      const result = await signInAnonymously(auth);
      addLog(`✅ Anonymous sign in successful: ${result.user.uid}`);
    } catch (error: any) {
      addLog(`❌ Anonymous sign in failed: ${error.message}`);
    }
  };

  const testCoursesAPI = async () => {
    try {
      addLog('🔄 Testing courses API...');
      const coursesData = await courseAPI.getCourses();
      addLog(`📚 Courses received: ${coursesData.length} courses`);
      setCourses(coursesData);
    } catch (error: any) {
      addLog(`❌ Courses API failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Authentication & API</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Controls</h2>
          
          <button
            onClick={testAnonymousSignIn}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Anonymous Sign In
          </button>
          
          <button
            onClick={testCoursesAPI}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test Courses API
          </button>
          
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Current User:</h3>
            {user ? (
              <div>
                <p>UID: {user.uid}</p>
                <p>Email: {user.email || 'No email'}</p>
                <p>Anonymous: {user.isAnonymous ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p>Not authenticated</p>
            )}
          </div>
        </div>
        
        {/* Debug Log */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Debug Log</h2>
          <div className="bg-black text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
            {debugInfo.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Courses Data */}
      {courses.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Courses Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(courses, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}