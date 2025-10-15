# AWS Setup Scripts

This directory contains automated setup scripts and configuration for deploying DigiTwin Platform to AWS ECS.

## Files

- **setup-aws-resources.sh**: Automated script to create all necessary AWS resources
- **aws-config.env**: Generated configuration file (created after running setup script)

## Quick Usage

```bash
# Make script executable
chmod +x setup-aws-resources.sh

# Run the setup
./setup-aws-resources.sh

# Check the generated configuration
cat aws-config.env
```

## What Gets Created

The setup script automatically creates:

1. **ECR Repositories** (2x)
   - digitwin-backend
   - digitwin-frontend

2. **ECS Cluster**
   - digitwin-cluster (Fargate)

3. **CloudWatch Log Groups** (2x)
   - /ecs/digitwin-backend
   - /ecs/digitwin-frontend

4. **IAM Roles** (2x)
   - ecsTaskExecutionRole (for ECS to pull images and write logs)
   - ecsTaskRole (for tasks to access AWS services)

5. **Security Groups** (2x)
   - digitwin-backend-sg (Port 3000)
   - digitwin-frontend-sg (Port 80)

6. **Configuration File**
   - aws-config.env (contains all resource IDs and ARNs)

## Prerequisites

- AWS CLI installed and configured
- Appropriate IAM permissions
- Bash shell environment

## Output

After successful execution, you'll find:

```
aws-config.env  - Contains all resource identifiers
```

Example content:
```bash
AWS_ACCOUNT_ID=123456789012
AWS_REGION=ap-southeast-1
CLUSTER_NAME=digitwin-cluster
VPC_ID=vpc-xxxxx
SUBNET_IDS=subnet-xxxxx subnet-yyyyy
BACKEND_SG_ID=sg-xxxxx
FRONTEND_SG_ID=sg-yyyyy
BACKEND_ECR_REPO=123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-backend
FRONTEND_ECR_REPO=123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/digitwin-frontend
```

## Next Steps

After running this script:

1. Create secrets in AWS Secrets Manager
2. Update task definition files with your AWS Account ID
3. Create Application Load Balancer
4. Create ECS services
5. Configure GitHub Actions secrets

See the main [AWS-DEPLOYMENT-GUIDE.md](../AWS-DEPLOYMENT-GUIDE.md) for detailed instructions.

## Cleanup

To remove all created resources:

```bash
# Delete ECS services first
aws ecs delete-service --cluster digitwin-cluster --service digitwin-backend-service --force
aws ecs delete-service --cluster digitwin-cluster --service digitwin-frontend-service --force

# Wait for services to be deleted, then delete cluster
aws ecs delete-cluster --cluster digitwin-cluster

# Delete ECR repositories
aws ecr delete-repository --repository-name digitwin-backend --force
aws ecr delete-repository --repository-name digitwin-frontend --force

# Delete log groups
aws logs delete-log-group --log-group-name /ecs/digitwin-backend
aws logs delete-log-group --log-group-name /ecs/digitwin-frontend

# Delete security groups (note: delete in order due to dependencies)
aws ec2 delete-security-group --group-id <BACKEND_SG_ID>
aws ec2 delete-security-group --group-id <FRONTEND_SG_ID>
```

## Troubleshooting

### Script fails with "Access Denied"
**Solution**: Ensure your AWS credentials have the necessary permissions

### "Repository already exists" error
**Solution**: The script checks for existing resources. If you see this, the resource is already created and will be reused.

### Can't find default VPC
**Solution**: Create a VPC first or modify the script to use a specific VPC ID

## Support

For issues or questions:
- Check the main deployment guide: [AWS-DEPLOYMENT-GUIDE.md](../AWS-DEPLOYMENT-GUIDE.md)
- Review AWS CloudWatch logs
- Consult AWS ECS documentation
