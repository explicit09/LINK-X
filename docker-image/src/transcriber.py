import io
from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def transcribe_audio(file_storage):
    try:
        # Read file into memory as bytes
        file_bytes = file_storage.read()

        # Wrap in BytesIO so it behaves like a real file
        file_obj = io.BytesIO(file_bytes)
        file_obj.name = file_storage.filename  # OpenAI requires this!

        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=file_obj
        )

        return response.text
    except Exception as e:
        print(f"Whisper transcription failed: {e}")
        raise
