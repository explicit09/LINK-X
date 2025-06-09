#!/usr/bin/env python3
"""Test script to manually create chunks with proper metadata to demonstrate the fix"""

from supabase import create_client, Client
import json
import uuid

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

def create_test_chunks():
    """Create test chunks with proper metadata to demonstrate the fix"""
    print("=== CREATING TEST CHUNKS WITH PROPER METADATA ===\n")
    
    # Create Supabase client
    supabase: Client = create_client(url, key)
    
    file_id = "fc3ecd8e-07ca-4a69-85c4-02734270c07c"
    
    # Sample chunks with rich metadata (like what the semantic chunker should produce)
    test_chunks = [
        {
            "content": "CFA Institute Research Challenge - Executive Summary\n\nThis report presents a comprehensive financial analysis of General Mills Inc. (NYSE: GIS), a leading multinational manufacturer and marketer of branded consumer foods. Our analysis covers the company's financial performance, competitive position, and future prospects in the consumer staples sector.",
            "chunk_index": 0,
            "chunk_type": "text",
            "metadata": {
                "source": "manual_test",
                "section": "executive_summary",
                "importance": "high"
            },
            "chunk_metadata": {
                "chunk_type": "introduction",
                "hierarchy_level": 0,
                "title": "Executive Summary",
                "concepts": [
                    "CFA Institute Research Challenge",
                    "General Mills Inc",
                    "Financial Analysis",
                    "Consumer Staples",
                    "NYSE: GIS"
                ],
                "references": []
            }
        },
        {
            "content": "Investment Recommendation: BUY\n\nBased on our comprehensive analysis, we recommend a BUY rating for General Mills Inc. Our target price of $85 per share represents a 15% upside from current levels. This recommendation is supported by the company's strong brand portfolio, consistent cash flow generation, and strategic initiatives in health and wellness segments.",
            "chunk_index": 1,
            "chunk_type": "text", 
            "metadata": {
                "source": "manual_test",
                "section": "recommendation",
                "importance": "critical"
            },
            "chunk_metadata": {
                "chunk_type": "conclusion",
                "hierarchy_level": 1,
                "title": "Investment Recommendation",
                "concepts": [
                    "BUY Rating",
                    "Target Price",
                    "Brand Portfolio",
                    "Cash Flow Generation",
                    "Health and Wellness"
                ],
                "references": ["chunk_0"]
            }
        },
        {
            "content": "Financial Performance Analysis\n\nGeneral Mills has demonstrated resilient financial performance over the past five years. Revenue growth has been modest but consistent, with the company successfully navigating challenging market conditions. Key financial metrics include:\n\n- Revenue: $19.9 billion (FY2023)\n- Operating Margin: 16.2%\n- Return on Equity: 28.4%\n- Debt-to-Equity Ratio: 1.1x",
            "chunk_index": 2,
            "chunk_type": "text",
            "metadata": {
                "source": "manual_test", 
                "section": "financial_analysis",
                "importance": "high"
            },
            "chunk_metadata": {
                "chunk_type": "explanation",
                "hierarchy_level": 1,
                "title": "Financial Performance Analysis", 
                "concepts": [
                    "Revenue Growth",
                    "Operating Margin",
                    "Return on Equity",
                    "Debt-to-Equity Ratio",
                    "Financial Metrics"
                ],
                "references": []
            }
        }
    ]
    
    print(f"Creating {len(test_chunks)} test chunks with rich metadata...")
    
    # Insert the test chunks
    for chunk in test_chunks:
        try:
            result = supabase.table('file_chunks').insert({
                'id': str(uuid.uuid4()),
                'file_id': file_id,
                'chunk_index': chunk['chunk_index'],
                'content': chunk['content'],
                'chunk_type': chunk['chunk_type'],
                'metadata': chunk['metadata'],
                'chunk_metadata': chunk['chunk_metadata'],
                'embedding_status': 'pending'
            }).execute()
            
            print(f"✅ Created chunk {chunk['chunk_index']}: {chunk['chunk_metadata']['title']}")
            
        except Exception as e:
            print(f"❌ Error creating chunk {chunk['chunk_index']}: {e}")
    
    # Verify the results
    print("\n=== VERIFICATION ===")
    result = supabase.table('file_chunks').select('*').eq('file_id', file_id).order('chunk_index').execute()
    
    if result.data:
        print(f"\nFound {len(result.data)} chunks for the file:")
        for chunk in result.data:
            print(f"\nChunk {chunk['chunk_index']}:")
            print(f"  Title: {chunk['chunk_metadata'].get('title', 'N/A')}")
            print(f"  Type: {chunk['chunk_metadata'].get('chunk_type', 'N/A')}")
            print(f"  Concepts: {len(chunk['chunk_metadata'].get('concepts', []))} concepts")
            print(f"  Metadata populated: {'Yes' if chunk['metadata'] else 'No'}")
            print(f"  Content length: {len(chunk['content'])}")
    else:
        print("❌ No chunks found!")

if __name__ == "__main__":
    create_test_chunks() 