"""In-memory store for the last plan run per persona - process-local, demo-scoped."""
from dataclasses import dataclass
from typing import Any, Optional

from app.planner.schemas import ConnectorEvent, PlanRunLogResponse

_last_run_by_persona: dict[str, PlanRunLogResponse] = {}


@dataclass
class PlanContext:
    """
    Everything needed to re-run just the reasoning step without re-fetching
    from the MCP connectors - lets human-in-the-loop feedback feel
    immediate (no re-spawning subprocess servers) while still being a real
    second reasoning call over the same underlying data.
    """
    persona_id: str
    time_of_day: str
    as_of: str
    connected: set[str]
    tool_data: dict[str, dict]
    connector_events: list[ConnectorEvent]
    total_mcp_latency_ms: int


_last_context_by_persona: dict[str, PlanContext] = {}


def save_run(persona_id: str, run_log: PlanRunLogResponse) -> None:
    _last_run_by_persona[persona_id] = run_log


def get_last_run(persona_id: str) -> Optional[PlanRunLogResponse]:
    return _last_run_by_persona.get(persona_id)


def save_context(persona_id: str, context: PlanContext) -> None:
    _last_context_by_persona[persona_id] = context


def get_context(persona_id: str) -> Optional[PlanContext]:
    return _last_context_by_persona.get(persona_id)
