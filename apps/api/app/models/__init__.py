from app.models.base import Base, BaseModel
from app.models.candidate_resolution import (
    CandidateObservation,
    CandidateObservationState,
    CandidateResolution,
    CandidateResolutionAudit,
    CandidateResolutionState,
    MatchFeatureType,
    ResolutionConfidenceLevel,
    ResolutionTier,
)
from app.models.case import Case, CasePriority, CaseStatus, Evidence, EvidenceEntityLink, Incident
from app.models.dataset import Dataset, DatasetStatus, DataSource, IngestionJob, IngestionJobStatus
from app.models.entity import Entity, EntityType
from app.models.entity_resolution import EntityResolution, VerificationState
from app.models.evidence_chain import EvidenceChainAction, EvidenceChainEntry
from app.models.evidence_understanding import (
    AnalysisMediaKind,
    AnalysisStatus,
    EvidenceUnderstanding,
)
from app.models.investigation import (
    EvidenceIntelligenceType,
    FindingConfidence,
    FindingSeverity,
    FindingStatus,
    Investigation,
    InvestigationEvent,
    InvestigationEvidence,
    InvestigationFinding,
    InvestigationNote,
    InvestigationPriority,
    InvestigationStatus,
)
from app.models.network_analytics import NetworkAnalyticsSnapshot
from app.models.provenance import DataProvenance, ProvenanceSourceType
from app.models.provider import (
    AIConfigProvider,
    ProviderCapability,
    ProviderType,
)
from app.models.relationship import (
    ExtractionMethod,
    Relationship,
    RelationshipType,
    VerificationStatus,
)
from app.models.user import (
    ROLE_RANK,
    AuthAuditAction,
    AuthAuditEvent,
    User,
    UserRole,
)

__all__ = [
    "Base",
    "BaseModel",
    "Entity",
    "EntityType",
    "Relationship",
    "RelationshipType",
    "EvidenceChainAction",
    "EvidenceChainEntry",
    # Phase 24 — multimedia evidence intelligence
    "AnalysisMediaKind",
    "AnalysisStatus",
    "EvidenceUnderstanding",
    "VerificationStatus",
    "ExtractionMethod",
    "Case",
    "CaseStatus",
    "CasePriority",
    "Incident",
    "Evidence",
    "EvidenceEntityLink",
    "EntityResolution",
    "VerificationState",
    "DataProvenance",
    "ProvenanceSourceType",
    # Phase 14.2 investigation domain
    "Investigation",
    "InvestigationStatus",
    "InvestigationPriority",
    "InvestigationFinding",
    "InvestigationEvidence",
    "InvestigationEvent",
    "InvestigationNote",
    "FindingSeverity",
    "FindingConfidence",
    "FindingStatus",
    "EvidenceIntelligenceType",
    "NetworkAnalyticsSnapshot",
    # Phase 23 — AI/media provider configuration
    "ProviderType",
    "ProviderCapability",
    "AIConfigProvider",
    # Phase 14.3 data intelligence persistence
    "Dataset",
    "DatasetStatus",
    "DataSource",
    "IngestionJob",
    "IngestionJobStatus",
    # Phase 18.1 authentication + RBAC
    "UserRole",
    "ROLE_RANK",
    "User",
    "AuthAuditAction",
    "AuthAuditEvent",
    "CandidateObservation",
    "CandidateObservationState",
    "CandidateResolution",
    "CandidateResolutionAudit",
    "CandidateResolutionState",
    "MatchFeatureType",
    "ResolutionConfidenceLevel",
    "ResolutionTier",
]
