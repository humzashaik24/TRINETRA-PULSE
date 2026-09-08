"""create users + auth audit events tables (Phase 18.1 RBAC)

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-09-05 10:00:00.000000

Adds the ``users`` table (BCrypt-hashed credentials, single role, active flag)
and the minimal ``auth_audit_events`` table carrying authentication/RBAC
events (login success/failure, role change, deactivation, permission denied).
No organization table: identity lives in ``users``; organizations are modelled
as an ``entity_type`` (see Phase 14.2).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users and auth_audit_events tables."""
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=False),
        sa.Column(
            'role',
            sa.Enum(
                'investigator',
                'supervisor',
                'admin',
                'auditor',
                name='user_role',
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('1'),
        ),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'auth_audit_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column(
            'action',
            sa.Enum(
                'login_success',
                'login_failure',
                'role_changed',
                'user_deactivated',
                'permission_denied',
                name='auth_audit_action',
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_auth_audit_events_email'),
        'auth_audit_events',
        ['email'],
        unique=False,
    )


def downgrade() -> None:
    """Drop auth_audit_events and users."""
    op.drop_index(
        op.f('ix_auth_audit_events_email'),
        table_name='auth_audit_events',
    )
    op.drop_table('auth_audit_events')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')