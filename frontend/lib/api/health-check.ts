/**
 * API Health Check Utilities
 */

export async function checkAPIHealth() {
  try {
    const response = await fetch('http://localhost:8080/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        isHealthy: true,
        message: 'API is running',
        data
      };
    }
    
    return {
      isHealthy: false,
      message: `API returned status ${response.status}`,
      status: response.status
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      isHealthy: false,
      message: 'Cannot connect to API server',
      error
    };
  }
}

export async function checkStudyPlansEndpoint() {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return {
        isHealthy: false,
        message: 'No authentication token found'
      };
    }
    
    const response = await fetch('http://localhost:8080/api/v2/study-plans/active', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok || response.status === 404) {
      // 404 is ok for new users who don't have a study plan yet
      return {
        isHealthy: true,
        message: 'Study plans endpoint is accessible',
        status: response.status
      };
    }
    
    return {
      isHealthy: false,
      message: `Study plans endpoint returned status ${response.status}`,
      status: response.status
    };
  } catch (error) {
    console.error('Study plans endpoint check failed:', error);
    return {
      isHealthy: false,
      message: 'Cannot connect to study plans endpoint',
      error
    };
  }
}