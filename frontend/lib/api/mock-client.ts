/**
 * MOCK API CLIENT
 * Returns dummy data without making actual API calls
 * For development without backend/auth
 */

// Mock user profile
const MOCK_USER = {
  id: 'mock-user-id',
  email: 'demo@learn-x.com',
  display_name: 'Demo User',
  role: 'student',
  has_completed_onboarding: true,
  created_at: new Date().toISOString()
}

// Mock courses data
const MOCK_COURSES = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    description: 'Learn the fundamentals of machine learning and AI',
    instructor_name: 'Dr. Smith',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_enrolled: true,
    progress: 65
  },
  {
    id: '2',
    title: 'Web Development Fundamentals',
    description: 'Master HTML, CSS, and JavaScript',
    instructor_name: 'Prof. Johnson',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_enrolled: true,
    progress: 80
  },
  {
    id: '3',
    title: 'Data Structures and Algorithms',
    description: 'Essential computer science concepts',
    instructor_name: 'Dr. Lee',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_enrolled: false,
    progress: 0
  }
]

// Mock modules data
const MOCK_MODULES = {
  '1': [
    { id: 'm1', title: 'Introduction to ML', course_id: '1', order_index: 1 },
    { id: 'm2', title: 'Supervised Learning', course_id: '1', order_index: 2 },
    { id: 'm3', title: 'Neural Networks', course_id: '1', order_index: 3 }
  ],
  '2': [
    { id: 'm4', title: 'HTML Basics', course_id: '2', order_index: 1 },
    { id: 'm5', title: 'CSS Styling', course_id: '2', order_index: 2 },
    { id: 'm6', title: 'JavaScript Programming', course_id: '2', order_index: 3 }
  ],
  '3': [
    { id: 'm7', title: 'Arrays and Lists', course_id: '3', order_index: 1 },
    { id: 'm8', title: 'Trees and Graphs', course_id: '3', order_index: 2 },
    { id: 'm9', title: 'Sorting Algorithms', course_id: '3', order_index: 3 }
  ]
}

// Mock dashboard data
const MOCK_DASHBOARD = {
  recent_courses: MOCK_COURSES.slice(0, 2),
  total_courses: 3,
  completed_courses: 0,
  in_progress_courses: 2,
  total_study_time: 1250,
  current_streak: 5,
  xp_points: 450,
  achievements: [
    { id: 'a1', name: 'First Steps', description: 'Complete your first lesson', earned_at: new Date().toISOString() },
    { id: 'a2', name: 'Week Warrior', description: 'Study for 7 days in a row', earned_at: new Date().toISOString() }
  ]
}

class MockAPIClient {
  async request(endpoint: string, options: any = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))

    // Route to appropriate mock response
    if (endpoint.includes('/auth/profile')) {
      return { data: MOCK_USER, status: 'success' }
    }
    
    if (endpoint.includes('/courses') && !endpoint.includes('/modules')) {
      if (endpoint.match(/\/courses\/\d+$/)) {
        const id = endpoint.split('/').pop()
        const course = MOCK_COURSES.find(c => c.id === id)
        return { data: course, status: 'success' }
      }
      return { data: MOCK_COURSES, status: 'success' }
    }
    
    if (endpoint.includes('/modules')) {
      const courseId = endpoint.match(/courses\/(\d+)/)?.[1]
      return { data: MOCK_MODULES[courseId as keyof typeof MOCK_MODULES] || [], status: 'success' }
    }
    
    if (endpoint.includes('/dashboard')) {
      return { data: MOCK_DASHBOARD, status: 'success' }
    }
    
    if (endpoint.includes('/todos')) {
      return { 
        data: [
          { id: 't1', title: 'Complete ML Introduction', completed: false, due_date: new Date().toISOString() },
          { id: 't2', title: 'Practice JavaScript exercises', completed: true, due_date: new Date().toISOString() }
        ], 
        status: 'success' 
      }
    }

    // Default response
    return { data: {}, status: 'success' }
  }
  
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' })
  }
  
  async post(endpoint: string, data?: any) {
    return this.request(endpoint, { method: 'POST', body: data })
  }
  
  async put(endpoint: string, data?: any) {
    return this.request(endpoint, { method: 'PUT', body: data })
  }
  
  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

const client = new MockAPIClient()

// Properly bind methods for export
export const mockApiClient = {
  get: client.get.bind(client),
  post: client.post.bind(client),
  put: client.put.bind(client),
  delete: client.delete.bind(client),
  patch: client.put.bind(client), // Mock patch as put
  stream: async () => {}, // Mock streaming
}