# RDKit Setup and Troubleshooting Guide

This guide provides instructions for setting up and running the Chemotion ELN repository with RDKit support, along with common troubleshooting steps.

## Prerequisites

- Docker and Docker Compose installed
- Git

## Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd chemotion_ELN
   ```

2. **Configure Environment Files**
   - Copy the example environment files:
     ```bash
     cp .env.example .env
     cp .env.development.example .env.development
     ```
   - Ensure `.env.development` contains:
     ```
     PG_CARTRIDGE=rdkit
     PG_CARTRIDGE_VERSION=4.4.0
     ```

3. **Configure Docker Compose**
   - In `.devcontainer/docker-compose.dev.yml`, ensure `.env.development` is loaded:
     ```yaml
     env_file:
       - ./.env
       - ./.env.development  # Make sure this line is not commented out
     ```

4. **Start the Development Environment**
   ```bash
   docker-compose -f .devcontainer/docker-compose.dev.yml up postgres app webpacker
   ```

## Common Issues and Solutions

### 1. PostgreSQL Version Incompatibility

**Issue**: Database files are incompatible with server version
```
FATAL: database files are incompatible with server
DETAIL: The data directory was initialized by PostgreSQL version 14, which is not compatible with this version 16.8
```

**Solution**:
- Option 1: Downgrade PostgreSQL to version 14
  ```yaml
  # In docker-compose.dev.yml
  postgres:
    image: postgres:14
  ```
- Option 2: Remove existing database volume and reinitialize
  ```bash
  docker-compose down -v
  docker-compose -f .devcontainer/docker-compose.dev.yml up
  ```

### 2. RDKit Extension Not Found

**Issue**: RDKit extension is not available or not installed
```
WARN - PG structure search rdkit-4.4.0: WARN PG cartridge extension not available - feature disabled
```

**Solution**:
1. Check if PostgreSQL container is running with RDKit support:
   ```bash
   docker ps | grep postgres
   ```
2. Connect to PostgreSQL and check available extensions:
   ```bash
   docker exec -it <postgres-container-id> psql -U postgres
   \dx
   ```
3. If RDKit is not listed, manually install it:
   ```sql
   CREATE EXTENSION rdkit;
   ```

### 3. Database Migration Issues

**Issue**: Migrations not running or failing

**Solution**:
1. Check environment variables are loaded:
   ```bash
   docker exec -it <app-container-id> env | grep PG_CARTRIDGE
   ```
2. Verify database connection:
   ```bash
   docker exec -it <app-container-id> bundle exec rails db:migrate:status
   ```
3. If needed, reset the database:
   ```bash
   docker exec -it <app-container-id> bundle exec rails db:drop db:create db:migrate
   ```

### 4. Container Health Issues

**Issue**: Containers failing health checks or not starting properly

**Solution**:
1. Check container logs:
   ```bash
   docker logs <container-id>
   ```
2. Check container status:
   ```bash
   docker ps -a
   ```
3. Restart containers:
   ```bash
   docker-compose -f .devcontainer/docker-compose.dev.yml down
   docker-compose -f .devcontainer/docker-compose.dev.yml up
   ```

## Useful Debugging Commands

1. **Check PostgreSQL Status**
   ```bash
   docker exec -it <postgres-container-id> pg_isready
   ```

2. **View PostgreSQL Logs**
   ```bash
   docker logs -f <postgres-container-id>
   ```

3. **Check RDKit Extension Status**
   ```bash
   docker exec -it <postgres-container-id> psql -U postgres -c "\dx rdkit"
   ```

4. **Check Rails Configuration**
   ```bash
   docker exec -it <app-container-id> bundle exec rails c
   Rails.configuration.pg_cartridge
   ```

5. **Check Database Tables**
   ```bash
   docker exec -it <postgres-container-id> psql -U postgres -c "\dt rdkit.*"
   ```

## Best Practices

1. Always ensure `.env.development` is properly loaded in docker-compose configuration
2. Keep PostgreSQL version consistent across environments
3. Regularly check container logs for potential issues
4. Use the provided debugging commands to verify RDKit setup
5. Backup important data before making significant changes

## Additional Resources

- [RDKit Documentation](https://www.rdkit.org/docs/index.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/) 