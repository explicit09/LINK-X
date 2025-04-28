def test_me_without_cookie(client):
    rv = client.get("/me")
    assert rv.status_code == 401
    assert "error" in rv.get_json()


def test_student_registration_and_me(client):
    resp = client.post(
        "/register/student",
        json={"idToken": "stu-token", "email": "stu@example.com", "password": "pw"}
    )
    assert resp.status_code == 201
    sid = resp.get_json()["id"]

    client.set_cookie("localhost", "session", sid)
    rv2 = client.get("/me")
    assert rv2.status_code == 200
    me = rv2.get_json()
    assert me["role"] == "student"
    assert me["email"] == "stu@example.com"


def test_instructor_creates_course_and_module(client):
    # Register instructor
    resp = client.post(
        "/register/instructor",
        json={
            "idToken": "prof-token",
            "email": "prof@example.com",
            "password": "pw",
            "name": "Prof Smith",
            "university": "Test University"
        }
    )
    assert resp.status_code == 201
    iid = resp.get_json()["id"]

    # Authenticate
    client.set_cookie("localhost", "session", iid)

    # Create course
    course = client.post(
        "/instructor/courses",
        json={"title": "Intro to Testing", "description": "A test course"}
    ).get_json()
    cid = course["id"]

    # Create module
    module = client.post(
        f"/instructor/courses/{cid}/modules",
        json={"title": "Module 1"}
    ).get_json()
    mid = module["id"]

    # Verify module shows up
    modules = client.get(f"/instructor/courses/{cid}/modules").get_json()
    assert any(m["id"] == mid and m["title"] == "Module 1" for m in modules)