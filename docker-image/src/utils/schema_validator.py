"""
Schema validation utilities to prevent outbox drift.
Ensures database functions stay in sync with table schemas.
"""
import hashlib
import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from sqlalchemy import inspect, MetaData, Table
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class ColumnInfo:
    """Column information for schema validation"""
    name: str
    type_name: str
    nullable: bool
    default: Optional[str] = None
    
    def to_hash_dict(self) -> Dict:
        """Convert to dictionary for hashing"""
        return {
            'name': self.name,
            'type': self.type_name,
            'nullable': self.nullable,
            'default': str(self.default) if self.default else None
        }


@dataclass 
class TableSchema:
    """Table schema information"""
    table_name: str
    columns: List[ColumnInfo]
    primary_key: List[str]
    foreign_keys: List[Dict]
    
    def calculate_hash(self) -> str:
        """Calculate schema hash for comparison"""
        schema_dict = {
            'table': self.table_name,
            'columns': [col.to_hash_dict() for col in self.columns],
            'primary_key': sorted(self.primary_key),
            'foreign_keys': sorted(self.foreign_keys, key=lambda x: x.get('name', ''))
        }
        
        schema_json = json.dumps(schema_dict, sort_keys=True)
        return hashlib.sha256(schema_json.encode()).hexdigest()[:16]


class SchemaValidator:
    """
    Validates that database functions match table schemas.
    Prevents outbox drift where schema changes break function payloads.
    """
    
    def __init__(self, session: Session):
        self.session = session
        self.inspector = inspect(session.bind)
    
    def get_table_schema(self, table_name: str) -> Optional[TableSchema]:
        """Get complete schema information for a table"""
        try:
            # Get column information
            columns = []
            for col_info in self.inspector.get_columns(table_name):
                columns.append(ColumnInfo(
                    name=col_info['name'],
                    type_name=str(col_info['type']),
                    nullable=col_info['nullable'],
                    default=str(col_info['default']) if col_info['default'] else None
                ))
            
            # Get primary key
            pk_constraint = self.inspector.get_pk_constraint(table_name)
            primary_key = pk_constraint['constrained_columns'] if pk_constraint else []
            
            # Get foreign keys
            foreign_keys = []
            for fk in self.inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    'name': fk.get('name', ''),
                    'constrained_columns': fk['constrained_columns'],
                    'referred_table': fk['referred_table'],
                    'referred_columns': fk['referred_columns']
                })
            
            return TableSchema(
                table_name=table_name,
                columns=columns,
                primary_key=primary_key,
                foreign_keys=foreign_keys
            )
            
        except Exception as e:
            logger.error(f"Failed to get schema for table {table_name}: {e}")
            return None
    
    def get_function_payload_schema(self, function_name: str) -> Optional[Dict]:
        """Extract expected payload schema from function definition"""
        try:
            result = self.session.execute(
                """
                SELECT pg_get_functiondef(oid) as function_def
                FROM pg_proc 
                WHERE proname = :function_name
                """,
                {'function_name': function_name}
            ).fetchone()
            
            if not result:
                logger.warning(f"Function {function_name} not found")
                return None
            
            function_def = result[0]
            
            # Parse function definition to extract parameter expectations
            # This is a simplified parser - could be enhanced with AST parsing
            payload_fields = self._parse_function_parameters(function_def)
            
            return {
                'function_name': function_name,
                'expected_fields': payload_fields,
                'function_definition_hash': hashlib.sha256(function_def.encode()).hexdigest()[:16]
            }
            
        except Exception as e:
            logger.error(f"Failed to get function schema for {function_name}: {e}")
            return None
    
    def _parse_function_parameters(self, function_def: str) -> List[Dict]:
        """Parse function definition to extract parameter information"""
        # Simplified parser - extracts parameter names and types
        import re
        
        # Find parameter declarations
        param_pattern = r'p_(\w+)\s+(\w+(?:\[\])?(?:\([^)]+\))?)'
        matches = re.findall(param_pattern, function_def, re.IGNORECASE)
        
        parameters = []
        for param_name, param_type in matches:
            parameters.append({
                'name': param_name,
                'type': param_type.lower(),
                'required': 'DEFAULT' not in function_def.split(f'p_{param_name}')[1].split(',')[0]
            })
        
        return parameters
    
    def validate_outbox_function_compatibility(
        self, 
        table_name: str, 
        function_name: str
    ) -> Dict:
        """
        Validate that outbox function is compatible with table schema.
        
        Returns validation result with recommendations.
        """
        table_schema = self.get_table_schema(table_name)
        function_schema = self.get_function_payload_schema(function_name)
        
        if not table_schema:
            return {
                'valid': False,
                'error': f"Could not retrieve schema for table {table_name}"
            }
        
        if not function_schema:
            return {
                'valid': False,
                'error': f"Could not retrieve schema for function {function_name}"
            }
        
        # Check if function parameters match table columns
        table_columns = {col.name: col for col in table_schema.columns}
        function_params = {param['name']: param for param in function_schema['expected_fields']}
        
        issues = []
        warnings = []
        
        # Check for missing parameters (table columns not in function)
        for col_name, col_info in table_columns.items():
            if col_name not in function_params and not col_info.nullable and col_info.default is None:
                issues.append(f"Required column '{col_name}' missing from function parameters")
        
        # Check for extra parameters (function params not in table)
        for param_name in function_params:
            if param_name not in table_columns:
                warnings.append(f"Function parameter '{param_name}' not found in table schema")
        
        # Check for type mismatches
        for param_name, param_info in function_params.items():
            if param_name in table_columns:
                table_col = table_columns[param_name]
                if not self._types_compatible(param_info['type'], table_col.type_name):
                    issues.append(
                        f"Type mismatch for '{param_name}': "
                        f"function expects {param_info['type']}, table has {table_col.type_name}"
                    )
        
        return {
            'valid': len(issues) == 0,
            'table_schema_hash': table_schema.calculate_hash(),
            'function_schema_hash': function_schema['function_definition_hash'],
            'issues': issues,
            'warnings': warnings,
            'recommendations': self._generate_recommendations(issues, warnings)
        }
    
    def _types_compatible(self, function_type: str, table_type: str) -> bool:
        """Check if function parameter type is compatible with table column type"""
        # Normalize types for comparison
        function_type = function_type.lower().strip()
        table_type = str(table_type).lower().strip()
        
        # Define compatible type mappings
        compatible_types = {
            'uuid': ['uuid'],
            'text': ['text', 'varchar', 'character varying'],
            'int': ['integer', 'int4', 'int'],
            'bigint': ['bigint', 'int8'],
            'jsonb': ['jsonb'],
            'timestamptz': ['timestamp with time zone', 'timestamptz'],
            'boolean': ['boolean', 'bool'],
            'numeric': ['numeric', 'decimal'],
            'vector': ['vector']
        }
        
        for base_type, variants in compatible_types.items():
            if any(variant in function_type for variant in variants) and \
               any(variant in table_type for variant in variants):
                return True
        
        # Direct match
        return function_type in table_type or table_type in function_type
    
    def _generate_recommendations(self, issues: List[str], warnings: List[str]) -> List[str]:
        """Generate recommendations based on validation issues"""
        recommendations = []
        
        if issues:
            recommendations.append("CRITICAL: Update function signature to match table schema")
            recommendations.append("Run schema migration tests before deploying")
        
        if warnings:
            recommendations.append("Review function parameters for unused fields")
        
        if not issues and not warnings:
            recommendations.append("Schema validation passed - function and table are compatible")
        
        return recommendations
    
    def validate_all_outbox_functions(self) -> Dict:
        """Validate all known outbox functions against their tables"""
        validations = {}
        
        # Define known outbox functions and their target tables
        outbox_functions = {
            'create_chunk_with_embedding_job': 'file_chunks',
            'create_chunk_with_poison_detection': 'file_chunks',
            'send_to_dlq': 'embedding_dead_letter_queue'
        }
        
        for function_name, table_name in outbox_functions.items():
            try:
                validation_result = self.validate_outbox_function_compatibility(
                    table_name, function_name
                )
                validations[function_name] = validation_result
            except Exception as e:
                validations[function_name] = {
                    'valid': False,
                    'error': str(e)
                }
        
        # Overall status
        all_valid = all(v.get('valid', False) for v in validations.values())
        
        return {
            'overall_valid': all_valid,
            'validations': validations,
            'timestamp': self.session.execute("SELECT NOW()").fetchone()[0].isoformat()
        }
    
    def generate_schema_hash_migration(self, table_name: str) -> str:
        """Generate migration to store schema hash for monitoring"""
        table_schema = self.get_table_schema(table_name)
        if not table_schema:
            return ""
        
        schema_hash = table_schema.calculate_hash()
        
        migration_sql = f"""
-- Store schema hash for {table_name}
INSERT INTO schema_validation_hashes (
    table_name, 
    schema_hash, 
    schema_definition,
    created_at
) VALUES (
    '{table_name}',
    '{schema_hash}',
    {json.dumps(table_schema.columns[0].to_hash_dict() if table_schema.columns else {})},
    NOW()
) ON CONFLICT (table_name) DO UPDATE SET
    schema_hash = EXCLUDED.schema_hash,
    schema_definition = EXCLUDED.schema_definition,
    updated_at = NOW();
"""
        return migration_sql


def create_schema_validation_infrastructure() -> str:
    """Create tables and functions for schema validation monitoring"""
    return """
-- Schema validation infrastructure

-- Table to store schema hashes for monitoring
CREATE TABLE IF NOT EXISTS schema_validation_hashes (
    table_name TEXT PRIMARY KEY,
    schema_hash TEXT NOT NULL,
    schema_definition JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store validation results
CREATE TABLE IF NOT EXISTS schema_validation_results (
    id BIGSERIAL PRIMARY KEY,
    function_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL,
    issues JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to check schema drift
CREATE OR REPLACE FUNCTION check_schema_drift() RETURNS TABLE (
    table_name TEXT,
    stored_hash TEXT,
    current_hash TEXT,
    has_drifted BOOLEAN,
    last_checked TIMESTAMPTZ
) AS $$
BEGIN
    -- This would need to be implemented with actual schema inspection
    -- For now, return placeholder
    RETURN QUERY
    SELECT 
        svh.table_name,
        svh.schema_hash,
        'current_hash_placeholder'::TEXT,
        FALSE as has_drifted,
        svh.updated_at
    FROM schema_validation_hashes svh;
END;
$$ LANGUAGE plpgsql;

-- Add schema validation to system health monitoring
CREATE OR REPLACE FUNCTION check_schema_validation_alerts() RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check for validation failures
    RETURN QUERY
    SELECT 
        'SCHEMA_VALIDATION_FAILURE'::TEXT,
        'CRITICAL'::TEXT,
        format('Schema validation failed for function %s', function_name),
        jsonb_build_object(
            'function_name', function_name,
            'table_name', table_name,
            'issues', issues
        )
    FROM schema_validation_results
    WHERE NOT is_valid
    AND validated_at > NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
"""