#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'docker-image', 'src'))

from db.database import Session
from db.queries import get_todos_by_user, create_todo, delete_todo, get_todo_by_id
import uuid

def test_todo_delete():
    """Test that todo deletion actually works in the database"""
    db = Session()
    
    try:
        # Create a test user ID
        test_user_id = str(uuid.uuid4())
        
        # Create a test todo
        print("Creating test todo...")
        todo = create_todo(
            db, 
            user_id=test_user_id,
            title="Test Todo for Delete",
            description="This should be deleted",
            todo_type="assignment",
            priority="medium"
        )
        
        todo_id = str(todo.id)
        print(f"Created todo with ID: {todo_id}")
        
        # Verify it exists
        found_todo = get_todo_by_id(db, todo_id)
        if found_todo:
            print("✓ Todo created successfully")
        else:
            print("✗ Failed to create todo")
            return False
        
        # Delete the todo
        print("Deleting todo...")
        delete_result = delete_todo(db, todo_id)
        
        if delete_result:
            print("✓ Delete function returned True")
        else:
            print("✗ Delete function returned False")
            return False
        
        # Verify it's gone
        found_todo_after = get_todo_by_id(db, todo_id)
        if found_todo_after is None:
            print("✓ Todo successfully deleted from database")
            return True
        else:
            print("✗ Todo still exists in database after delete!")
            return False
            
    except Exception as e:
        print(f"✗ Error during test: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Testing todo delete functionality...")
    success = test_todo_delete()
    
    if success:
        print("\n🎉 Todo delete functionality is working correctly!")
    else:
        print("\n❌ Todo delete functionality has issues!")
    
    sys.exit(0 if success else 1) 