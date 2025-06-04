import { BaseAPIClient, APIError, type RequestConfig } from './base-client';
import { AuthAPIClient } from './auth-client';
import { CourseAPIClient } from './course-client';
import { StudyPlanAPIClient } from './study-plan-client';
import { StreamingAPIClient } from './streaming-client';

/**
 * Main APIClient - Coordinates all domain-specific clients
 * PRESERVE exact interface compatibility with original client
 * 
 * This is a refactored version that delegates to focused, modular clients
 * while preserving the exact same API surface
 */
export class APIClient {
  // Domain-specific clients
  private authClient: AuthAPIClient;
  private courseClient: CourseAPIClient;
  private studyPlanClient: StudyPlanAPIClient;
  private streamingClient: StreamingAPIClient;

  constructor() {
    this.authClient = new AuthAPIClient();
    this.courseClient = new CourseAPIClient();
    this.studyPlanClient = new StudyPlanAPIClient();
    this.streamingClient = new StreamingAPIClient();
  }

  // ===== GENERIC HTTP METHODS =====
  // Delegate to auth client for all generic operations
  
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.authClient.authenticatedGet<T>(endpoint, config);
  }

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.authClient.authenticatedPost<T>(endpoint, data, config);
  }

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.authClient.authenticatedPut<T>(endpoint, data, config);
  }

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.authClient.authenticatedPatch<T>(endpoint, data, config);
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.authClient.authenticatedDelete<T>(endpoint, config);
  }

  // Get auth token for SSE connections
  async getAuthToken(): Promise<string | null> {
    const tokenInfo = await this.authClient.getAuthToken();
    return tokenInfo ? tokenInfo.token : null;
  }

  // ===== STREAMING METHODS =====
  
  async stream(
    endpoint: string,
    data: unknown,
    onMessage: (message: unknown) => void,
    onError: (error: Error) => void,
  ): Promise<() => void> {
    return this.streamingClient.stream(endpoint, data, onMessage, onError);
  }

  // ===== DOMAIN-SPECIFIC API ACCESS =====
  // Expose clients for direct access when needed
  
  get auth() {
    return this.authClient;
  }

  get courses() {
    return this.courseClient;
  }

  get studyPlans() {
    return this.studyPlanClient;
  }

  get streaming() {
    return this.streamingClient;
  }

  // ===== BACKWARD COMPATIBILITY METHODS =====
  // These maintain exact compatibility with the original client
  // Components can call apiClient.getCourses() just like before

  // Course-related convenience methods
  async getCourses() {
    return this.courseClient.getCourses();
  }

  async getCourse(courseId: string) {
    return this.courseClient.getCourse(courseId);
  }

  async createCourse(courseData: any) {
    return this.courseClient.createCourse(courseData);
  }

  async updateCourse(courseId: string, updates: any) {
    return this.courseClient.updateCourse(courseId, updates);
  }

  async deleteCourse(courseId: string) {
    return this.courseClient.deleteCourse(courseId);
  }

  async joinCourse(accessCode: string) {
    return this.courseClient.joinCourse(accessCode);
  }

  async leaveCourse(courseId: string) {
    return this.courseClient.leaveCourse(courseId);
  }

  async getModules(courseId: string) {
    return this.courseClient.getModules(courseId);
  }

  async createModule(courseId: string, moduleData: any) {
    return this.courseClient.createModule(courseId, moduleData);
  }

  async updateModule(moduleId: string, updates: any) {
    return this.courseClient.updateModule(moduleId, updates);
  }

  async deleteModule(moduleId: string) {
    return this.courseClient.deleteModule(moduleId);
  }

  async uploadFile(courseId: string, moduleId: string, file: File) {
    return this.courseClient.uploadFile(courseId, moduleId, file);
  }

  async getMaterials(moduleId: string) {
    return this.courseClient.getMaterials(moduleId);
  }

  async deleteMaterial(materialId: string) {
    return this.courseClient.deleteMaterial(materialId);
  }

  async getCourseStudents(courseId: string) {
    return this.courseClient.getCourseStudents(courseId);
  }

  async removeStudent(courseId: string, studentId: string) {
    return this.courseClient.removeStudent(courseId, studentId);
  }

  async getCourseAnalytics(courseId: string) {
    return this.courseClient.getCourseAnalytics(courseId);
  }

  async getStudentProgress(courseId: string, studentId?: string) {
    return this.courseClient.getStudentProgress(courseId, studentId);
  }

  // Study Plan convenience methods
  async getStudyPlans() {
    return this.studyPlanClient.getStudyPlans();
  }

  async getActivePlan() {
    return this.studyPlanClient.getActivePlan();
  }

  async createStudyPlan(planData: any) {
    return this.studyPlanClient.createStudyPlan(planData);
  }

  async updateStudyPlan(planId: string, updates: any) {
    return this.studyPlanClient.updateStudyPlan(planId, updates);
  }

  async deleteStudyPlan(planId: string) {
    return this.studyPlanClient.deleteStudyPlan(planId);
  }

  async getStudyGoals(filters?: any) {
    return this.studyPlanClient.getStudyGoals(filters);
  }

  async createGoal(goalData: any) {
    return this.studyPlanClient.createGoal(goalData);
  }

  async updateGoal(goalId: string, updates: any) {
    return this.studyPlanClient.updateGoal(goalId, updates);
  }

  async deleteGoal(goalId: string) {
    return this.studyPlanClient.deleteGoal(goalId);
  }

  async logGoalProgress(goalId: string, progressData: any) {
    return this.studyPlanClient.logGoalProgress(goalId, progressData);
  }

  async getStudySessions(filters?: any) {
    return this.studyPlanClient.getStudySessions(filters);
  }

  async startStudySession(sessionData: any) {
    return this.studyPlanClient.startStudySession(sessionData);
  }

  async endStudySession(sessionId: string, endData?: any) {
    return this.studyPlanClient.endStudySession(sessionId, endData);
  }

  async getStudyRecommendations() {
    return this.studyPlanClient.getStudyRecommendations();
  }

  async applyRecommendation(recommendationId: string) {
    return this.studyPlanClient.applyRecommendation(recommendationId);
  }

  async dismissRecommendation(recommendationId: string) {
    return this.studyPlanClient.dismissRecommendation(recommendationId);
  }

  async getStudyAnalytics(timeframe?: 'week' | 'month' | 'year') {
    return this.studyPlanClient.getStudyAnalytics(timeframe);
  }

  async getDashboardStats() {
    return this.studyPlanClient.getDashboardStats();
  }
}

// Create singleton instance for backward compatibility
export const apiClient = new APIClient();

// Export all types and classes
export { APIError, BaseAPIClient, AuthAPIClient, CourseAPIClient, StudyPlanAPIClient, StreamingAPIClient };
export type { RequestConfig };