import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginSuccessRate = new Rate('login_success');
const courseAccessRate = new Rate('course_access');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms
    errors: ['rate<0.05'],                           // Error rate must be below 5%
    login_success: ['rate>0.95'],                    // Login success rate must be above 95%
    course_access: ['rate>0.90'],                    // Course access success rate must be above 90%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Test data
const testUsers = [
  { email: 'student1@test.com', password: 'TestPass123!' },
  { email: 'student2@test.com', password: 'TestPass123!' },
  { email: 'professor@test.com', password: 'TestPass123!' },
];

// Helper function to get random user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Helper function to handle response
function handleResponse(res, successRate) {
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  if (successRate) {
    successRate.add(success);
  }
  
  return success;
}

// User scenario: Login and browse courses
export default function () {
  const user = getRandomUser();
  let authToken = null;
  
  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (handleResponse(loginRes, loginSuccessRate)) {
    const loginData = JSON.parse(loginRes.body);
    authToken = loginData.access_token;
  } else {
    console.error('Login failed:', loginRes.status, loginRes.body);
    return;
  }
  
  sleep(1);
  
  // 2. Get user courses
  const coursesRes = http.get(`${BASE_URL}/api/v1/courses`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  if (handleResponse(coursesRes, courseAccessRate)) {
    const courses = JSON.parse(coursesRes.body);
    
    // 3. Access a random course if available
    if (courses.length > 0) {
      const randomCourse = courses[Math.floor(Math.random() * courses.length)];
      sleep(1);
      
      const courseDetailRes = http.get(
        `${BASE_URL}/api/v1/courses/${randomCourse.id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );
      
      handleResponse(courseDetailRes);
      
      // 4. Get course modules
      sleep(1);
      const modulesRes = http.get(
        `${BASE_URL}/api/v1/modules?course_id=${randomCourse.id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );
      
      handleResponse(modulesRes);
    }
  }
  
  // 5. Access user todos
  sleep(1);
  const todosRes = http.get(`${BASE_URL}/api/v1/todos`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  handleResponse(todosRes);
  
  // 6. Simulate reading time
  sleep(Math.random() * 5 + 2);
  
  // 7. Logout
  const logoutRes = http.post(
    `${BASE_URL}/auth/logout`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
  
  handleResponse(logoutRes);
}

// Stress test scenario
export function stressTest() {
  const user = getRandomUser();
  
  // Rapid fire requests
  for (let i = 0; i < 10; i++) {
    http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// File upload scenario
export function fileUploadTest() {
  const user = getRandomUser();
  let authToken = null;
  
  // Login first
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (loginRes.status === 200) {
    const loginData = JSON.parse(loginRes.body);
    authToken = loginData.access_token;
    
    // Upload a file
    const payload = {
      file: http.file('test.pdf', 'dummy content', 'test.pdf'),
    };
    
    const uploadRes = http.post(
      `${BASE_URL}/api/v1/files/upload`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );
    
    handleResponse(uploadRes);
  }
}