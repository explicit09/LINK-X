from sqlalchemy import select, asc, desc
from sqlalchemy.orm import Session
from src.db.schema import (
    Professor, Student, Onboarding, Course, AccessCode,
    Enrollment, File, PersonalizedFile, Chat, Message, Report
)
from werkzeug.security import generate_password_hash
from datetime import datetime
import uuid

# --- Professor CRUD ---
def get_professor_by_id(db: Session, professor_id: str):
    return db.execute(select(Professor).filter_by(id=professor_id)).scalars().first()

def get_professor_by_firebase_uid(db: Session, firebase_uid: str):
    return db.execute(select(Professor).filter_by(firebase_uid=firebase_uid)).scalars().first()

def get_all_professors(db: Session):
    return db.execute(select(Professor)).scalars().all()

def create_professor(db: Session, email: str, password: str, firebase_uid: str):
    prof = Professor(
        email=email,
        password=generate_password_hash(password),
        firebase_uid=firebase_uid
    )
    db.add(prof); db.commit(); db.refresh(prof)
    return prof

def update_professor(db: Session, professor_id: str, **kwargs):
    prof = get_professor_by_id(db, professor_id)
    if not prof: return None
    if 'email' in kwargs: prof.email = kwargs['email']
    if 'password' in kwargs: prof.password = generate_password_hash(kwargs['password'])
    db.commit(); db.refresh(prof)
    return prof

def delete_professor(db: Session, professor_id: str):
    prof = get_professor_by_id(db, professor_id)
    if prof: db.delete(prof); db.commit()

# --- Student CRUD ---
def get_student_by_id(db: Session, student_id: str):
    return db.execute(select(Student).filter_by(id=student_id)).scalars().first()

def get_student_by_firebase_uid(db: Session, firebase_uid: str):
    return db.execute(select(Student).filter_by(firebase_uid=firebase_uid)).scalars().first()

def create_student(db: Session, email: str, password: str, firebase_uid: str):
    student = Student(
        email=email,
        password=generate_password_hash(password),
        firebase_uid=firebase_uid
    )
    db.add(student); db.commit(); db.refresh(student)
    return student

def update_student(db: Session, student_id: str, **kwargs):
    s = get_student_by_id(db, student_id)
    if not s: return None
    if 'email' in kwargs: s.email = kwargs['email']
    if 'password' in kwargs: s.password = generate_password_hash(kwargs['password'])
    db.commit(); db.refresh(s)
    return s

def delete_student(db: Session, student_id: str):
    s = get_student_by_id(db, student_id)
    if s: db.delete(s); db.commit()

# --- Onboarding CRUD ---
def get_onboarding_by_id(db: Session, onboarding_id: str):
    return db.execute(select(Onboarding).filter_by(id=onboarding_id)).scalars().first()

def get_onboarding_by_student(db: Session, student_id: str):
    return db.execute(select(Onboarding).filter_by(student_id=student_id)).scalars().first()

def create_onboarding(db: Session, student_id: str, name: str, answers: dict, quizzes: bool=False):
    ob = Onboarding(
        student_id=student_id,
        name=name,
        answers=answers,
        quizzes=quizzes
    )
    db.add(ob); db.commit(); db.refresh(ob)
    return ob

def update_onboarding(db: Session, onboarding_id: str, **kwargs):
    ob = get_onboarding_by_id(db, onboarding_id)
    if not ob: return None
    if 'name' in kwargs: ob.name = kwargs['name']
    if 'answers' in kwargs: ob.answers = kwargs['answers']
    if 'quizzes' in kwargs: ob.quizzes = kwargs['quizzes']
    db.commit(); db.refresh(ob)
    return ob

def delete_onboarding(db: Session, onboarding_id: str):
    ob = get_onboarding_by_id(db, onboarding_id)
    if ob: db.delete(ob); db.commit()

# --- Course CRUD ---


def get_courses_by_student_id(db: Session, student_id: str):
    stmt = (
        select(Course)
        .join(Enrollment, Enrollment.course_id==Course.id)
        .filter(Enrollment.student_id==student_id)
        .order_by(desc(Course.created_at))
    )
    return db.execute(stmt).scalars().all()

def get_course_by_id(db: Session, course_id: str):
    return db.execute(select(Course).filter_by(id=course_id)).scalars().first()

def get_courses_by_professor_id(db: Session, professor_id: str):
    return db.execute(
        select(Course)
        .filter_by(professor_id=professor_id)
        .order_by(desc(Course.created_at))
    ).scalars().all()

def create_course(
    db: Session,
    title: str,
    description: str,
    professor_id: str,
    index_pkl: bytes = None,
    index_faiss: bytes = None
):
    c = Course(
        title=title,
        description=description,
        professor_id=professor_id,
        index_pkl=index_pkl,
        index_faiss=index_faiss,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

def update_course(db: Session, course_id: str, **kwargs):
    c = get_course_by_id(db, course_id)
    if not c:
        return None
    if 'title' in kwargs:        c.title = kwargs['title']
    if 'description' in kwargs:  c.description = kwargs['description']
    if 'index_faiss' in kwargs:  c.index_faiss = kwargs['index_faiss']
    if 'index_pkl' in kwargs:    c.index_pkl   = kwargs['index_pkl']
    db.commit()
    db.refresh(c)
    return c

def delete_course(db: Session, course_id: str):
    c = get_course_by_id(db, course_id)
    if c: db.delete(c); db.commit()

# --- AccessCode CRUD ---
def get_access_code_by_id(db: Session, access_code_id: str):
    return db.execute(select(AccessCode).filter_by(id=access_code_id)).scalars().first()

def get_access_code_by_course(db: Session, course_id: str):
    return db.execute(select(AccessCode).filter_by(course_id=course_id)).scalars().first()

def get_access_code_by_code(db: Session, code: str):
    return db.execute(select(AccessCode).filter_by(code=code)).scalars().first()

def create_access_code(db: Session, course_id: str, code: str):
    ac = AccessCode(course_id=course_id, code=code)
    db.add(ac); db.commit(); db.refresh(ac)
    return ac

def update_access_code(db: Session, access_code_id: str, **kwargs):
    ac = get_access_code_by_id(db, access_code_id)
    if not ac: return None
    if 'code' in kwargs: ac.code = kwargs['code']
    db.commit(); db.refresh(ac)
    return ac

def delete_access_code(db: Session, access_code_id: str):
    ac = get_access_code_by_id(db, access_code_id)
    if ac: db.delete(ac); db.commit()

# --- Enrollment CRUD ---
def get_enrollment(db: Session, student_id: str, course_id: str):
    return db.execute(
        select(Enrollment)
        .filter_by(student_id=student_id, course_id=course_id)
    ).scalars().first()

def get_enrollments_by_student(db: Session, student_id: str):
    return db.execute(
        select(Enrollment).filter_by(student_id=student_id)
    ).scalars().all()

def get_enrollments_by_course(db: Session, course_id: str):
    return db.execute(
        select(Enrollment).filter_by(course_id=course_id)
    ).scalars().all()

def create_enrollment(db: Session, student_id: str, course_id: str):
    enr = Enrollment(student_id=student_id, course_id=course_id)
    db.add(enr); db.commit(); return enr

def delete_enrollment(db: Session, student_id: str, course_id: str):
    enr = get_enrollment(db, student_id, course_id)
    if enr: db.delete(enr); db.commit()

def get_students_by_course(db: Session, course_id: str):
    stmt = (
        select(Student, Onboarding)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .join(Onboarding, Onboarding.student_id == Student.id)
        .filter(Enrollment.course_id == course_id)
        .order_by(asc(Onboarding.name))
    )
    return db.execute(stmt).all()

# --- File CRUD ---
def get_file_by_id(db: Session, file_id: str):
    return db.execute(select(File).filter_by(id=file_id)).scalars().first()

def get_files_by_course(db: Session, course_id: str):
    return db.execute(
        select(File)
        .filter_by(course_id=course_id)
        .order_by(desc(File.created_at))
    ).scalars().all()

def create_file(db: Session, filename: str, file_type: str, file_size: int,
                file_data: bytes, course_id: str):
    f = File(
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        file_data=file_data,
        course_id=course_id
    )
    db.add(f); db.commit(); db.refresh(f)
    return f

def update_file(db: Session, file_id: str, **kwargs):
    f = get_file_by_id(db, file_id)
    if not f: return None
    for k in ('filename','file_type','file_size','file_data'):
        if k in kwargs:
            setattr(f, k, kwargs[k])
    db.commit(); db.refresh(f)
    return f

def delete_file(db: Session, file_id: str):
    f = get_file_by_id(db, file_id)
    if f: db.delete(f); db.commit()

# --- PersonalizedFile CRUD ---
def get_personalized_file_by_id(db: Session, pf_id: str):
    return db.execute(select(PersonalizedFile).filter_by(id=pf_id)).scalars().first()

def get_personalized_files_by_student(db: Session, student_id: str):
    return db.execute(
        select(PersonalizedFile)
        .filter_by(student_id=student_id)
        .order_by(desc(PersonalizedFile.created_at))
    ).scalars().all()

def create_personalized_file(db: Session, student_id: str, original_file_id: str, content: dict):
    pf = PersonalizedFile(
        student_id=student_id,
        original_file_id=original_file_id,
        content=content
    )
    db.add(pf); db.commit(); db.refresh(pf)
    return pf

def update_personalized_file(db: Session, pf_id: str, **kwargs):
    pf = get_personalized_file_by_id(db, pf_id)
    if not pf: return None
    if 'content' in kwargs: pf.content = kwargs['content']
    db.commit(); db.refresh(pf)
    return pf

def delete_personalized_file(db: Session, pf_id: str):
    pf = get_personalized_file_by_id(db, pf_id)
    if pf: db.delete(pf); db.commit()

# --- Chat CRUD ---
def get_chat_by_id(db: Session, chat_id: str):
    return db.execute(select(Chat).filter_by(id=chat_id)).scalars().first()

def get_chats_by_student(db: Session, student_id: str):
    return db.execute(
        select(Chat)
        .filter_by(student_id=student_id)
        .order_by(desc(Chat.created_at))
    ).scalars().all()

def create_chat(db: Session, student_id: str, file_id: str, title: str):
    c = Chat(student_id=student_id, file_id=file_id, title=title)
    db.add(c); db.commit(); db.refresh(c)
    return c

def update_chat(db: Session, chat_id: str, **kwargs):
    c = get_chat_by_id(db, chat_id)
    if not c: return None
    if 'title' in kwargs: c.title = kwargs['title']
    db.commit(); db.refresh(c)
    return c

def delete_chat(db: Session, chat_id: str):
    c = get_chat_by_id(db, chat_id)
    if c: db.delete(c); db.commit()

# --- Message CRUD ---
def get_message_by_id(db: Session, message_id: str):
    return db.execute(select(Message).filter_by(id=message_id)).scalars().first()

def get_messages_by_chat(db: Session, chat_id: str):
    return db.execute(
        select(Message)
        .filter_by(chat_id=chat_id)
        .order_by(asc(Message.created_at))
    ).scalars().all()

def create_message(db: Session, chat_id: str, role: str, content: str):
    m = Message(chat_id=chat_id, role=role, content=content)
    db.add(m); db.commit(); db.refresh(m)
    return m

def update_message(db: Session, message_id: str, **kwargs):
    m = get_message_by_id(db, message_id)
    if not m: return None
    if 'role' in kwargs: m.role = kwargs['role']
    if 'content' in kwargs: m.content = kwargs['content']
    db.commit(); db.refresh(m)
    return m

def delete_message(db: Session, message_id: str):
    m = get_message_by_id(db, message_id)
    if m: db.delete(m); db.commit()

# --- Report CRUD ---
def get_report_by_id(db: Session, report_id: str):
    return db.execute(select(Report).filter_by(id=report_id)).scalars().first()

def get_reports_by_course(db: Session, course_id: str):
    return db.execute(
        select(Report)
        .filter_by(course_id=course_id)
        .order_by(desc(Report.created_at))
    ).scalars().all()

def create_report(db: Session, course_id: str, file_id: str, summary: dict):
    r = Report(course_id=course_id, file_id=file_id, summary=summary)
    db.add(r); db.commit(); db.refresh(r)
    return r

def update_report(db: Session, report_id: str, **kwargs):
    r = get_report_by_id(db, report_id)
    if not r: return None
    if 'summary' in kwargs: r.summary = kwargs['summary']
    db.commit(); db.refresh(r)
    return r

def delete_report(db: Session, report_id: str):
    r = get_report_by_id(db, report_id)
    if r: db.delete(r); db.commit()

def delete_messages_after(db: Session, chat_id: str, timestamp: datetime):
    db.query(Message)\
      .filter(Message.chat_id == chat_id, Message.created_at > timestamp)\
      .delete(synchronize_session=False)
    db.commit()