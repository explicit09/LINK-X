#!/usr/bin/env python3
"""
Clean up unused dependencies from requirements.txt
"""

import re
import sys

# Unused dependencies identified
UNUSED_DEPS = [
    'streamlit',
    'replicate',
    'sse-starlette',
    'llama_index',
]

def clean_requirements():
    """Remove unused dependencies from requirements.txt"""
    
    try:
        # Read current requirements
        with open('src/requirements.txt', 'r') as f:
            lines = f.readlines()
        
        # Filter out unused dependencies
        cleaned_lines = []
        removed = []
        
        for line in lines:
            # Check if line contains any unused dependency
            is_unused = False
            for dep in UNUSED_DEPS:
                if line.strip().startswith(dep):
                    is_unused = True
                    removed.append(line.strip())
                    break
            
            if not is_unused:
                cleaned_lines.append(line)
        
        # Show what will be removed
        print("=== Requirements.txt Cleanup ===")
        print("\nThe following dependencies will be removed:")
        for dep in removed:
            print(f"  - {dep}")
        
        if not removed:
            print("No unused dependencies found.")
            return
        
        # Ask for confirmation
        response = input("\nProceed with cleanup? (y/N): ").strip().lower()
        if response != 'y':
            print("Cleanup cancelled.")
            return
        
        # Write cleaned requirements
        with open('src/requirements.txt', 'w') as f:
            f.writelines(cleaned_lines)
        
        print("\n✓ requirements.txt has been cleaned!")
        print(f"Removed {len(removed)} unused dependencies.")
        
        # Save removed dependencies for reference
        with open('removed_dependencies.txt', 'w') as f:
            f.write("# Dependencies removed from requirements.txt\n")
            f.write("# Date: " + str(__import__('datetime').datetime.now()) + "\n\n")
            for dep in removed:
                f.write(dep + "\n")
        
        print("✓ Removed dependencies saved to removed_dependencies.txt")
        
    except FileNotFoundError:
        print("Error: requirements.txt not found in src/")
        print("Make sure you run this script from the docker-image directory.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    clean_requirements()