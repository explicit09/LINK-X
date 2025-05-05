from sqlalchemy import func, select, asc, desc, delete
from sqlalchemy.orm import Session
from werkzeug.security import generate_password_hash
from datetime import datetime
import uuid

from src.db.schema import (
    User,
    Role,
    InstructorProfile,
    StudentProfile,
    AdminProfile,
    Course,
    Module,
    File,
    FileChunk,
    AccessCode,
    Enrollment,
    PersonalizedFile,
    Chat,
    Message,
    Report,
    News,
    Market
)

# --- User & Role CRUD ---

def get_user_by_id(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(select(User).filter_by(id=user_id)).scalars().first()


def get_user_by_email(db: Session, email: str):
    return db.execute(select(User).filter_by(email=email)).scalars().first()


def get_user_by_firebase_uid(db: Session, firebase_uid: str):
    return db.execute(select(User).filter_by(firebase_uid=firebase_uid)).scalars().first()


def create_user(db: Session, email: str, password: str, firebase_uid: str, role_type: str):
    user = User(
        email=email,
        password=generate_password_hash(password),
        firebase_uid=firebase_uid
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    role = Role(user_id=user.id, role_type=role_type)
    db.add(role)
    db.commit()
    return user


def update_user(db: Session, user_id: str, **kwargs):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    if 'email' in kwargs:
        user.email = kwargs['email']
    if 'password' in kwargs:
        user.password = generate_password_hash(kwargs['password'])
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: str):
    user = get_user_by_id(db, user_id)
    if user:
        db.delete(user)
        db.commit()


def get_role_by_user_id(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(select(Role).filter_by(user_id=user_id)).scalars().first()


def set_role(db: Session, user_id: str, role_type: str):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)

    role = get_role_by_user_id(db, user_id)
    if not role:
        role = Role(user_id=user_id, role_type=role_type)
        db.add(role)
    else:
        role.role_type = role_type
    db.commit()
    return role

# --- Profile CRUD ---

def get_instructor_profile(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(
        select(InstructorProfile).filter_by(user_id=user_id)
    ).scalars().first()


def create_instructor_profile(db: Session, user_id: str, name: str, university: str = None):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)

    prof = InstructorProfile(
        user_id=user_id,
        name=name,
        university=university
    )
    db.add(prof)
    db.commit()
    db.refresh(prof)
    return prof


def update_instructor_profile(db: Session, user_id: str, **kwargs):
    prof = get_instructor_profile(db, user_id)
    if not prof:
        return None
    if 'name' in kwargs:
        prof.name = kwargs['name']
    if 'university' in kwargs:
        prof.university = kwargs['university']
    db.commit()
    db.refresh(prof)
    return prof


def delete_instructor_profile(db: Session, user_id: str):
    prof = get_instructor_profile(db, user_id)
    if prof:
        db.delete(prof)
        db.commit()


def get_student_profile(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(
        select(StudentProfile).filter_by(user_id=user_id)
    ).scalars().first()


def create_student_profile(db: Session, user_id: str, name: str, onboard_answers: dict, want_quizzes: bool = False):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)

    student = StudentProfile(
        user_id=user_id,
        name=name,
        onboard_answers=onboard_answers,
        want_quizzes=want_quizzes
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student_profile(db: Session, user_id: str, **kwargs):
    student = get_student_profile(db, user_id)
    if not student:
        return None
    if 'name' in kwargs:
        student.name = kwargs['name']
    if 'onboard_answers' in kwargs:
        student.onboard_answers = kwargs['onboard_answers']
    if 'want_quizzes' in kwargs:
        student.want_quizzes = kwargs['want_quizzes']
    if 'model_preference' in kwargs:
        student.model_preference = kwargs['model_preference']
    db.commit()
    db.refresh(student)
    return student


def delete_student_profile(db: Session, user_id: str):
    student = get_student_profile(db, user_id)
    if student:
        db.delete(student)
        db.commit()


def get_admin_profile(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(
        select(AdminProfile).filter_by(user_id=user_id)
    ).scalars().first()


def create_admin_profile(db: Session, user_id: str, name: str):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)

    admin = AdminProfile(
        user_id=user_id,
        name=name
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def update_admin_profile(db: Session, user_id: str, **kwargs):
    admin = get_admin_profile(db, user_id)
    if not admin:
        return None
    if 'name' in kwargs:
        admin.name = kwargs['name']
    db.commit()
    db.refresh(admin)
    return admin


def delete_admin_profile(db: Session, user_id: str):
    admin = get_admin_profile(db, user_id)
    if admin:
        db.delete(admin)
        db.commit()

# --- Course CRUD ---

def get_course_by_id(db: Session, course_id):
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    return db.execute(select(Course).filter_by(id=course_id)).scalars().first()


def get_courses_by_instructor_id(db: Session, instructor_id):
    if isinstance(instructor_id, str):
        instructor_id = uuid.UUID(instructor_id)
    return db.execute(
        select(Course)
        .filter_by(instructor_id=instructor_id)
        .order_by(desc(Course.created_at))
    ).scalars().all()


def get_courses_by_student_id(db: Session, user_id: str):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    stmt = (
        select(Course)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.user_id == user_id)
        .order_by(desc(Course.created_at))
    )
    return db.execute(stmt).scalars().all()


def create_course(db: Session, title: str, description: str, instructor_id: str,
                  code: str = None, term: str = None,
                  published: bool = False, index_pkl: bytes = None, index_faiss: bytes = None):
    if isinstance(instructor_id, str):
        instructor_id = uuid.UUID(instructor_id)
    c = Course(
        title=title,
        description=description,
        code=code,
        term=term,
        published=published,
        instructor_id=instructor_id,
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
    for key in ('title', 'description', 'code', 'term', 'index_pkl', 'index_faiss', 'published'):
        if key in kwargs:
            setattr(c, key, kwargs[key])
    db.commit()
    db.refresh(c)
    return c




def delete_course(db: Session, course_id: str):
    db.query(AccessCode).filter(AccessCode.course_id == course_id).delete()
    c = get_course_by_id(db, course_id)
    if c:
        db.delete(c)
    db.commit()


# --- Module CRUD ---

def get_module_by_id(db: Session, module_id):
    if isinstance(module_id, str):
        module_id = uuid.UUID(module_id)
    return db.execute(select(Module).filter_by(id=module_id)).scalars().first()


def get_modules_by_course(db: Session, course_id):
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    return db.execute(
        select(Module)
        .filter_by(course_id=course_id)
        .order_by(Module.ordering)
    ).scalars().all()


def create_module(db: Session, course_id: str, title: str):
    max_ord = db.query(func.max(Module.ordering)).filter(Module.course_id == course_id).scalar() or 0
    m = Module(
        course_id=course_id,
        title=title,
        ordering=max_ord + 1
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def update_module(db: Session, module_id: str, **kwargs):
    m = get_module_by_id(db, module_id)
    if not m:
        return None
    if 'title' in kwargs: m.title = kwargs['title']
    if 'ordering' in kwargs: m.ordering = kwargs['ordering']
    db.commit()
    db.refresh(m)
    return m


def delete_module(db: Session, module_id: str):
    m = get_module_by_id(db, module_id)
    if m:
        db.delete(m)
        db.commit()

# --- File CRUD ---

def get_file_by_id(db: Session, file_id):
    if isinstance(file_id, str):
        file_id = uuid.UUID(file_id)
    return db.execute(select(File).filter_by(id=file_id)).scalars().first()


def get_files_by_module(db: Session, module_id):
    if isinstance(module_id, str):
        module_id = uuid.UUID(module_id)
    return db.execute(
        select(File)
        .filter_by(module_id=module_id)
        .order_by(File.ordering)
    ).scalars().all()


def get_files_without_raw_by_module(db: Session, module_id):
    if isinstance(module_id, str):
        module_id = uuid.UUID(module_id)
    stmt = (
        select(
            File.id.label("id"),
            File.title.label("title"),
            File.ordering.label("ordering"),
        )
        .filter_by(module_id=module_id)
        .order_by(File.ordering)
    )
    return db.execute(stmt).all()


def create_file(db: Session, module_id: str, title: str, filename: str,
                file_type: str, file_size: int, file_data: bytes):
    max_ord = db.query(func.max(File.ordering)).filter(File.module_id == module_id).scalar() or 0
    f = File(
        module_id=module_id,
        title=title,
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        file_data=file_data,
        ordering=max_ord + 1
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

def update_file(db: Session, file_id: str, **kwargs):
    f = get_file_by_id(db, file_id)
    if not f:
        return None
    for key in (
        'title','filename','file_type','file_size','file_data',
        'transcription','index_pkl','index_faiss','ordering'
    ):
        if key in kwargs:
            setattr(f, key, kwargs[key])
    db.commit()
    db.refresh(f)
    return f

def delete_file(db: Session, file_id: str):
    f = get_file_by_id(db, file_id)
    if f:
        db.delete(f)
        db.commit()

# --- FileChunk CRUD ---

def insert_file_chunks(db, file_id: str, course_id: str, chunks: list[str], vectors) -> int:
    """
    Inserts chunked text and their embeddings into the FileChunk table.
    Returns the number of inserted chunks.
    """
    rows = [
        FileChunk(
            file_id=file_id,
            course_id=course_id,
            chunk_index=i,
            content=chunk,
            embedding=vec
        )
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]

    db.bulk_save_objects(rows)
    db.commit()
    return len(rows)

# --- AccessCode CRUD ---

def get_access_code_by_id(db: Session, code_id):
    if isinstance(code_id, str):
        code_id = uuid.UUID(code_id)
    return db.execute(
        select(AccessCode).filter_by(id=code_id)
    ).scalars().first()


def get_access_code_by_course(db: Session, course_id):
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    return db.execute(
        select(AccessCode).filter_by(course_id=course_id)
    ).scalars().all()


def get_access_code_by_code(db: Session, code: str):
    return db.execute(select(AccessCode).filter_by(code=code)).scalars().first()


def create_access_code(db: Session, course_id: str, code: str):
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    ac = AccessCode(course_id=course_id, code=code)
    db.add(ac)
    db.commit()
    db.refresh(ac)
    return ac


def update_access_code(db: Session, code_id: str, **kwargs):
    ac = get_access_code_by_id(db, code_id)
    if not ac:
        return None
    if 'code' in kwargs:
        ac.code = kwargs['code']
    db.commit()
    db.refresh(ac)
    return ac


def delete_access_code(db: Session, code_id: str):
    ac = get_access_code_by_id(db, code_id)
    if ac:
        db.delete(ac)
        db.commit()

# --- Enrollment CRUD ---

def get_enrollment(db: Session, enrollment_id):
    if isinstance(enrollment_id, str):
        enrollment_id = uuid.UUID(enrollment_id)
    return db.execute(
        select(Enrollment).filter_by(id=enrollment_id)
    ).scalars().first()


def get_enrollment_by_student_course(db: Session, user_id, course_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    return db.execute(
        select(Enrollment)
        .filter_by(user_id=user_id, course_id=course_id)
    ).scalars().first()

def get_enrollments_by_student(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(
        select(Enrollment).filter_by(user_id=user_id)
    ).scalars().all()


def get_enrollments_by_course(db: Session, course_id: str):
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    return db.execute(select(Enrollment).filter_by(course_id=course_id)).scalars().all()


def create_enrollment(db: Session, user_id: str, course_id: str):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    e = Enrollment(user_id=user_id, course_id=course_id)
    db.add(e); db.commit(); db.refresh(e)
    return e

def delete_enrollment(db: Session, user_id: str, course_id: str):
    e = get_enrollment_by_student_course(db, user_id, course_id)
    if e:
        db.delete(e); db.commit()

# --- PersonalizedFile CRUD ---

def get_personalized_file_by_id(db: Session, pf_id):
    if isinstance(pf_id, str):
        pf_id = uuid.UUID(pf_id)
    return db.execute(
        select(PersonalizedFile).filter_by(id=pf_id)
    ).scalars().first()


def get_personalized_files_by_student(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(
        select(PersonalizedFile)
        .filter_by(user_id=user_id)
        .order_by(desc(PersonalizedFile.created_at))
    ).scalars().all()


def create_personalized_file(db: Session, user_id: str, original_file_id: str, content: dict):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    if original_file_id and isinstance(original_file_id, str):
        original_file_id = uuid.UUID(original_file_id)
    pf = PersonalizedFile(user_id=user_id,
                          original_file_id=original_file_id,
                          content=content)
    db.add(pf); db.commit(); db.refresh(pf)
    return pf


def update_personalized_file(db: Session, pf_id: str, **kwargs):
    pf = get_personalized_file_by_id(db, pf_id)
    if not pf:
        return None
    if 'content' in kwargs:
        pf.content = kwargs['content']
    db.commit()
    db.refresh(pf)
    return pf


def delete_personalized_file(db: Session, pf_id: str):
    pf = get_personalized_file_by_id(db, pf_id)
    if pf:
        db.delete(pf)
        db.commit()

# --- Chat & Message CRUD ---

def get_chat_by_id(db: Session, chat_id):
    if isinstance(chat_id, str):
        chat_id = uuid.UUID(chat_id)
    return db.execute(select(Chat).filter_by(id=chat_id)).scalars().first()


def get_chats_by_student(db: Session, user_id):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return db.execute(
        select(Chat).filter_by(user_id=user_id)
                          .order_by(desc(Chat.created_at))
    ).scalars().all()

def create_chat(db: Session, user_id: str, file_id: str, title: str):
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    if file_id and isinstance(file_id, str):
        file_id = uuid.UUID(file_id)

    c = Chat(user_id=user_id, file_id=file_id, title=title)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

def update_chat(db: Session, chat_id: str, **kwargs):
    c = get_chat_by_id(db, chat_id)
    if not c:
        return None
    if 'title' in kwargs:
        c.title = kwargs['title']
    db.commit()
    db.refresh(c)
    return c


def delete_chat(db: Session, chat_id: str):
    c = get_chat_by_id(db, chat_id)
    if c:
        db.delete(c)
        db.commit()


def get_message_by_id(db: Session, message_id):
    if isinstance(message_id, str):
        message_id = uuid.UUID(message_id)
    return db.execute(select(Message).filter_by(id=message_id)).scalars().first()


def get_messages_by_chat(db: Session, chat_id: str):
    if isinstance(chat_id, str):
        chat_id = uuid.UUID(chat_id)
    return db.execute(
        select(Message)
        .filter_by(chat_id=chat_id)
        .order_by(asc(Message.created_at))
    ).scalars().all()


def create_message(db: Session, chat_id: str, role: str, content: str):
    if isinstance(chat_id, str):
        chat_id = uuid.UUID(chat_id)
    m = Message(chat_id=chat_id, role=role, content=content)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def delete_messages_after(db: Session, chat_id: str, timestamp: datetime):
    if isinstance(chat_id, str):
        chat_id = uuid.UUID(chat_id)
    db.query(Message).filter(Message.chat_id == chat_id, Message.created_at > timestamp).delete(synchronize_session=False)
    db.commit()

# --- Report CRUD ---

def get_report_by_id(db: Session, report_id: str):
    if isinstance(report_id, str):
        report_id = uuid.UUID(report_id)
    return db.execute(select(Report).filter_by(id=report_id)).scalars().first()


def get_report_by_course(db: Session, course_id: str) -> Report | None:
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    return db.execute(
        select(Report).filter_by(course_id=course_id)
    ).scalars().first()


def create_report(db: Session, course_id: str, summary: dict):
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    r = Report(course_id=course_id, summary=summary)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def update_report(db: Session, report_id: str, **kwargs):
    r = get_report_by_id(db, report_id)
    if not r:
        return None
    if 'summary' in kwargs:
        r.summary = kwargs['summary']
    db.commit()
    db.refresh(r)
    return r


def delete_report(db: Session, report_id: str):
    r = get_report_by_id(db, report_id)
    if r:
        db.delete(r)
        db.commit()

# --- News & Market CRUD ---

def get_news_by_id(db: Session, news_id: str):
    if isinstance(news_id, str):
        news_id = uuid.UUID(news_id)
    return db.execute(select(News).filter_by(id=news_id)).scalars().first()


def list_news(db: Session):
    return db.execute(select(News)).scalars().all()


def create_news(db: Session, title: str, subject: str, link: str):
    n = News(title=title, subject=subject, link=link)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def update_news(db: Session, news_id: str, **kwargs):
    n = get_news_by_id(db, news_id)
    if not n:
        return None
    for key in ('title', 'subject', 'link'):
        if key in kwargs:
            setattr(n, key, kwargs[key])
    db.commit()
    db.refresh(n)
    return n


def delete_news(db: Session, news_id: str):
    n = get_news_by_id(db, news_id)
    if n:
        db.delete(n)
        db.commit()


def get_market_by_id(db: Session, market_id: str):
    if isinstance(market_id, str):
        market_id = uuid.UUID(market_id)
    return db.execute(select(Market).filter_by(id=market_id)).scalars().first()


def list_market(db: Session):
    return db.execute(select(Market)).scalars().all()


def create_market(db: Session, snp500: float, date: str):
    m = Market(snp500=snp500, date=date)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def update_market(db: Session, market_id: str, **kwargs):
    m = get_market_by_id(db, market_id)
    if not m:
        return None
    if 'snp500' in kwargs:
        m.snp500 = kwargs['snp500']
    if 'date' in kwargs:
        m.date = kwargs['date']
    db.commit()
    db.refresh(m)
    return m


def delete_market(db: Session, market_id: str):
    m = get_market_by_id(db, market_id)
    if m:
        db.delete(m)
        db.commit()

def transcribe_audio(db: Session, file_id: str, transcription: str):
    return update_file(db, file_id, transcription=transcription)

def get_student_questions_for_course(db: Session, course_id: str) -> list[str]:
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    stmt = (
        select(Message.content)
        .join(Chat, Chat.id == Message.chat_id)
        .join(File, File.id == Chat.file_id)
        .join(Module, Module.id == File.module_id)
        .filter(Module.course_id == course_id, Message.role == 'user')
    )
    return [row[0] for row in db.execute(stmt).all()]

def get_course_title(db: Session, course_id: str) -> str:
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    course = get_course_by_id(db, course_id)
    if not course:
        raise ValueError(f"Course {course_id} not found")
    return course.title

def get_file_metrics_for_course(db: Session, course_id: str) -> list[dict]:
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    stmt = (
        select(
            File.id,
            File.view_count_raw,
            File.view_count_personalized,
            File.chat_count
        )
        .join(Module, Module.id == File.module_id)
        .filter(Module.course_id == course_id)
    )
    rows = db.execute(stmt).all()
    return [
        {
            'fileId': str(fid),
            'rawViews': raw,
            'personalizedViews': pviews,
            'chatCount': chats
        }
        for fid, raw, pviews, chats in rows
    ]


def get_module_metrics_for_course(db: Session, course_id: str) -> list[dict]:
    if isinstance(course_id, str):
        course_id = uuid.UUID(course_id)
    stmt = (
        select(
            Module.id,
            func.sum(File.view_count_raw + File.view_count_personalized).label('views'),
            func.sum(File.chat_count).label('chats')
        )
        .join(File, File.module_id == Module.id)
        .filter(Module.course_id == course_id)
        .group_by(Module.id)
    )
    rows = db.execute(stmt).all()
    return [
        {
            'moduleId': str(mid),
            'views': views,
            'chatCount': chats
        }
        for mid, views, chats in rows
    ]