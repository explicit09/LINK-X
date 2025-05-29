# S3 CORS Update Instructions

To fix the PDF viewing CORS error, run the S3 CORS update script:

## Option 1: Run directly (if you have AWS credentials configured)
```bash
cd docker-image
python update_s3_cors.py
```

## Option 2: Run inside Docker container
```bash
docker exec -it learnx-backend python /app/update_s3_cors.py
```

## Option 3: Set credentials temporarily
```bash
cd docker-image
AWS_ACCESS_KEY_ID=your_key AWS_SECRET_ACCESS_KEY=your_secret AWS_REGION=us-east-1 S3_BUCKET_NAME=learn-x python update_s3_cors.py
```

This will update your S3 bucket to allow requests from localhost:3002, fixing the PDF viewing error.