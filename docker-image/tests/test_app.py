import pytest

def test_me_without_cookie(client):
    rv = client.get("/me")
    assert rv.status_code == 401
    assert "error" in rv.get_json()


def test_student_full_flow(client):
    # 1) Register the student account
    resp = client.post(
        "/register/student",
        json={
            "idToken": "stu-token",
            "email": "stu@example.com",
            "password": "pw"
        }
    )
    assert resp.status_code == 201
    student_id = resp.get_json()["id"]

    # 2) “Log in” as that student
    client.set_cookie("session", student_id)

    # 3) Create the student profile
    resp2 = client.post(
        "/student/profile",
        json={
            "name": "Test Student",
            "onboard_answers": {"favoriteTopic": "AI"},
            "want_quizzes": True
        }
    )
    assert resp2.status_code == 201
    profile = resp2.get_json()
    assert profile["user_id"] == student_id
    assert profile["name"] == "Test Student"
    assert profile["onboard_answers"]["favoriteTopic"] == "AI"
    assert profile["want_quizzes"] is True

    # 4) Fetch the profile via GET
    resp3 = client.get("/student/profile")
    assert resp3.status_code == 200
    fetched = resp3.get_json()
    assert fetched["name"] == "Test Student"

    # 5) /me should now include the profile
    me = client.get("/me").get_json()
    assert me["role"] == "student"
    assert me["profile"]["name"] == "Test Student"


def test_instructor_full_flow(client):
    # 1) Register the instructor account
    resp = client.post(
        "/register/instructor",
        json={
            "idToken": "prof-token",
            "email": "prof@example.com",
            "password": "pw"
        }
    )
    assert resp.status_code == 201
    instr_id = resp.get_json()["id"]

    # 2) “Log in” as that instructor
    client.set_cookie("session", instr_id)

    # 3) Create the instructor profile
    resp2 = client.post(
        "/instructor/profile",
        json={
            "name": "Prof Smith",
            "university": "Test University"
        }
    )
    assert resp2.status_code == 201
    ip = resp2.get_json()
    assert ip["user_id"] == instr_id
    assert ip["name"] == "Prof Smith"
    assert ip["university"] == "Test University"

    # 4) Fetch the profile via GET
    resp3 = client.get("/instructor/profile")
    assert resp3.status_code == 200
    fetched = resp3.get_json()
    assert fetched["university"] == "Test University"

    # 5) Create a course
    resp4 = client.post(
        "/instructor/courses",
        json={"title": "Intro to Testing", "description": "A test course"}
    )
    assert resp4.status_code == 201
    course_id = resp4.get_json()["id"]

    # 6) Create a module in that course
    resp5 = client.post(
        f"/instructor/courses/{course_id}/modules",
        json={"title": "Module 1"}
    )
    assert resp5.status_code == 201
    module = resp5.get_json()
    module_id = module["id"]
    assert module["title"] == "Module 1"

    # 7) Verify it shows up in the module list
    modules = client.get(f"/instructor/courses/{course_id}/modules").get_json()
    assert any(m["id"] == module_id and m["title"] == "Module 1"
               for m in modules)


def test_student_course_and_module_creation(client):
    # 1) Register the student account
    resp = client.post(
        "/register/student",
        json={
            "idToken": "stu-token-2",
            "email": "stu2@example.com",
            "password": "pw"
        }
    )
    assert resp.status_code == 201
    student_id = resp.get_json()["id"]

    # 2) "Log in" as that student
    client.set_cookie("session", student_id)

    # 3) Create a course as a student
    resp2 = client.post(
        "/student/courses",
        json={
            "title": "My Student Course",
            "description": "A course created by a student",
            "code": "STU-101",
            "term": "Spring 2023"
        }
    )
    assert resp2.status_code == 201
    course_data = resp2.get_json()
    course_id = course_data["id"]
    assert course_data["title"] == "My Student Course"

    # 4) Create a module in the student-created course
    resp3 = client.post(
        f"/student/courses/{course_id}/modules",
        json={"title": "Week 1 - Introduction"}
    )
    assert resp3.status_code == 201
    module = resp3.get_json()
    module_id = module["id"]
    assert module["title"] == "Week 1 - Introduction"
    assert module["course_id"] == course_id

    # 5) Verify the module shows up in the module list
    modules = client.get(f"/student/courses/{course_id}/modules").get_json()
    assert any(m["id"] == module_id and m["title"] == "Week 1 - Introduction"
               for m in modules)

    # 6) Test that module creation fails for courses not created by the student
    # First, create another student
    resp4 = client.post(
        "/register/student",
        json={
            "idToken": "stu-token-3",
            "email": "stu3@example.com",
            "password": "pw"
        }
    )
    assert resp4.status_code == 201
    other_student_id = resp4.get_json()["id"]

    # 7) Switch to the other student
    client.set_cookie("session", other_student_id)

    # 8) Try to create a module in the first student's course (should fail)
    resp5 = client.post(
        f"/student/courses/{course_id}/modules",
        json={"title": "Unauthorized Module"}
    )
    assert resp5.status_code == 403
    error_data = resp5.get_json()
    assert "Only course creators can add modules" in error_data["error"]