"use client";

import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Video, 
  Users, 
  BookOpen,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function SchedulePage() {
  const todayEvents = [
    {
      id: "1",
      time: "9:00 AM",
      title: "CS229 Neural Networks Assignment",
      type: "assignment",
      course: "CS229",
      status: "urgent",
      duration: "2 hours"
    },
    {
      id: "2", 
      time: "11:00 AM",
      title: "Study Group - Algorithms",
      type: "meeting",
      course: "CS161",
      status: "scheduled",
      duration: "1 hour"
    },
    {
      id: "3",
      time: "2:00 PM", 
      title: "Review Recursion Tutorial",
      type: "study",
      course: "CS224n",
      status: "scheduled",
      duration: "45 mins"
    },
    {
      id: "4",
      time: "4:00 PM",
      title: "Computer Vision Lab",
      type: "lab",
      course: "CS231n", 
      status: "completed",
      duration: "1.5 hours"
    }
  ];

  const upcomingDeadlines = [
    {
      course: "CS229",
      task: "Neural Networks Assignment",
      dueDate: "Today",
      timeLeft: "6 hours",
      priority: "high"
    },
    {
      course: "CS224n", 
      task: "Recursion Quiz",
      dueDate: "Tomorrow",
      timeLeft: "1 day",
      priority: "medium"
    },
    {
      course: "CS231n",
      task: "Computer Vision Project",
      dueDate: "Friday",
      timeLeft: "3 days", 
      priority: "low"
    }
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case "assignment": return <BookOpen className="h-4 w-4" />;
      case "meeting": return <Users className="h-4 w-4" />;
      case "study": return <Clock className="h-4 w-4" />;
      case "lab": return <Video className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "urgent": return "border-l-red-500 bg-red-50";
      case "scheduled": return "border-l-blue-500 bg-blue-50";
      case "completed": return "border-l-green-500 bg-green-50";
      default: return "border-l-gray-500 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "urgent": return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "scheduled": return <Clock className="h-4 w-4 text-blue-600" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SharedDashboardLayout pageTitle="Schedule">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>Today - March 15, 2024</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayEvents.map((event) => (
                <div 
                  key={event.id} 
                  className={`border-l-4 p-4 rounded-lg ${getStatusColor(event.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{event.time}</span>
                          <Badge variant="outline" className="text-xs">
                            {event.course}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">
                          {event.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Duration: {event.duration}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(event.status)}
                      <Button 
                        size="sm" 
                        variant={event.status === "completed" ? "secondary" : "default"}
                        disabled={event.status === "completed"}
                      >
                        {event.status === "completed" ? "Done" : 
                         event.status === "urgent" ? "Start Now" : "Join"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weekly View */}
          <Card>
            <CardHeader>
              <CardTitle>This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                  <div key={day} className="p-2">
                    <div className="font-medium text-gray-700 mb-2">{day}</div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      index === 2 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}>
                      {13 + index}
                    </div>
                    <div className="mt-1">
                      {index < 3 && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span>Upcoming Deadlines</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getPriorityColor(deadline.priority)}>
                      {deadline.priority}
                    </Badge>
                    <span className="text-xs text-gray-500">{deadline.timeLeft}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                    {deadline.task}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {deadline.course} • Due {deadline.dueDate}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Focus Time */}
          <Card>
            <CardHeader>
              <CardTitle>Focus Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div>
                  <div className="text-2xl font-bold text-blue-600">2h 30m</div>
                  <div className="text-sm text-gray-500">Today's Focus Time</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Goal</span>
                    <span>3h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '83%' }}></div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Start Focus Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Study Time
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Join Study Group
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                View Full Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SharedDashboardLayout>
  );
}