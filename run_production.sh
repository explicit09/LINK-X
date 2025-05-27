#!/bin/bash

# Start backend and frontend for production with streaming support

echo "Starting LINK-X1 with streaming support..."

# Kill any existing processes
echo "Stopping existing services..."
pkill -f "python.*app.py" || true
pkill -f "next dev" || true
pkill -f "gunicorn" || true

# Start backend
echo "Starting backend..."
cd docker-image
python src/app.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start frontend
echo "Starting frontend..."
cd ../coralx-frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "==================================="
echo "LINK-X1 is running with streaming!"
echo "==================================="
echo "Frontend: http://localhost:3001"
echo "Backend:  http://localhost:8080"
echo ""
echo "To stop all services, press Ctrl+C"
echo ""

# Wait and handle shutdown
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Keep script running
wait