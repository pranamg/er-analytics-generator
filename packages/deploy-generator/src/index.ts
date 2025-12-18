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

export async function saveDeploymentScripts(
  schema: Schema,
  config: DeploymentConfig,
  outputDir: string
): Promise<void> {
  const scripts = generateDeploymentScripts(schema, config);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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
}
