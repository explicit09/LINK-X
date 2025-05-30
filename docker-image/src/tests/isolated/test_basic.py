"""
Basic isolated tests that don't import the main application
"""
import pytest

def test_basic_math():
    """Test basic math operations"""
    assert 1 + 1 == 2
    assert 2 * 3 == 6
    assert 10 / 2 == 5

def test_string_operations():
    """Test string operations"""
    text = "Hello World"
    assert text.lower() == "hello world"
    assert text.upper() == "HELLO WORLD"
    assert len(text) == 11

def test_list_operations():
    """Test list operations"""
    items = [1, 2, 3, 4, 5]
    assert len(items) == 5
    assert sum(items) == 15
    assert max(items) == 5
    assert min(items) == 1

def test_imports():
    """Test that basic libraries can be imported"""
    import json
    import datetime
    import os
    import sys
    
    # Test that we can use them
    data = {"test": "value"}
    json_str = json.dumps(data)
    parsed = json.loads(json_str)
    assert parsed["test"] == "value"
    
    now = datetime.datetime.now()
    assert isinstance(now, datetime.datetime)

def test_flask_import():
    """Test Flask import separately"""
    import flask
    from flask import Flask
    
    # Create a minimal Flask app
    app = Flask(__name__)
    assert app is not None
    assert app.name == __name__

def test_sqlalchemy_import():
    """Test SQLAlchemy import"""
    import sqlalchemy
    from sqlalchemy import create_engine
    
    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    assert engine is not None