"""Add authentication and security fields

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to users table
    op.add_column('users', sa.Column('auth_provider', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('login_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_failed_login', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(255), nullable=True))
    
    # Add session tracking table
    op.create_table('user_sessions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes
    op.create_index('idx_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('idx_user_sessions_token_hash', 'user_sessions', ['token_hash'])
    op.create_index('idx_user_sessions_expires_at', 'user_sessions', ['expires_at'])
    
    # Add audit log table
    op.create_table('audit_logs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.String(36), nullable=True),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for audit logs
    op.create_index('idx_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'])


def downgrade():
    # Drop audit logs
    op.drop_table('audit_logs')
    
    # Drop user sessions
    op.drop_table('user_sessions')
    
    # Remove columns from users
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'last_failed_login')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'login_count')
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'auth_provider')