from sqlalchemy import select, and_, desc, asc
from sqlalchemy.orm import Session
from src.db.schema import Course, User, Chat, Message, Vote, Document, Suggestion, Onboarding, News, Market, File
from werkzeug.security import generate_password_hash, check_password_hash
from typing import List, Optional
from datetime import date
import uuid

def get_user_by_email(db: Session, email: str):
    try:
        result = db.execute(select(User).filter_by(email=email)).scalars().first()
        return result
    except Exception as e:
        print(f"Error retrieving user: {e}")
        raise

def create_user(db: Session, email: str, password: str, firebase_uid: str):
    try:
        hashed_password = generate_password_hash(password)
        new_user = User(email=email, password=hashed_password, firebase_uid=firebase_uid)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        print(f"Error creating user: {e}")
        raise

def save_chat(db: Session, user_id: str, title: str):

    try:
        new_chat = Chat(userId=user_id, title=title)
        db.add(new_chat)
        db.commit()
        return new_chat
    except Exception as e:
        print(f"Error saving chat: {e}")
        raise

def delete_chat_by_id(db: Session, chat_id: str):

    try:
        db.query(Vote).filter(Vote.chat_id == chat_id).delete()
        db.query(Message).filter(Message.chat_id == chat_id).delete()
        db.query(Chat).filter(Chat.id == chat_id).delete()
        db.commit()
    except Exception as e:
        print(f"Error deleting chat: {e}")
        raise

def get_chats_by_user_id(db: Session, user_id: str):

    try:
        return db.execute(select(Chat).filter_by(userId=user_id).order_by(desc(Chat.createdAt))).scalars().all()
    except Exception as e:
        print(f"Error retrieving chats by user: {e}")
        raise

def get_chat_by_id(db: Session, chat_id: str):

    try:
        return db.execute(select(Chat).filter_by(id=chat_id)).scalars().first()
    except Exception as e:
        print(f"Error retrieving chat: {e}")
        raise

def save_messages(db: Session, messages: list):

    try:
        db.add_all(messages)
        db.commit()
    except Exception as e:
        print(f"Error saving messages: {e}")
        raise

def get_messages_by_chat_id(db: Session, chat_id: str):

    try:
        return db.execute(select(Message).filter_by(chatId=chat_id).order_by(asc(Message.createdAt))).scalars().all()
    except Exception as e:
        print(f"Error retrieving messages by chat ID: {e}")
        raise

def vote_message(db: Session, chat_id: str, message_id: str, vote_type: str):

    try:
        existing_vote = db.execute(select(Vote).filter_by(messageId=message_id)).scalars().first()

        if existing_vote:
            existing_vote.is_upvoted = vote_type == 'up'
            db.commit()
        else:
            new_vote = Vote(chatId=chat_id, messageId=message_id, isUpvoted=(vote_type == 'up'))
            db.add(new_vote)
            db.commit()
    except Exception as e:
        print(f"Error voting on message: {e}")
        raise

def get_votes_by_chat_id(db: Session, chat_id: str):

    try:
        return db.execute(select(Vote).filter_by(chatId=chat_id)).scalars().all()
    except Exception as e:
        print(f"Error retrieving votes by chat ID: {e}")
        raise

def save_document(db: Session, user_id: str, title: str, kind: str, content: str):

    try:
        new_document = Document(userId=user_id, title=title, kind=kind, content=content)
        db.add(new_document)
        db.commit()
        return new_document
    except Exception as e:
        print(f"Error saving document: {e}")
        raise

def get_documents_by_id(db: Session, document_id: str):

    try:
        return db.execute(select(Document).filter_by(id=document_id).order_by(asc(Document.createdAt))).scalars().all()
    except Exception as e:
        print(f"Error retrieving documents by ID: {e}")
        raise

def get_document_by_id(db: Session, document_id: str):

    try:
        return db.execute(select(Document).filter_by(id=document_id).order_by(desc(Document.createdAt))).scalars().first()
    except Exception as e:
        print(f"Error retrieving document: {e}")
        raise

def delete_documents_by_id_after_timestamp(db: Session, document_id: str, timestamp: str):

    try:
        db.query(Suggestion).filter(and_(Suggestion.documentId == document_id, Suggestion.createdAt > timestamp)).delete()
        db.query(Document).filter(and_(Document.id == document_id, Document.createdAt > timestamp)).delete()
        db.commit()
    except Exception as e:
        print(f"Error deleting documents: {e}")
        raise

def save_suggestions(db: Session, suggestions: list):

    try:
        db.add_all(suggestions)
        db.commit()
    except Exception as e:
        print(f"Error saving suggestions: {e}")
        raise

def get_suggestions_by_document_id(db: Session, document_id: str):

    try:
        return db.execute(select(Suggestion).filter_by(documentId=document_id)).scalars().all()
    except Exception as e:
        print(f"Error retrieving suggestions by document ID: {e}")
        raise

def get_message_by_id(db: Session, message_id: str):

    try:
        return db.execute(select(Message).filter_by(id=message_id)).scalars().first()
    except Exception as e:
        print(f"Error retrieving message: {e}")
        raise

def delete_messages_by_chat_id_after_timestamp(db: Session, chat_id: str, timestamp: str):

    try:
        db.query(Message).filter(and_(Message.chatId == chat_id, Message.createdAt >= timestamp)).delete()
        db.commit()
    except Exception as e:
        print(f"Error deleting messages: {e}")
        raise

def update_chat_visibility_by_id(db: Session, chat_id: str, visibility: str):

    try:
        chat = db.execute(select(Chat).filter_by(id=chat_id)).scalars().first()
        if chat:
            chat.visibility = visibility
            db.commit()
            return chat
        else:
            print(f"Chat with ID {chat_id} not found.")
            raise Exception("Chat not found")
    except Exception as e:
        print(f"Error updating chat visibility: {e}")
        raise

def create_onboarding(
    db: Session,
    user_id: str,
    name: str,
    answers: List[Optional[str]],
    quizzes: bool = False
) -> Onboarding:

    try:
        onboarding_record = Onboarding(
            userId=user_id,
            name=name,
            answers=answers,
            quizzes=quizzes,
        )
        db.add(onboarding_record)
        db.commit()
        db.refresh(onboarding_record)
        return onboarding_record
    except Exception as e:
        print("Error creating onboarding record:", e)
        db.rollback()
        raise e
    
def get_onboarding(db: Session, user_id: str) -> Optional[Onboarding]:

    try:
        return db.execute(
            select(Onboarding).filter_by(userId=user_id)
        ).scalars().first()
    except Exception as e:
        print("Error retrieving onboarding record:", e)
        raise e
    
def save_market_item(db: Session, snp500: float, date_value: date) -> Market:

    try:
        new_market = Market(
            id=uuid.uuid4(),
            snp500=snp500,
            date=date_value
        )
        db.add(new_market)
        db.commit()
        db.refresh(new_market)
        return new_market
    except Exception as e:
        db.rollback()
        print("Error saving market item:", e)
        raise

def get_recent_market_prices(db: Session, limit_count: int = 30):

    try:
        stmt = (
            select(Market)
            .order_by(asc(Market.date))
            .limit(limit_count)
        )
        return db.execute(stmt).scalars().all()
    except Exception as e:
        print("Error retrieving recent market prices:", e)
        raise

def get_market_item_by_id(db: Session, market_id: str) -> Market:

    try:
        stmt = select(Market).where(Market.id == market_id)
        return db.execute(stmt).scalars().first()
    except Exception as e:
        print("Error retrieving market item by ID:", e)
        raise

def delete_market_item_by_id(db: Session, market_id: str):

    try:
        target = db.query(Market).filter(Market.id == market_id).first()
        if target:
            db.delete(target)
            db.commit()
    except Exception as e:
        db.rollback()
        print("Error deleting market item:", e)
        raise

def save_news_item(db: Session, title: str, subject: str, link: str) -> News:

    try:
        new_news = News(
            id=uuid.uuid4(),
            title=title,
            subject=subject,
            link=link
        )
        db.add(new_news)
        db.commit()
        db.refresh(new_news)
        return new_news
    except Exception as e:
        db.rollback()
        print("Error saving news item:", e)
        raise

def get_all_news(db: Session):

    try:
        stmt = select(News)
        return db.execute(stmt).scalars().all()
    except Exception as e:
        print("Error retrieving all news:", e)
        raise

def get_news_by_id(db: Session, news_id: str) -> News:

    try:
        stmt = select(News).where(News.id == news_id)
        return db.execute(stmt).scalars().first()
    except Exception as e:
        print("Error retrieving news by ID:", e)
        raise

def delete_news_by_id(db: Session, news_id: str):

    try:
        target = db.query(News).filter(News.id == news_id).first()
        if target:
            db.delete(target)
            db.commit()
    except Exception as e:
        db.rollback()
        print("Error deleting news item:", e)
        raise

def get_user_by_firebase_uid(db: Session, firebase_uid: str):
    try:
        result = db.execute(select(User).filter_by(firebase_uid=firebase_uid)).first()
        return result[0] if result is not None else None
    except Exception as e:
        print("Error retrieving user by firebase_uid:", e)
        raise

def update_user_by_firebase_uid(db: Session, firebase_uid: str, update_data: dict):

    try:
        user = get_user_by_firebase_uid(db, firebase_uid)
        if not user:
            raise Exception("User not found")
        if "email" in update_data:
            user.email = update_data["email"]
        if "password" in update_data:
            user.password = generate_password_hash(update_data["password"])
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise e

def delete_user_by_firebase_uid(db: Session, firebase_uid: str):

    try:
        user = get_user_by_firebase_uid(db, firebase_uid)
        if not user:
            raise Exception("User not found")
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

def update_onboarding_by_user_id(db: Session, user_id: str, update_data: dict):

    try:
        onboarding = db.execute(
            select(Onboarding).filter_by(userId=user_id)
        ).scalars().first()
        if not onboarding:
            raise Exception("Onboarding record not found")
        if "name" in update_data:
            onboarding.name = update_data["name"]
        if "answers" in update_data:
            onboarding.answers = update_data["answers"]
        if "quizzes" in update_data:
            onboarding.quizzes = update_data["quizzes"]
        db.commit()
        db.refresh(onboarding)
        return onboarding
    except Exception as e:
        db.rollback()
        raise e

def delete_onboarding_by_user_id(db: Session, user_id: str):

    try:
        onboarding = db.execute(
            select(Onboarding).filter_by(userId=user_id)
        ).scalars().first()
        if not onboarding:
            raise Exception("Onboarding record not found")
        db.delete(onboarding)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

def create_course(
    db: Session,
    user_id: str,
    topic: str,
    expertise: str,
    content: dict,
    pkl: bytes = None,
    index: bytes = None,
    file_id: Optional[str] = None
) -> Course:
    try:
        new_course = Course(
            userId=user_id,
            topic=topic,
            expertise=expertise,
            content=content,
            pkl=pkl,
            index=index,
            fileId=file_id
        )
        db.add(new_course)
        db.commit()
        db.refresh(new_course)
        return new_course
    except Exception as e:
        db.rollback()
        print(f"Error creating course: {e}")
        raise

def get_course_by_id(db: Session, course_id: str) -> Optional[Course]:
    try:
        return db.execute(select(Course).filter_by(id=course_id)).scalars().first()
    except Exception as e:
        print(f"Error retrieving course by ID: {e}")
        raise

def get_courses_by_user_id(db: Session, user_id: str) -> List[Course]:
    try:
        return db.execute(select(Course).filter_by(userId=user_id).order_by(desc(Course.createdAt))).scalars().all()
    except Exception as e:
        print(f"Error retrieving courses by user: {e}")
        raise

def update_course_file(db: Session, course_id: str, file_id: str) -> Course:
    try:
        course = get_course_by_id(db, course_id)
        if not course:
            raise Exception("Course not found")
        course.fileId = file_id
        db.commit()
        db.refresh(course)
        return course
    except Exception as e:
        db.rollback()
        print(f"Error updating course file reference: {e}")
        raise

def delete_course_by_id(db: Session, course_id: str):
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            db.delete(course)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error deleting course: {e}")
        raise

def create_file(
    db: Session,
    filename: str,
    file_type: str,
    file_size: int,
    file_data: bytes
) -> File:
    try:
        new_file = File(
            filename=filename,
            fileType=file_type,
            fileSize=file_size,
            fileData=file_data
        )
        db.add(new_file)
        db.commit()
        db.refresh(new_file)
        return new_file
    except Exception as e:
        db.rollback()
        print(f"Error creating file: {e}")
        raise

def get_file_by_id(db: Session, file_id: str) -> Optional[File]:
    try:
        return db.execute(select(File).filter_by(id=file_id)).scalars().first()
    except Exception as e:
        print(f"Error retrieving file by ID: {e}")
        raise

def delete_file_by_id(db: Session, file_id: str):
    try:
        file_record = db.query(File).filter(File.id == file_id).first()
        if file_record:
            db.delete(file_record)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error deleting file: {e}")
        raise

def get_files_by_user_id(db: Session, user_id: str) -> List[File]:
    try:
        stmt = select(File).join(Course, File.id == Course.fileId).filter(Course.userId == user_id)
        return db.execute(stmt).scalars().all()
    except Exception as e:
        print(f"Error retrieving files by user: {e}")
        raise

def update_course(db: Session, course_id: str, update_data: dict) -> Course:
    """
    Update an existing course with provided fields.
    Allowed keys: 'topic', 'expertise', 'content', 'fileId'
    """
    try:
        course = get_course_by_id(db, course_id)
        if not course:
            raise Exception("Course not found")
        if "topic" in update_data:
            course.topic = update_data["topic"]
        if "expertise" in update_data:
            course.expertise = update_data["expertise"]
        if "content" in update_data:
            course.content = update_data["content"]
        if "fileId" in update_data:
            course.fileId = update_data["fileId"]
        db.commit()
        db.refresh(course)
        return course
    except Exception as e:
        db.rollback()
        print(f"Error updating course: {e}")
        raise

def update_file(db: Session, file_id: str, update_data: dict) -> File:
    """
    Update an existing file with provided fields.
    Allowed keys: 'filename', 'fileType', 'fileData', and 'fileSize'
    (Typically, if updating the file data, you might re-calculate fileSize on the fly.)
    """
    try:
        file_record = get_file_by_id(db, file_id)
        if not file_record:
            raise Exception("File not found")
        if "filename" in update_data:
            file_record.filename = update_data["filename"]
        if "fileType" in update_data:
            file_record.fileType = update_data["fileType"]
        if "fileData" in update_data:
            file_record.fileData = update_data["fileData"]
        if "fileSize" in update_data:
            file_record.fileSize = update_data["fileSize"]
        db.commit()
        db.refresh(file_record)
        return file_record
    except Exception as e:
        db.rollback()
        print(f"Error updating file: {e}")
        raise