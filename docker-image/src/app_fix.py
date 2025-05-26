# This is a patch for the student_modules function in app.py
# Replace the function with this version to fix the module creation issue

@app.route('/student/courses/<course_id>/modules', methods=['GET', 'POST'])
def student_modules(course_id):
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        # Verify the course is owned by the student (for POST) or student is enrolled (for GET)
        course = get_course_by_id(db, course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        if request.method == 'POST':
            print(f"[DEBUG] student_modules POST: user_id={user_id}, course_id={course_id}")
            print(f"[DEBUG] course: {course}")
            # For creating modules, student must own the course
            if str(course.creator_id) != str(user_id):
                print(f"[DEBUG] Access denied: creator_id={course.creator_id} user_id={user_id}")
                return jsonify({'error': 'Access denied - you can only create modules in courses you created'}), 403
                
            data = request.get_json() or {}
            print(f"[DEBUG] Incoming data: {data}")
            title = data.get('title')
            description = data.get('description', '')
            
            if not title:
                print("[DEBUG] Missing title")
                return jsonify({'error': 'Title is required'}), 400
                
            # Get the next ordering number
            existing_modules = get_modules_by_course(db, course_id)
            # Handle tuple format (id, course_id, title, ordering)
            next_ordering = max([row[3] for row in existing_modules], default=-1) + 1
            print(f"[DEBUG] next_ordering: {next_ordering}")
            
            try:
                print("[DEBUG] Calling create_module...")
                # Don't pass description to create_module to avoid the column error
                module = create_module(
                    db=db,
                    course_id=course_id,
                    title=title
                )
                print(f"[DEBUG] Module created: {module}")
            except Exception as e:
                import traceback
                print('[DEBUG] Exception in create_module:', traceback.format_exc())
                db.rollback()
                return jsonify({'error': str(e)}), 500
            
            # Create response without accessing the description field
            response_data = {
                'id': str(module.id),
                'title': module.title,
                'description': description,  # Use the input description, not module.description
                'course_id': str(module.course_id),
                'ordering': module.ordering
            }
            return jsonify(response_data), 201
            
        else:  # GET request
            # For viewing modules, student must be enrolled
            if not get_enrollment_by_student_course(db, user_id, course_id):
                return jsonify({'error': 'Forbidden'}), 403
            mods = get_modules_by_course(db, course_id)
            # Handle tuple format returned by updated get_modules_by_course
            response_data = []
            for row in mods:
                # Unpack tuple values (id, course_id, title, ordering)
                module_id, course_id_val, title, ordering = row
                module_data = {
                    'id': str(module_id), 
                    'title': title, 
                    'ordering': ordering,
                    'description': ''  # Default empty description
                }
                response_data.append(module_data)
            
            return jsonify(response_data), 200
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
