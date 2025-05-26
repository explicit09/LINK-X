from db.connection import engine
from sqlalchemy.orm import sessionmaker
from db.schema import Module, Course

def list_modules():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        # Query all modules with their course information
        modules = db.query(Module, Course).join(Course, Module.course_id == Course.id).all()
        
        if not modules:
            print("No modules found in the database.")
            return
            
        print("\nFound the following modules:")
        print("-" * 80)
        for module, course in modules:
            print(f"Module ID: {module.id}")
            print(f"Title: {module.title}")
            print(f"Description: {module.description or 'No description'}")
            print(f"Course: {course.title} (ID: {course.id})")
            print("-" * 80)
            
    except Exception as e:
        print(f"Error listing modules: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_modules()
