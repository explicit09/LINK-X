"""
Poison Message Detection Service
Prevents large/malformed chunks from starving the embedding queue.
"""
import re
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import unicodedata

logger = logging.getLogger(__name__)


class PoisonType(Enum):
    """Types of poison messages"""
    TOO_LARGE = "too_large"
    TOO_MANY_TOKENS = "too_many_tokens"
    INVALID_UTF8 = "invalid_utf8"
    MALFORMED_TEXT = "malformed_text"
    BINARY_DATA = "binary_data"


@dataclass
class PoisonDetectionResult:
    """Result of poison detection"""
    is_poison: bool
    poison_type: Optional[PoisonType] = None
    reason: str = ""
    suggested_action: str = ""
    safe_chunks: List[str] = None  # If we can salvage parts


class PoisonMessageDetector:
    """
    Detects and handles poison messages that could break embedding generation.
    
    Checks for:
    - Content too large for OpenAI API
    - Malformed UTF-8 encoding
    - Binary data disguised as text
    - Excessive token counts
    - Malformed text that breaks tokenization
    """
    
    # OpenAI limits
    MAX_TOKENS_PER_REQUEST = 32000  # Conservative limit
    MAX_CHUNK_SIZE_CHARS = 50000    # ~12.5k tokens estimate
    MAX_BATCH_TOKENS = 100000       # Total tokens per batch
    
    # Text quality thresholds
    MIN_PRINTABLE_RATIO = 0.7       # 70% printable characters
    MAX_REPEATED_CHAR_RATIO = 0.5   # 50% repeated characters
    
    def __init__(self):
        # Common binary file signatures
        self.binary_signatures = [
            b'\x89PNG',     # PNG
            b'\xFF\xD8\xFF', # JPEG
            b'%PDF',        # PDF
            b'PK\x03\x04',  # ZIP
            b'\x50\x4B',    # ZIP variant
            b'\x00\x00',    # NULL bytes
        ]
        
        # Patterns that indicate malformed text
        self.malformed_patterns = [
            re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]'),  # Control chars
            re.compile(r'(.)\1{100,}'),  # 100+ repeated characters
            re.compile(r'[^\x00-\x7F]{1000,}'),  # Long non-ASCII sequences
        ]
    
    def estimate_token_count(self, text: str) -> int:
        """Rough token count estimation"""
        # Simple heuristic: 1 token ≈ 4 characters for English text
        # Add extra for non-ASCII characters
        ascii_chars = sum(1 for c in text if ord(c) < 128)
        non_ascii_chars = len(text) - ascii_chars
        
        # Non-ASCII chars often use more tokens
        estimated_tokens = (ascii_chars // 4) + (non_ascii_chars // 2)
        
        return estimated_tokens
    
    def detect_binary_content(self, text: str) -> bool:
        """Detect if text contains binary data"""
        try:
            text_bytes = text.encode('utf-8')
            
            # Check for binary signatures
            for signature in self.binary_signatures:
                if signature in text_bytes[:1024]:  # Check first 1KB
                    return True
            
            # Check for excessive null bytes
            null_ratio = text_bytes.count(b'\x00') / len(text_bytes)
            if null_ratio > 0.01:  # More than 1% null bytes
                return True
                
            return False
            
        except UnicodeError:
            return True  # Can't encode = likely binary
    
    def analyze_text_quality(self, text: str) -> Tuple[float, float]:
        """Analyze text quality metrics"""
        if not text:
            return 0.0, 0.0
        
        # Calculate printable character ratio
        printable_chars = sum(1 for c in text if c.isprintable() or c.isspace())
        printable_ratio = printable_chars / len(text)
        
        # Calculate repeated character ratio
        char_counts = {}
        for char in text:
            char_counts[char] = char_counts.get(char, 0) + 1
        
        max_repeated = max(char_counts.values()) if char_counts else 0
        repeated_ratio = max_repeated / len(text)
        
        return printable_ratio, repeated_ratio
    
    def check_malformed_patterns(self, text: str) -> List[str]:
        """Check for malformed text patterns"""
        issues = []
        
        for pattern in self.malformed_patterns:
            if pattern.search(text):
                issues.append(f"Contains pattern: {pattern.pattern}")
        
        # Check for excessive whitespace
        whitespace_ratio = sum(1 for c in text if c.isspace()) / len(text) if text else 0
        if whitespace_ratio > 0.8:
            issues.append("Excessive whitespace (>80%)")
        
        # Check for valid UTF-8
        try:
            text.encode('utf-8').decode('utf-8')
        except UnicodeError as e:
            issues.append(f"Invalid UTF-8: {e}")
        
        return issues
    
    def attempt_text_repair(self, text: str) -> Optional[str]:
        """Attempt to repair malformed text"""
        try:
            # Remove control characters
            cleaned = ''.join(c for c in text if unicodedata.category(c)[0] != 'C' or c.isspace())
            
            # Limit repeated characters
            def limit_repeats(match):
                char = match.group(1)
                return char * min(10, len(match.group(0)))  # Max 10 repeats
            
            cleaned = re.sub(r'(.)\1{10,}', limit_repeats, cleaned)
            
            # Ensure valid UTF-8
            cleaned = cleaned.encode('utf-8', errors='ignore').decode('utf-8')
            
            # Check if repair was successful
            if len(cleaned) > len(text) * 0.5:  # Retained at least 50% of content
                return cleaned
            
        except Exception as e:
            logger.warning(f"Text repair failed: {e}")
        
        return None
    
    def split_large_content(self, text: str, max_chunk_size: int = None) -> List[str]:
        """Split large content into safe chunks"""
        if max_chunk_size is None:
            max_chunk_size = self.MAX_CHUNK_SIZE_CHARS
        
        if len(text) <= max_chunk_size:
            return [text]
        
        chunks = []
        
        # Try to split on sentence boundaries first
        sentences = re.split(r'[.!?]+\s+', text)
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) <= max_chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # If we still have chunks that are too large, split by words
        final_chunks = []
        for chunk in chunks:
            if len(chunk) <= max_chunk_size:
                final_chunks.append(chunk)
            else:
                # Force split by words
                words = chunk.split()
                current_chunk = ""
                
                for word in words:
                    if len(current_chunk) + len(word) + 1 <= max_chunk_size:
                        current_chunk += word + " "
                    else:
                        if current_chunk:
                            final_chunks.append(current_chunk.strip())
                        current_chunk = word + " "
                
                if current_chunk:
                    final_chunks.append(current_chunk.strip())
        
        return final_chunks
    
    def detect_poison(self, text: str) -> PoisonDetectionResult:
        """
        Main poison detection method.
        
        Returns detection result with suggested action.
        """
        if not text or not text.strip():
            return PoisonDetectionResult(
                is_poison=True,
                poison_type=PoisonType.MALFORMED_TEXT,
                reason="Empty or whitespace-only content",
                suggested_action="discard"
            )
        
        # Check size limits
        if len(text) > self.MAX_CHUNK_SIZE_CHARS:
            # Try to split into safe chunks
            safe_chunks = self.split_large_content(text)
            return PoisonDetectionResult(
                is_poison=True,
                poison_type=PoisonType.TOO_LARGE,
                reason=f"Content too large: {len(text)} chars > {self.MAX_CHUNK_SIZE_CHARS}",
                suggested_action="split",
                safe_chunks=safe_chunks
            )
        
        # Check token count
        estimated_tokens = self.estimate_token_count(text)
        if estimated_tokens > self.MAX_TOKENS_PER_REQUEST:
            return PoisonDetectionResult(
                is_poison=True,
                poison_type=PoisonType.TOO_MANY_TOKENS,
                reason=f"Too many tokens: ~{estimated_tokens} > {self.MAX_TOKENS_PER_REQUEST}",
                suggested_action="split"
            )
        
        # Check for binary content
        if self.detect_binary_content(text):
            return PoisonDetectionResult(
                is_poison=True,
                poison_type=PoisonType.BINARY_DATA,
                reason="Contains binary data or file signatures",
                suggested_action="discard"
            )
        
        # Check text quality
        printable_ratio, repeated_ratio = self.analyze_text_quality(text)
        
        if printable_ratio < self.MIN_PRINTABLE_RATIO:
            # Try to repair
            repaired = self.attempt_text_repair(text)
            if repaired:
                return PoisonDetectionResult(
                    is_poison=True,
                    poison_type=PoisonType.MALFORMED_TEXT,
                    reason=f"Low printable ratio: {printable_ratio:.2f}",
                    suggested_action="repair",
                    safe_chunks=[repaired]
                )
            else:
                return PoisonDetectionResult(
                    is_poison=True,
                    poison_type=PoisonType.MALFORMED_TEXT,
                    reason=f"Low printable ratio: {printable_ratio:.2f}, repair failed",
                    suggested_action="discard"
                )
        
        if repeated_ratio > self.MAX_REPEATED_CHAR_RATIO:
            return PoisonDetectionResult(
                is_poison=True,
                poison_type=PoisonType.MALFORMED_TEXT,
                reason=f"High repeated character ratio: {repeated_ratio:.2f}",
                suggested_action="discard"
            )
        
        # Check for malformed patterns
        malformed_issues = self.check_malformed_patterns(text)
        if malformed_issues:
            # Try to repair
            repaired = self.attempt_text_repair(text)
            if repaired:
                return PoisonDetectionResult(
                    is_poison=True,
                    poison_type=PoisonType.MALFORMED_TEXT,
                    reason=f"Malformed patterns: {', '.join(malformed_issues)}",
                    suggested_action="repair",
                    safe_chunks=[repaired]
                )
            else:
                return PoisonDetectionResult(
                    is_poison=True,
                    poison_type=PoisonType.MALFORMED_TEXT,
                    reason=f"Malformed patterns: {', '.join(malformed_issues)}, repair failed",
                    suggested_action="discard"
                )
        
        # Check for invalid UTF-8
        try:
            text.encode('utf-8')
        except UnicodeEncodeError as e:
            return PoisonDetectionResult(
                is_poison=True,
                poison_type=PoisonType.INVALID_UTF8,
                reason=f"Invalid UTF-8 encoding: {e}",
                suggested_action="discard"
            )
        
        # Content appears safe
        return PoisonDetectionResult(
            is_poison=False,
            reason="Content passed all safety checks"
        )
    
    def validate_batch(self, texts: List[str]) -> Tuple[List[str], List[Dict]]:
        """
        Validate a batch of texts for embedding generation.
        
        Returns:
            Tuple of (safe_texts, poison_reports)
        """
        safe_texts = []
        poison_reports = []
        
        total_tokens = 0
        
        for i, text in enumerate(texts):
            result = self.detect_poison(text)
            
            if not result.is_poison:
                # Check if adding this text would exceed batch token limit
                text_tokens = self.estimate_token_count(text)
                if total_tokens + text_tokens <= self.MAX_BATCH_TOKENS:
                    safe_texts.append(text)
                    total_tokens += text_tokens
                else:
                    poison_reports.append({
                        'index': i,
                        'type': 'batch_token_limit',
                        'reason': 'Would exceed batch token limit',
                        'action': 'defer_to_next_batch'
                    })
            else:
                poison_reports.append({
                    'index': i,
                    'type': result.poison_type.value if result.poison_type else 'unknown',
                    'reason': result.reason,
                    'action': result.suggested_action,
                    'safe_chunks': result.safe_chunks
                })
        
        return safe_texts, poison_reports


# Global instance
_poison_detector = None


def get_poison_detector() -> PoisonMessageDetector:
    """Get global poison detector instance"""
    global _poison_detector
    if _poison_detector is None:
        _poison_detector = PoisonMessageDetector()
    return _poison_detector