-- Create Todo table for task management
CREATE TABLE IF NOT EXISTS "Todo" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    course VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('quiz', 'assignment', 'reading', 'review')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    due_date TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_todo_user_id ON "Todo"(user_id);
CREATE INDEX idx_todo_completed ON "Todo"(completed);
CREATE INDEX idx_todo_due_date ON "Todo"(due_date);
CREATE INDEX idx_todo_created_at ON "Todo"(created_at DESC);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_todo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todo_updated_at_trigger
BEFORE UPDATE ON "Todo"
FOR EACH ROW
EXECUTE FUNCTION update_todo_updated_at();