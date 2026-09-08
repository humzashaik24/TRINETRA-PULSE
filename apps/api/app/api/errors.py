"""Error contract for the real application layer.

Every real-application error is serialized as::

    {"code": "investigation_not_found", "message": "...", "details": {...}}

HTTP status codes map 1:1 to error codes via ``ERROR_STATUS`` and the global
handler installed in ``app.main``.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

DEFAULT_STATUS = status.HTTP_500_INTERNAL_SERVER_ERROR


class AppError(Exception):
    """Base class for domain errors carrying a stable machine-readable code."""

    status_code: int = DEFAULT_STATUS
    code: str = "internal_error"
    default_message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message or self.default_message)
        self.message = message or self.default_message
        self.details = details or {}


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"

    def __init__(self, resource: str, resource_id: str):
        super().__init__(f"{resource} not found", {"resource": resource, "id": resource_id})


class InvestigationNotFoundError(NotFoundError):
    def __init__(self, investigation_id: str):
        super().__init__("Investigations", investigation_id)


class EntityNotFoundError(NotFoundError):
    def __init__(self, entity_id: str):
        super().__init__("Entities", entity_id)


class RelationshipNotFoundError(NotFoundError):
    def __init__(self, relationship_id: str):
        super().__init__("Relationships", relationship_id)


class FindingNotFoundError(NotFoundError):
    def __init__(self, finding_id: str):
        super().__init__("Findings", finding_id)


class EvidenceNotFoundError(NotFoundError):
    def __init__(self, evidence_id: str):
        super().__init__("Evidence", evidence_id)


class DirectionNotFoundError(NotFoundError):
    def __init__(self, direction_id: str):
        super().__init__("Directions", direction_id)


class EventNotFoundError(NotFoundError):
    def __init__(self, event_id: str):
        super().__init__("Events", event_id)


class NoteNotFoundError(NotFoundError):
    def __init__(self, note_id: str):
        super().__init__("Notes", note_id)


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message, details)


class IntegrityError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "integrity_error"

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message, details)


class EvidenceUploadError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "evidence_upload_error"


class EvidenceStorageUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "evidence_storage_unavailable"


# ---------------------------------------------------------------------------
# Phase 24 — multimedia evidence intelligence errors
#
# Every code is a safe, coarse tag. Provider credential failures, timeouts and
# upstream vendor text are intentionally NOT propagated to the client; the
# machine code tells the caller what class of failure occurred without leaking
# secrets or internal endpoint details.
# ---------------------------------------------------------------------------


class UnsupportedMediaError(AppError):
    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    code = "UNSUPPORTED_MEDIA"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message or "The evidence payload is not analyzable media", details)


class EvidenceIntegrityError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "EVIDENCE_INTEGRITY_FAILED"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message or "The evidence payload could not be verified before analysis",
            details,
        )


class ProviderNotConfiguredError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "PROVIDER_NOT_CONFIGURED"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message or "No enabled analysis provider is configured for this media capability",
            details,
        )


class ProviderUnavailableError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "PROVIDER_UNAVAILABLE"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message or "The analysis provider is unreachable", details)


class ProviderAuthenticationFailedError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "PROVIDER_AUTHENTICATION_FAILED"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message or "The analysis provider rejected the configured credential",
            details,
        )


class ProviderTimeoutError(AppError):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    code = "PROVIDER_TIMEOUT"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message or "The analysis provider timed out", details)


class AnalysisFailedError(AppError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "ANALYSIS_FAILED"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message or "The analysis provider returned an unreadable or invalid result",
            details,
        )


# ---------------------------------------------------------------------------
# Phase 25 — local (in-browser) transcription errors
# ---------------------------------------------------------------------------


class UnsupportedAudioFormatError(AppError):
    """The evidence is not an audio channel the in-browser transcriber can read."""

    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    code = "UNSUPPORTED_AUDIO_FORMAT"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message or "The evidence is not a supported audio format for local transcription",
            details,
        )


class TranscriptValidationError(AppError):
    """The submitted local transcription failed strict server-side validation."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "INVALID_TRANSCRIPT"

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message or "The submitted local transcription did not pass validation",
            details,
        )


class AuthRequiredError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "authentication_required"

    def __init__(self) -> None:
        super().__init__("Authentication required")


class NotAuthorizedError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"

    def __init__(self, message: str = "You are not authorized to perform this action."):
        super().__init__(message)


def _body(status_code: int, code: str, message: str, details: dict[str, Any]) -> dict:
    return {"code": code, "message": message, "details": details, "status_code": status_code}


def _serialize_allowed(exc: Exception) -> dict | None:
    if isinstance(exc, AppError):
        return _body(exc.status_code, exc.code, exc.message, exc.details)
    if isinstance(exc, StarletteHTTPException):
        return _body(exc.status_code, "http_error", str(exc.detail), {})
    if isinstance(exc, RequestValidationError):
        errors = [
            {"loc": list(e.get("loc", [])), "msg": e.get("msg", ""), "type": e.get("type", "")}
            for e in exc.errors()
        ]
        return _body(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "validation_error",
            "Request validation failed",
            {"errors": errors},
        )
    return None


def install_error_handlers(app: FastAPI) -> None:
    """Register JSON error handlers that emit the ``{code, message, details}`` contract."""

    async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=_serialize_allowed(exc))  # type: ignore[attr-defined]

    async def fallback_handler(request: Request, exc: Exception) -> JSONResponse:
        body = _serialize_allowed(exc) or _body(
            DEFAULT_STATUS, "internal_error", "Internal server error", {}
        )
        return JSONResponse(status_code=body["status_code"], content=body)

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, fallback_handler)
    app.add_exception_handler(RequestValidationError, fallback_handler)
    app.add_exception_handler(Exception, fallback_handler)
