# AWS Credentials Setup Guide for LEARN-X

This guide will help you set up AWS credentials for the LEARN-X project to enable S3 file storage functionality.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **IAM User**: Create an IAM user with S3 permissions (recommended over using root credentials)
3. **S3 Bucket**: Create an S3 bucket for file storage

## Step 1: Create AWS IAM User and Get Credentials

### 1.1 Create IAM User
1. Log into AWS Console
2. Go to IAM → Users → Create User
3. Choose a username (e.g., `learnx-s3-user`)
4. Select "Programmatic access"

### 1.2 Attach Permissions
Attach the following policy to your user (or create a custom policy):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetObjectVersion",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::learnx-files",
                "arn:aws:s3:::learnx-files/*"
            ]
        }
    ]
}
```

### 1.3 Get Access Keys
1. After creating the user, download the CSV file with:
   - Access Key ID
   - Secret Access Key
2. **Important**: Store these securely and never commit them to version control

## Step 2: Create S3 Bucket

1. Go to S3 in AWS Console
2. Click "Create bucket"
3. Choose a unique name (e.g., `learnx-files-[your-suffix]`)
4. Select your preferred region (default: `us-east-1`)
5. Configure settings:
   - **Block Public Access**: Keep enabled for security
   - **Versioning**: Optional (recommended for file recovery)
   - **Encryption**: Enable server-side encryption

## Step 3: Configure Environment Variables

### Option 1: Using the provided script (Recommended for development)

1. **Edit the script with your credentials**:
   ```bash
   nano set_aws_env.sh
   ```
   
2. **Replace the placeholder values**:
   ```bash
   export AWS_ACCESS_KEY_ID="your-actual-access-key-id"
   export AWS_SECRET_ACCESS_KEY="your-actual-secret-access-key"
   export S3_BUCKET_NAME="your-actual-bucket-name"
   ```

3. **Run the script**:
   ```bash
   source ./set_aws_env.sh
   ```

### Option 2: Using .env files

1. **Edit the root .env file**:
   ```bash
   nano .env
   ```

2. **Update the AWS credentials**:
   ```bash
   AWS_ACCESS_KEY_ID=your-actual-access-key-id
   AWS_SECRET_ACCESS_KEY=your-actual-secret-access-key
   S3_BUCKET_NAME=your-actual-bucket-name
   ```

3. **Also update docker-image/src/.env** for Docker containers:
   ```bash
   nano docker-image/src/.env
   ```

### Option 3: System-wide environment variables

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export AWS_ACCESS_KEY_ID="your-actual-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-actual-secret-access-key"
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="your-actual-bucket-name"
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

## Step 4: Test the Configuration

### 4.1 Verify Environment Variables
```bash
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $S3_BUCKET_NAME
```

### 4.2 Test AWS CLI (Optional)
If you have AWS CLI installed:
```bash
aws s3 ls s3://your-bucket-name
```

### 4.3 Test with Python Script
You can test the S3 connection using the project's S3 storage module:
```bash
cd docker-image/src
python -c "
from s3_storage import S3Storage
storage = S3Storage()
print('S3 connection successful!')
"
```

## Step 5: Enable S3 Storage

Once everything is configured and tested:

1. **Set USE_S3_STORAGE to true** in your environment:
   ```bash
   export USE_S3_STORAGE=true
   ```

2. **Update .env files**:
   ```bash
   USE_S3_STORAGE=true
   ```

3. **Restart your application** to pick up the new settings

## Step 6: Migrate Existing Files (Optional)

If you have existing files in the database, use the migration script:

```bash
cd docker-image/src
python migrate_files_to_s3.py --execute
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use IAM roles** in production instead of access keys when possible
3. **Rotate access keys** regularly
4. **Monitor S3 access** through CloudTrail
5. **Set up bucket policies** for additional security
6. **Enable MFA** for sensitive operations

## Troubleshooting

### Common Issues

1. **Access Denied Errors**:
   - Check IAM permissions
   - Verify bucket name is correct
   - Ensure bucket exists in the specified region

2. **Credentials Not Found**:
   - Verify environment variables are set
   - Check .env file syntax
   - Restart application after setting variables

3. **Region Mismatch**:
   - Ensure AWS_REGION matches your bucket's region
   - Default is `us-east-1`

### Debug Commands

```bash
# Check if variables are set
env | grep AWS

# Test S3 connection
python docker-image/src/s3_storage.py

# Check application logs
docker logs [container-name]
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | - | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | Yes | - | AWS secret access key |
| `AWS_REGION` | No | `us-east-1` | AWS region for S3 bucket |
| `S3_BUCKET_NAME` | Yes | - | Name of your S3 bucket |
| `USE_S3_STORAGE` | No | `false` | Enable/disable S3 storage |
| `CLOUDFRONT_DOMAIN` | No | - | CloudFront CDN domain (optional) |

## Next Steps

After setting up AWS credentials:

1. **Test file uploads** through the application
2. **Monitor S3 usage** in AWS Console
3. **Set up CloudFront** for better performance (optional)
4. **Configure backup policies** for your S3 bucket
5. **Set up monitoring and alerts** for S3 operations

For more details, see the [S3_IMPLEMENTATION_GUIDE.md](./S3_IMPLEMENTATION_GUIDE.md) file. 