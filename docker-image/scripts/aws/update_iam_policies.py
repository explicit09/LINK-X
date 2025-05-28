#!/usr/bin/env python3
"""
IAM Policy Updater for S3 Access

This script helps review and update IAM policies for S3 bucket access,
ensuring they follow the principle of least privilege.
"""
import os
import json
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

def get_aws_clients():
    """Initialize and return AWS clients with credentials from environment variables."""
    load_dotenv('src/.env')
    
    session = boto3.Session(
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )
    
    return {
        's3': session.client('s3'),
        'iam': session.client('iam')
    }

def get_current_policy(clients, bucket_name):
    """Retrieve the current bucket policy."""
    try:
        policy = clients['s3'].get_bucket_policy(Bucket=bucket_name)
        return json.loads(policy['Policy'])
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchBucketPolicy':
            return None
        raise

def review_bucket_policy(s3_client, bucket_name):
    """Review the current bucket policy."""
    try:
        policy = s3_client.get_bucket_policy(Bucket=bucket_name)
        current_policy = json.loads(policy['Policy'])
        
        print("\n📋 Current Bucket Policy:")
        print(json.dumps(current_policy, indent=2))
        
        # Check for overly permissive policies
        secure = True
        for statement in current_policy.get('Statement', []):
            if statement.get('Effect') == 'Allow':
                actions = statement.get('Action', [])
                if isinstance(actions, str):
                    actions = [actions]
                
                # Check for overly permissive actions
                if '*' in actions or 's3:*' in actions:
                    print("\n⚠️  Warning: Overly permissive action found in policy:")
                    print(f"    - Statement: {statement.get('Sid', 'No Sid')}")
                    print(f"    - Actions: {actions}")
                    secure = False
                
                # Check for overly permissive resources
                resources = statement.get('Resource', [])
                if isinstance(resources, str):
                    resources = [resources]
                
                if any('*' in res for res in resources):
                    print("\n⚠️  Warning: Overly permissive resource found in policy:")
                    print(f"    - Statement: {statement.get('Sid', 'No Sid')}")
                    print(f"    - Resources: {resources}")
                    secure = False
        
        if secure:
            print("\n✅ Bucket policy follows least privilege principles.")
        else:
            print("\n❌ Bucket policy has potential security issues that should be addressed.")
            
        return current_policy
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchBucketPolicy':
            print("ℹ️  No bucket policy found. A new one will be created.")
            return None
        print(f"❌ Error reviewing bucket policy: {e}")
        return None

def create_least_privilege_policy(bucket_name):
    """Create a least privilege policy for the S3 bucket.
    
    The policy includes the necessary permissions for the application to function
    while following the principle of least privilege.
    """
    # Get the current IAM user/role ARN for the principal
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        principal_arn = identity['Arn']
    except Exception as e:
        print(f"❌ Error getting caller identity: {e}")
        print("⚠️  Using wildcard principal. This is less secure. Consider updating with a specific IAM ARN.")
        principal_arn = "*"
    
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "ListBucketContents",
                "Effect": "Allow",
                "Principal": {
                    "AWS": principal_arn
                },
                "Action": [
                    "s3:ListBucket",
                    "s3:GetBucketLocation"
                ],
                "Resource": f"arn:aws:s3:::{bucket_name}"
            },
            {
                "Sid": "ObjectAccess",
                "Effect": "Allow",
                "Principal": {
                    "AWS": principal_arn
                },
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:GetObjectAcl",
                    "s3:PutObjectAcl"
                ],
                "Resource": f"arn:aws:s3:::{bucket_name}/*"
            }
        ]
    }
    
    return json.dumps(policy, indent=2)

def update_bucket_policy(clients, bucket_name, force=False):
    """Update the bucket policy with least privilege permissions."""
    try:
        new_policy = create_least_privilege_policy(bucket_name)
        
        print("\n🔄 Updating bucket policy with least privilege permissions...")
        print("\nNew Policy:")
        print(new_policy)
        
        if not force:
            try:
                confirm = input("\nDo you want to apply this policy? (yes/no): ")
                if confirm.lower() != 'yes':
                    print("Policy update cancelled by user.")
                    return
            except EOFError:
                print("\nRunning in non-interactive mode. Use --force to apply changes without confirmation.")
                return
            
        clients['s3'].put_bucket_policy(
            Bucket=bucket_name,
            Policy=new_policy
        )
        print("✅ Bucket policy updated successfully!")
        
    except ClientError as e:
        print(f"❌ Error updating bucket policy: {e}")

def parse_arguments():
    """Parse command line arguments."""
    import argparse
    parser = argparse.ArgumentParser(description='Update S3 bucket policy with least privilege')
    parser.add_argument('--force', action='store_true', help='Apply changes without confirmation')
    return parser.parse_args()

def main():
    """Main function to execute the bucket policy review and update."""
    try:
        args = parse_arguments()
        # Initialize AWS clients
        clients = get_aws_clients()
        bucket_name = os.getenv('S3_BUCKET_NAME')
        
        if not bucket_name:
            print("❌ Error: S3_BUCKET_NAME not found in environment variables")
            return
        
        print(f"🔍 Reviewing policies for S3 bucket: {bucket_name}")
        
        # Review current bucket policy
        current_policy = review_bucket_policy(clients['s3'], bucket_name)
        
        # Update bucket policy if needed
        if current_policy is None or args.force or input("\nDo you want to update the bucket policy with least privilege permissions? (yes/no): ").lower() == 'yes':
            if args.force:
                print("\nRunning in non-interactive mode. Updating bucket policy...")
            update_bucket_policy(clients, bucket_name, force=args.force)
        else:
            print("\nNo changes made to bucket policy.")
        
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    main()
