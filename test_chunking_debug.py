#!/usr/bin/env python3
"""Test script to debug chunking configuration and metadata generation"""

import sys
import os

# Add the docker-image/src path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'docker-image', 'src'))

from core.chunking_config import ChunkingConfig
from utils.semantic_chunker import create_enhanced_chunks

def test_chunking_config():
    """Test the current chunking configuration"""
    print("=== CHUNKING CONFIGURATION ANALYSIS ===\n")
    
    config = ChunkingConfig()
    
    print(f"DEFAULT_STRATEGY: {config.DEFAULT_STRATEGY}")
    print(f"EXTRACT_METADATA: {config.EXTRACT_METADATA}")
    print(f"METADATA_FIELDS: {config.METADATA_FIELDS}")
    print()
    
    # Test for PDF file type
    print("Configuration for PDF files:")
    should_use_semantic = config.should_use_semantic('pdf')
    print(f"should_use_semantic('pdf'): {should_use_semantic}")
    
    params = config.get_chunking_params('semantic')
    print(f"Semantic chunking params: {params}")
    print()
    
    # Test with sample text
    sample_text = """
    Introduction to Financial Analysis
    
    Financial analysis is the process of evaluating businesses, projects, budgets, and other finance-related transactions to determine their performance and suitability. This chapter covers the fundamental concepts that every analyst must understand.
    
    What is Financial Analysis?
    
    Financial analysis is defined as the process of assessing the viability, stability, and profitability of a business, sub-business or project. It involves using financial data to evaluate a company's performance and make recommendations about future business decisions.
    
    Key Concepts
    
    Some important concepts include:
    - Cash flow analysis
    - Ratio analysis  
    - Risk assessment
    
    For example, when analyzing a company's liquidity, we examine current assets versus current liabilities. This gives us the current ratio, which indicates short-term financial health.
    
    Conclusion
    
    In summary, financial analysis provides crucial insights for investment decisions and business strategy formulation.
    """
    
    print("Testing chunk generation with sample text...")
    chunks = create_enhanced_chunks(sample_text, 'pdf')
    
    print(f"Generated {len(chunks)} chunks:")
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i}:")
        print(f"  Content length: {len(chunk['content'])}")
        print(f"  Chunk type: {chunk['chunk_type']}")
        print(f"  Metadata: {chunk['metadata']}")
        print(f"  Content preview: {chunk['content'][:100]}...")

if __name__ == "__main__":
    test_chunking_config() 