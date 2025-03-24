#!/bin/bash

set -e # Exit if any command fails

# Check that script was run with a file path argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_pdf>"
    exit 1
fi

# Assign input argument to variable
PDF_PATH=$1

# Verify PDF exists
if [ ! -f $PDF_PATH ]; then
    echo "Error: File '$PDF_PATH' does not exist"
    exit 1
fi
# Verify PDF is readable
if [ ! -r $PDF_PATH ]; then
    echo "Error: File '$PDF_PATH' is not readable"
    exit 1
fi

echo "Running item_01_database_creation_FAISS.py with provided pdf"
python3 item_01_database_creation_FAISS.py "$PDF_PATH"

echo "Running item_02_generate_citations_APA_FAISS.py