"""Shared identity stub for functional (/api/v2) API tests.

Since Phase 18.1 every ``/api/v2`` endpoint requires a verified Bearer token.
These functional suites exercise business logic, not authorization, so they
install a deterministic actor via ``dependency_overrides``. The dedicated
auth/RBAC suite (``test_auth_rbac.py``) deliberately runs WITHOUT this
override so the real ``get_current_user``/``require_role`` behaviour is
exercised end to end.
"""

from uuid import uuid4

from app.api.deps import CurrentUser, get_current_user
from app.models import UserRole


def install_auth_stub(app, role: UserRole = UserRole.SUPERVISOR) -> None:
    """Override ``get_current_user`` with a fixed actor of ``role``.

    Defaults to SUPERVISOR so both ``can_mutate`` routes and the
    supervisor-only investigation delete pass in the generic suites.
    """

    async def _override_get_current_user() -> CurrentUser:
        return CurrentUser(
            id=str(uuid4()),
            email="stub.caller@test.local",
            display_name="Stub Caller",
            role=role,
            is_active=True,
        )

    app.dependency_overrides[get_current_user] = _override_get_current_user
