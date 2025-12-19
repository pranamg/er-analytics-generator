import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Schema } from '@er-analytics/core';

export interface DeploymentConfig {
  dbType: 'postgresql' | 'mysql' | 'sqlite';
  dbName: string;
  dbUser?: string;
  dbPassword?: string;
  dbHost?: string;
  dbPort?: number;
}

export interface DeploymentScripts {
  deploy: string;
  setupDatabase: string;
  importData: string;
  createIndexes: string;
  setupUsers: string;
  healthCheck: string;
  rollback: string;
}

export function generateDeploymentScripts(
  schema: Schema,
  config: DeploymentConfig
): DeploymentScripts {
  const tables = schema.tables.map(t => t.name.toLowerCase());
  
  return {
    deploy: generateMainDeployScript(config, tables),
    setupDatabase: generateSetupDatabaseScript(config),
    importData: generateImportDataScript(config, tables),
    createIndexes: generateIndexScript(schema, config),
    setupUsers: generateUserSetupScript(config),
    healthCheck: generateHealthCheckScript(config),
    rollback: generateRollbackScript(config),
  };
}

function generateMainDeployScript(config: DeploymentConfig, tables: string[]): string {
  return `#!/bin/bash
# Deployment Script
# Generated: ${new Date().toISOString()}
# Database: ${config.dbType}

set -e

echo "Starting deployment process..."

# Step 1: Database Setup
echo "Step 1: Setting up database..."
./setup_database.sh

# Step 2: Import Schema
echo "Step 2: Importing schema..."
psql -U ${config.dbUser || 'postgres'} -d ${config.dbName} -f schema.sql

# Step 3: Load Data
echo "Step 3: Loading data..."
./import_data.sh

# Step 4: Create Indexes
echo "Step 4: Creating indexes..."
./create_indexes.sh

# Step 5: Setup Users
echo "Step 5: Setting up users..."
./setup_users.sh

# Step 6: Health Check
echo "Step 6: Running health check..."
./health_check.sh

echo "Deployment complete!"
echo "Tables deployed: ${tables.length}"
`;
}

function generateSetupDatabaseScript(config: DeploymentConfig): string {
  if (config.dbType === 'postgresql') {
    return `#!/bin/bash
# Setup PostgreSQL Database

psql -U postgres <<EOF
DROP DATABASE IF EXISTS ${config.dbName};
CREATE DATABASE ${config.dbName};
\\c ${config.dbName}
EOF

echo "Database ${config.dbName} created."
`;
  }
  
  return `#!/bin/bash
# Setup ${config.dbType} Database
echo "Database setup for ${config.dbType}"
`;
}

function generateImportDataScript(config: DeploymentConfig, tables: string[]): string {
  return `#!/bin/bash
# Import CSV Data

cd data

for file in *.csv; do
    table_name=\${file%.csv}
    echo "Importing \$file into \$table_name..."
    psql -U ${config.dbUser || 'postgres'} -d ${config.dbName} \\
        -c "\\copy \$table_name FROM '\$file' CSV HEADER;"
done

echo "Data import complete."
`;
}

function generateIndexScript(schema: Schema, config: DeploymentConfig): string {
  const indexes: string[] = [];
  
  for (const table of schema.tables) {
    for (const column of table.columns) {
      if (column.foreignKey || column.name.toLowerCase().includes('date')) {
        indexes.push(
          `CREATE INDEX IF NOT EXISTS idx_${table.name.toLowerCase()}_${column.name} ON ${table.name}(${column.name});`
        );
      }
    }
  }

  return `#!/bin/bash
# Create Performance Indexes

psql -U ${config.dbUser || 'postgres'} -d ${config.dbName} <<EOF
${indexes.join('\n')}
ANALYZE;
EOF

echo "Indexes created."
`;
}

function generateUserSetupScript(config: DeploymentConfig): string {
  return `#!/bin/bash
# Setup Database Users

psql -U postgres -d ${config.dbName} <<EOF
CREATE USER IF NOT EXISTS analytics_user WITH PASSWORD 'secure_password_here';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO analytics_user;
EOF

echo "User permissions configured."
`;
}

function generateHealthCheckScript(config: DeploymentConfig): string {
  return `#!/bin/bash
# Health Check Script

echo "Running health checks..."

psql -U ${config.dbUser || 'postgres'} -d ${config.dbName} <<EOF
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

echo "Health check complete."
`;
}

function generateRollbackScript(config: DeploymentConfig): string {
  return `#!/bin/bash
# Rollback Script

echo "WARNING: This will drop the database ${config.dbName}"
read -p "Are you sure? (y/N) " confirm

if [ "\$confirm" = "y" ]; then
    psql -U postgres -c "DROP DATABASE IF EXISTS ${config.dbName};"
    echo "Database dropped."
else
    echo "Rollback cancelled."
fi
`;
}

function generateEnvExample(config: DeploymentConfig): string {
  return `# Environment Configuration
# Copy this file to .env and update with your values

# Database Configuration
DB_TYPE=${config.dbType}
DB_NAME=${config.dbName}
DB_USER=${config.dbUser || 'postgres'}
DB_PASSWORD=your_secure_password_here
DB_HOST=${config.dbHost || 'localhost'}
DB_PORT=${config.dbPort || 5432}

# Application Configuration
APP_ENV=development
LOG_LEVEL=info

# Analytics Configuration
ANALYTICS_REFRESH_INTERVAL=3600
DASHBOARD_CACHE_TTL=300
`;
}

function generateConfigYaml(config: DeploymentConfig, schema: Schema): string {
  return `# Deployment Configuration
# Generated: ${new Date().toISOString()}

database:
  type: ${config.dbType}
  name: ${config.dbName}
  host: \${DB_HOST:-localhost}
  port: \${DB_PORT:-5432}
  user: \${DB_USER:-postgres}
  password: \${DB_PASSWORD}
  
tables:
  count: ${schema.tables.length}
  names:
${schema.tables.map(t => `    - ${t.name}`).join('\n')}

deployment:
  environment: \${APP_ENV:-development}
  data_path: ./data
  log_path: ./logs
  
analytics:
  enabled: true
  refresh_interval: \${ANALYTICS_REFRESH_INTERVAL:-3600}
  
dashboard:
  enabled: true
  cache_ttl: \${DASHBOARD_CACHE_TTL:-300}
`;
}

function generateDeploymentMd(config: DeploymentConfig, schema: Schema): string {
  return `# Deployment Guide

## Prerequisites

- ${config.dbType === 'postgresql' ? 'PostgreSQL 12+' : config.dbType === 'mysql' ? 'MySQL 8+' : 'SQLite 3'}
- Bash shell (Linux/macOS) or WSL (Windows)
- Access to database credentials

## Quick Start

1. **Copy environment configuration:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database credentials
   \`\`\`

2. **Run the deployment script:**
   \`\`\`bash
   chmod +x deploy.sh
   ./deploy.sh
   \`\`\`

## Step-by-Step Deployment

### 1. Database Setup
\`\`\`bash
./setup_database.sh
\`\`\`

### 2. Import Schema
\`\`\`bash
psql -U postgres -d ${config.dbName} -f schema.sql
\`\`\`

### 3. Import Data
\`\`\`bash
./import_data.sh
\`\`\`

### 4. Create Indexes
\`\`\`bash
./create_indexes.sh
\`\`\`

### 5. Setup Users
\`\`\`bash
./setup_users.sh
\`\`\`

### 6. Verify Deployment
\`\`\`bash
./health_check.sh
\`\`\`

## Schema Information

- **Tables:** ${schema.tables.length}
- **Database:** ${config.dbName}

## Rollback

If you need to revert the deployment:
\`\`\`bash
./rollback.sh
\`\`\`

**Warning:** This will drop the entire database!
`;
}

function generateTroubleshootingMd(): string {
  return `# Troubleshooting Guide

## Common Issues

### Connection Refused
**Symptom:** \`psql: could not connect to server: Connection refused\`

**Solutions:**
1. Verify PostgreSQL is running: \`sudo systemctl status postgresql\`
2. Check host and port in .env file
3. Ensure firewall allows database connections

### Permission Denied
**Symptom:** \`ERROR: permission denied for database\`

**Solutions:**
1. Verify database user has correct permissions
2. Run: \`GRANT ALL PRIVILEGES ON DATABASE dbname TO username;\`

### Import Failures
**Symptom:** \`ERROR: relation "tablename" does not exist\`

**Solutions:**
1. Run schema.sql before importing data
2. Check CSV files match table names exactly
3. Verify dependency order of tables

### Data Type Mismatch
**Symptom:** \`ERROR: invalid input syntax for type\`

**Solutions:**
1. Check CSV file encoding (should be UTF-8)
2. Verify date formats match database expectations
3. Check for empty values in NOT NULL columns

## Getting Help

1. Check the health_check.sh output for diagnostics
2. Review PostgreSQL logs: \`sudo tail -f /var/log/postgresql/postgresql-*-main.log\`
3. Verify .env configuration matches your environment
`;
}

function generateMaintenanceMd(config: DeploymentConfig): string {
  return `# Maintenance Guide

## Regular Tasks

### Daily
- Monitor database connections
- Check disk space for data directory
- Review error logs

### Weekly
- Run VACUUM ANALYZE on large tables
- Review query performance
- Backup database

### Monthly
- Update statistics: \`ANALYZE;\`
- Review index usage
- Archive old data if needed

## Backup Procedures

### Full Backup
\`\`\`bash
pg_dump -U ${config.dbUser || 'postgres'} ${config.dbName} > backup_$(date +%Y%m%d).sql
\`\`\`

### Restore from Backup
\`\`\`bash
psql -U ${config.dbUser || 'postgres'} ${config.dbName} < backup_YYYYMMDD.sql
\`\`\`

## Performance Tuning

### Recommended PostgreSQL Settings
\`\`\`sql
-- For analytics workloads
shared_buffers = 256MB
work_mem = 64MB
maintenance_work_mem = 128MB
effective_cache_size = 1GB
\`\`\`

### Index Maintenance
\`\`\`sql
REINDEX DATABASE ${config.dbName};
\`\`\`

## Monitoring Queries

### Table Sizes
\`\`\`sql
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public';
\`\`\`

### Active Connections
\`\`\`sql
SELECT count(*) FROM pg_stat_activity WHERE datname = '${config.dbName}';
\`\`\`
`;
}

export async function saveDeploymentScripts(
  schema: Schema,
  config: DeploymentConfig,
  outputDir: string
): Promise<void> {
  const scripts = generateDeploymentScripts(schema, config);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Shell scripts (executable)
  const scriptFiles: [string, string][] = [
    ['deploy.sh', scripts.deploy],
    ['setup_database.sh', scripts.setupDatabase],
    ['import_data.sh', scripts.importData],
    ['create_indexes.sh', scripts.createIndexes],
    ['setup_users.sh', scripts.setupUsers],
    ['health_check.sh', scripts.healthCheck],
    ['rollback.sh', scripts.rollback],
  ];

  for (const [filename, content] of scriptFiles) {
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, content);
    fs.chmodSync(filepath, '755');
  }

  // Configuration files (non-executable)
  const configFiles: [string, string][] = [
    ['.env.example', generateEnvExample(config)],
    ['config.yaml', generateConfigYaml(config, schema)],
    ['DEPLOYMENT.md', generateDeploymentMd(config, schema)],
    ['TROUBLESHOOTING.md', generateTroubleshootingMd()],
    ['MAINTENANCE.md', generateMaintenanceMd(config)],
  ];

  for (const [filename, content] of configFiles) {
    fs.writeFileSync(path.join(outputDir, filename), content);
  }
}
