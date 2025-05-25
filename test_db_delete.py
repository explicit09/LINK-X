#!/usr/bin/env python3
import sys
import os
sys.path.append('/Users/tadies/Documents/GitHub/LINK-X/docker-image/src')

from db.database import Session
from db.queries import create_todo, delete_todo, get_todo_by_id
import uuid

db = Session()
user_id = str(uuid.uuid4())
todo = create_todo(db, user_id=user_id, title='Test Delete', todo_type='assignment', priority='medium')
todo_id = str(todo.id)
print(f'Created todo: {todo_id}')

# Verify it exists
found = get_todo_by_id(db, todo_id)
print(f'Todo exists: {found is not None}')

# Delete it
result = delete_todo(db, todo_id)
print(f'Delete result: {result}')

# Check if gone
found_after = get_todo_by_id(db, todo_id)
print(f'Todo exists after delete: {found_after is not None}')
db.close()

if found and result and not found_after:
    print("✅ Database delete is working correctly!")
else:
    print("❌ Database delete has issues!") 