#!/bin/bash

# AWS ECS Setup Script for DigiTwin Platform
# This script creates all necessary AWS resources for ECS deployment

set -e

# Configuration
AWS_REGION="ap-southeast-1"
PROJECT_NAME="digitwin"
CLUSTER_NAME="digitwin-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DigiTwin Platform AWS Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${YELLOW}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"

# 1. Create ECR Repositories
echo -e "\n${GREEN}[1/8] Creating ECR repositories...${NC}"
for repo in digitwin-backend digitwin-frontend; do
  if aws ecr describe-repositories --repository-names $repo --region $AWS_REGION 2>/dev/null; then
    echo "ECR repository $repo already exists"
  else
    aws ecr create-repository \
      --repository-name $repo \
      --region $AWS_REGION \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256
    echo "Created ECR repository: $repo"
  fi
done

# 2. Create ECS Cluster
echo -e "\n${GREEN}[2/8] Creating ECS cluster...${NC}"
if aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "ECS cluster $CLUSTER_NAME already exists"
else
  aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $AWS_REGION \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
  echo "Created ECS cluster: $CLUSTER_NAME"
fi

# 3. Create CloudWatch Log Groups
echo -e "\n${GREEN}[3/8] Creating CloudWatch log groups...${NC}"
for log_group in /ecs/digitwin-backend /ecs/digitwin-frontend; do
  if aws logs describe-log-groups --log-group-name-prefix $log_group --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$log_group"; then
    echo "Log group $log_group already exists"
  else
    aws logs create-log-group \
      --log-group-name $log_group \
      --region $AWS_REGION
    aws logs put-retention-policy \
      --log-group-name $log_group \
      --retention-in-days 30 \
      --region $AWS_REGION
    echo "Created log group: $log_group"
  fi
done

# 4. Create IAM Execution Role
echo -e "\n${GREEN}[4/8] Creating IAM execution role...${NC}"
EXECUTION_ROLE_NAME="ecsTaskExecutionRole"
if aws iam get-role --role-name $EXECUTION_ROLE_NAME 2>/dev/null; then
  echo "IAM role $EXECUTION_ROLE_NAME already exists"
else
  cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  aws iam create-role \
    --role-name $EXECUTION_ROLE_NAME \
    --assume-role-policy-document file://trust-policy.json

  aws iam attach-role-policy \
    --role-name $EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

  aws iam attach-role-policy \
    --role-name $EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

  rm trust-policy.json
  echo "Created IAM execution role: $EXECUTION_ROLE_NAME"
fi

# 5. Create IAM Task Role
echo -e "\n${GREEN}[5/8] Creating IAM task role...${NC}"
TASK_ROLE_NAME="ecsTaskRole"
if aws iam get-role --role-name $TASK_ROLE_NAME 2>/dev/null; then
  echo "IAM role $TASK_ROLE_NAME already exists"
else
  cat > task-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  aws iam create-role \
    --role-name $TASK_ROLE_NAME \
    --assume-role-policy-document file://task-trust-policy.json

  rm task-trust-policy.json
  echo "Created IAM task role: $TASK_ROLE_NAME"
fi

# 6. Get default VPC and subnets
echo -e "\n${GREEN}[6/8] Getting VPC and subnet information...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION)
echo "VPC ID: $VPC_ID"
echo "Subnet IDs: $SUBNET_IDS"

# 7. Create Security Groups
echo -e "\n${GREEN}[7/8] Creating security groups...${NC}"

# Backend security group
BACKEND_SG_NAME="digitwin-backend-sg"
BACKEND_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$BACKEND_SG_NAME" "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)

if [ "$BACKEND_SG_ID" != "None" ] && [ ! -z "$BACKEND_SG_ID" ]; then
  echo "Backend security group already exists: $BACKEND_SG_ID"
else
  BACKEND_SG_ID=$(aws ec2 create-security-group \
    --group-name $BACKEND_SG_NAME \
    --description "Security group for DigiTwin backend" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)

  aws ec2 authorize-security-group-ingress \
    --group-id $BACKEND_SG_ID \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

  echo "Created backend security group: $BACKEND_SG_ID"
fi

# Frontend security group
FRONTEND_SG_NAME="digitwin-frontend-sg"
FRONTEND_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$FRONTEND_SG_NAME" "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)

if [ "$FRONTEND_SG_ID" != "None" ] && [ ! -z "$FRONTEND_SG_ID" ]; then
  echo "Frontend security group already exists: $FRONTEND_SG_ID"
else
  FRONTEND_SG_ID=$(aws ec2 create-security-group \
    --group-name $FRONTEND_SG_NAME \
    --description "Security group for DigiTwin frontend" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)

  aws ec2 authorize-security-group-ingress \
    --group-id $FRONTEND_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

  echo "Created frontend security group: $FRONTEND_SG_ID"
fi

# 8. Save configuration
echo -e "\n${GREEN}[8/8] Saving configuration...${NC}"
cat > aws-config.env <<EOF
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
AWS_REGION=$AWS_REGION
CLUSTER_NAME=$CLUSTER_NAME
VPC_ID=$VPC_ID
SUBNET_IDS=$SUBNET_IDS
BACKEND_SG_ID=$BACKEND_SG_ID
FRONTEND_SG_ID=$FRONTEND_SG_ID
BACKEND_ECR_REPO=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/digitwin-backend
FRONTEND_ECR_REPO=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/digitwin-frontend
EOF

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nConfiguration saved to: ${YELLOW}aws-config.env${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Update task definition files with your AWS Account ID"
echo -e "2. Create secrets in AWS Secrets Manager for sensitive data"
echo -e "3. Set up GitHub Actions secrets"
echo -e "4. Create ECS services using the AWS Console or CLI"
echo -e "\nFor detailed instructions, see: ${YELLOW}../AWS-DEPLOYMENT-GUIDE.md${NC}"
