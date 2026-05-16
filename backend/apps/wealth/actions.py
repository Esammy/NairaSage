"""Chat action catalog: previews, execution, LangChain tool schemas."""

from __future__ import annotations

import datetime as dt
import json
import logging
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional, Tuple

from django.shortcuts import get_object_or_404
from django.utils import timezone
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, ConfigDict, Field

from apps.users.models import User
from apps.wealth.models import (
    ActionAudit,
    ActionProposal,
    AssetItem,
    BITriangleScore,
    CoachMemory,
    Deal,
    FinancialStatementSnapshot,
    InvestorControlsChecklist,
    InvestorLevel,
    LiabilityItem,
    NextAction,
    QuadrantProfile,
    RichDadPhase,
)
from apps.wealth.serializers import (
    AssetItemSerializer,
    BITriangleScoreSerializer,
    DealSerializer,
    FinancialStatementSnapshotSerializer,
    InvestorControlsChecklistSerializer,
    InvestorLevelSerializer,
    LiabilityItemSerializer,
    NextActionSerializer,
    QuadrantProfileSerializer,
    RichDadPhaseSerializer,
)
from apps.wealth.services import (
    SnapshotInputs,
    assess_investor_level,
    compose_snapshot,
)

logger = logging.getLogger(__name__)

WRITE_TOOL_NAMES = frozenset(
    {
        "update_statement_inputs",
        "upsert_asset",
        "remove_asset",
        "upsert_liability",
        "remove_liability",
        "update_quadrant",
        "set_phase",
        "toggle_phase_milestone",
        "update_bi_triangle",
        "upsert_deal",
        "score_deal_controls",
        "mark_next_action_done",
        "dismiss_next_action",
        "forget_memory",
    }
)

CONFIRM_WRITE_RATE_PER_HOUR = 30
PROPOSAL_TTL_MINUTES = 10


# --- Pydantic args (tool schemas) -------------------------------------------


class EmptyArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GetMemoriesArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    limit: int = Field(default=12, ge=1, le=48)


class UpdateStatementInputsArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    income_active: Optional[float] = None
    income_passive: Optional[float] = None
    income_portfolio: Optional[float] = None
    expenses_essential: Optional[float] = None
    expenses_doodad: Optional[float] = None


class UpsertAssetArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[int] = None
    name: str = ""
    kiyosaki_type: str = "other"
    market_value: float = 0.0
    monthly_cashflow: float = 0.0
    notes: str = ""


class RemoveAssetArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    asset_id: int


class UpsertLiabilityArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[int] = None
    name: str = ""
    is_good_debt: bool = False
    balance: float = 0.0
    monthly_payment: float = 0.0
    notes: str = ""


class RemoveLiabilityArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    liability_id: int


class UpdateQuadrantArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pct_e: Optional[float] = None
    pct_s: Optional[float] = None
    pct_b: Optional[float] = None
    pct_i: Optional[float] = None
    target_pct_b: Optional[float] = None
    target_pct_i: Optional[float] = None
    target_year: Optional[int] = None


class SetPhaseArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_phase: int = Field(ge=1, le=5)


class TogglePhaseMilestoneArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phase: int = Field(ge=1, le=5)
    milestone_key: str
    done: bool = True


class UpdateBITriangleArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mission: Optional[int] = Field(default=None, ge=0, le=100)
    leadership: Optional[int] = Field(default=None, ge=0, le=100)
    team: Optional[int] = Field(default=None, ge=0, le=100)
    product: Optional[int] = Field(default=None, ge=0, le=100)
    legal: Optional[int] = Field(default=None, ge=0, le=100)
    systems: Optional[int] = Field(default=None, ge=0, le=100)
    communications: Optional[int] = Field(default=None, ge=0, le=100)
    cashflow: Optional[int] = Field(default=None, ge=0, le=100)


class UpsertDealArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[int] = None
    title: str = ""
    deal_type: str = "other"
    status: str = "evaluating"
    entry_price: float = 0.0
    projected_monthly_cashflow: float = 0.0
    projected_roi_pct: Optional[float] = None
    notes: str = ""


class ScoreDealControlsArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    deal_id: int
    control_1_self: Optional[int] = Field(default=None, ge=0, le=3)
    control_2_ratios: Optional[int] = Field(default=None, ge=0, le=3)
    control_3_management: Optional[int] = Field(default=None, ge=0, le=3)
    control_4_taxes: Optional[int] = Field(default=None, ge=0, le=3)
    control_5_entry_exit: Optional[int] = Field(default=None, ge=0, le=3)
    control_6_brokerage: Optional[int] = Field(default=None, ge=0, le=3)
    control_7_etc_opm: Optional[int] = Field(default=None, ge=0, le=3)
    control_8_terms: Optional[int] = Field(default=None, ge=0, le=3)
    control_9_info_access: Optional[int] = Field(default=None, ge=0, le=3)
    control_10_philanthropy: Optional[int] = Field(default=None, ge=0, le=3)


class NextActionIdArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    next_action_id: int


class ForgetMemoryArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    memory_id: int


class GetDealsArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Optional[str] = None


# --- Helpers -----------------------------------------------------------------


def _dec(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    return Decimal(str(v))


def _snapshot_for_month(user: User) -> Tuple[dt.date, Optional[FinancialStatementSnapshot]]:
    today = dt.date.today().replace(day=1)
    snap = (
        FinancialStatementSnapshot.objects.filter(user=user)
        .order_by("-period_month")
        .first()
    )
    return today, snap


def human_summary_for_tool(tool: str, args: Dict[str, Any]) -> str:
    if tool == "update_statement_inputs":
        return "Update monthly income and expense inputs on your financial statement."
    if tool == "upsert_asset":
        return f"Save asset: {args.get('name') or 'unnamed'}."
    if tool == "remove_asset":
        return f"Remove asset #{args.get('asset_id')}."
    if tool == "upsert_liability":
        return f"Save liability: {args.get('name') or 'unnamed'}."
    if tool == "remove_liability":
        return f"Remove liability #{args.get('liability_id')}."
    if tool == "update_quadrant":
        return "Update CASHFLOW quadrant percentages."
    if tool == "set_phase":
        return f"Set current investor phase to {args.get('current_phase')}."
    if tool == "toggle_phase_milestone":
        return (
            f"Mark milestone {args.get('milestone_key')} on phase {args.get('phase')} "
            f"as {'done' if args.get('done') else 'not done'}."
        )
    if tool == "update_bi_triangle":
        return "Update B-I Triangle integrity scores."
    if tool == "upsert_deal":
        return f"Save deal: {args.get('title') or 'untitled'}."
    if tool == "score_deal_controls":
        return f"Update investor controls checklist for deal #{args.get('deal_id')}."
    if tool == "mark_next_action_done":
        return f"Mark next action #{args.get('next_action_id')} as done."
    if tool == "dismiss_next_action":
        return f"Dismiss next action #{args.get('next_action_id')}."
    if tool == "forget_memory":
        return f"Forget stored memory #{args.get('memory_id')}."
    return f"{tool}"


def preview_diff(user: User, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        before: Dict[str, Any] = {}
        after_hint: Dict[str, Any] = {}

        if tool == "update_statement_inputs":
            _, snap = _snapshot_for_month(user)
            if snap:
                before = FinancialStatementSnapshotSerializer(snap).data
            after_hint = {k: v for k, v in args.items() if v is not None}
        elif tool == "upsert_asset":
            if args.get("id"):
                obj = AssetItem.objects.filter(pk=args["id"], user=user).first()
                if obj:
                    before = AssetItemSerializer(obj).data
            after_hint = dict(args)
        elif tool == "remove_asset":
            obj = AssetItem.objects.filter(pk=args.get("asset_id"), user=user).first()
            if obj:
                before = AssetItemSerializer(obj).data
        elif tool == "upsert_liability":
            if args.get("id"):
                obj = LiabilityItem.objects.filter(pk=args["id"], user=user).first()
                if obj:
                    before = LiabilityItemSerializer(obj).data
            after_hint = dict(args)
        elif tool == "remove_liability":
            obj = LiabilityItem.objects.filter(
                pk=args.get("liability_id"), user=user
            ).first()
            if obj:
                before = LiabilityItemSerializer(obj).data
        elif tool == "update_quadrant":
            q, _ = QuadrantProfile.objects.get_or_create(user=user)
            before = QuadrantProfileSerializer(q).data
            after_hint = {k: v for k, v in args.items() if v is not None}
        elif tool == "set_phase":
            ph, _ = RichDadPhase.objects.get_or_create(user=user)
            before = {"current_phase": ph.current_phase}
            after_hint = {"current_phase": args.get("current_phase")}
        elif tool == "toggle_phase_milestone":
            ph, _ = RichDadPhase.objects.get_or_create(user=user)
            before = {"phase_progress": ph.phase_progress}
            after_hint = dict(args)
        elif tool == "update_bi_triangle":
            tri, _ = BITriangleScore.objects.get_or_create(user=user)
            before = BITriangleScoreSerializer(tri).data
            after_hint = {k: v for k, v in args.items() if v is not None}
        elif tool == "upsert_deal":
            if args.get("id"):
                d = Deal.objects.filter(pk=args["id"], user=user).first()
                if d:
                    before = DealSerializer(d).data
            after_hint = dict(args)
        elif tool == "score_deal_controls":
            deal = Deal.objects.filter(pk=args.get("deal_id"), user=user).first()
            if deal:
                ctrl, _ = InvestorControlsChecklist.objects.get_or_create(deal=deal)
                before = InvestorControlsChecklistSerializer(ctrl).data
            after_hint = {k: v for k, v in args.items() if k != "deal_id" and v is not None}
        elif tool == "mark_next_action_done" or tool == "dismiss_next_action":
            na = NextAction.objects.filter(
                pk=args.get("next_action_id"), user=user
            ).first()
            if na:
                before = NextActionSerializer(na).data
        elif tool == "forget_memory":
            mem = CoachMemory.objects.filter(
                pk=args.get("memory_id"), user=user
            ).first()
            if mem:
                before = {"id": mem.pk, "kind": mem.kind, "content": mem.content[:200]}

        return {"before": before, "after_preview": after_hint}
    except Exception as e:  # noqa: BLE001
        logger.exception("preview_diff failed: %s", e)
        return {"before": {}, "after_preview": dict(args), "error": str(e)}


def _recompose_snapshot_totals(user: User) -> FinancialStatementSnapshot:
    """Rebuild current-month snapshot totals from line items; keep income/expense inputs."""
    today = dt.date.today().replace(day=1)
    latest = (
        FinancialStatementSnapshot.objects.filter(user=user)
        .order_by("-period_month")
        .first()
    )
    if latest:
        inputs = SnapshotInputs(
            period_month=today,
            income_active=latest.income_active,
            income_passive=latest.income_passive,
            income_portfolio=latest.income_portfolio,
            expenses_essential=latest.expenses_essential,
            expenses_doodad=latest.expenses_doodad,
        )
    else:
        inputs = SnapshotInputs(period_month=today)
    snap = compose_snapshot(user, inputs)
    _reassess_level(user, snap)
    return snap


def _reassess_level(user: User, snap: FinancialStatementSnapshot) -> None:
    lvl_obj, _ = InvestorLevel.objects.get_or_create(user=user)
    level, sublevel, debug = assess_investor_level(
        snap,
        AssetItem.objects.filter(user=user, is_active=True),
        LiabilityItem.objects.filter(user=user, is_active=True),
    )
    if level != lvl_obj.current_level or sublevel != lvl_obj.current_sublevel:
        history = list(lvl_obj.level_history or [])
        history.append(
            {
                "level": level,
                "sublevel": sublevel,
                "changed_at": dt.datetime.now().isoformat(),
                "reason": "statement_update",
                "debug": debug,
            }
        )
        lvl_obj.level_history = history
    lvl_obj.current_level = level
    lvl_obj.current_sublevel = sublevel
    lvl_obj.last_assessment_score = debug
    lvl_obj.save()


def execute_write_tool(user: User, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Apply a validated write. Returns a small result dict for audit after_json."""

    if tool == "update_statement_inputs":
        today, snap = _snapshot_for_month(user)
        base_income_active = snap.income_active if snap else Decimal("0")
        base_passive = snap.income_passive if snap else Decimal("0")
        base_portfolio = snap.income_portfolio if snap else Decimal("0")
        base_ess = snap.expenses_essential if snap else Decimal("0")
        base_doodad = snap.expenses_doodad if snap else Decimal("0")
        inputs = SnapshotInputs(
            period_month=today,
            income_active=_dec(args.get("income_active", base_income_active)),
            income_passive=_dec(args.get("income_passive", base_passive)),
            income_portfolio=_dec(args.get("income_portfolio", base_portfolio)),
            expenses_essential=_dec(args.get("expenses_essential", base_ess)),
            expenses_doodad=_dec(args.get("expenses_doodad", base_doodad)),
        )
        snap2 = compose_snapshot(user, inputs)
        _reassess_level(user, snap2)
        return {"snapshot": FinancialStatementSnapshotSerializer(snap2).data}

    if tool == "upsert_asset":
        aid = args.get("id")
        payload = {
            "name": args.get("name") or "Asset",
            "kiyosaki_type": args.get("kiyosaki_type") or "other",
            "market_value": str(_dec(args.get("market_value"))),
            "monthly_cashflow": str(_dec(args.get("monthly_cashflow"))),
            "notes": args.get("notes") or "",
            "is_active": True,
        }
        if aid:
            obj = get_object_or_404(AssetItem, pk=aid, user=user)
            ser = AssetItemSerializer(obj, data=payload, partial=True)
        else:
            ser = AssetItemSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        if aid:
            obj = ser.save()
        else:
            obj = ser.save(user=user)
        _recompose_snapshot_totals(user)
        return {"asset": AssetItemSerializer(obj).data}

    if tool == "remove_asset":
        obj = get_object_or_404(AssetItem, pk=args["asset_id"], user=user)
        obj.delete()
        _recompose_snapshot_totals(user)
        return {"removed_asset_id": args["asset_id"]}

    if tool == "upsert_liability":
        lid = args.get("id")
        payload = {
            "name": args.get("name") or "Liability",
            "is_good_debt": bool(args.get("is_good_debt")),
            "balance": str(_dec(args.get("balance"))),
            "monthly_payment": str(_dec(args.get("monthly_payment"))),
            "notes": args.get("notes") or "",
            "is_active": True,
        }
        if lid:
            obj = get_object_or_404(LiabilityItem, pk=lid, user=user)
            ser = LiabilityItemSerializer(obj, data=payload, partial=True)
        else:
            ser = LiabilityItemSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        if lid:
            obj = ser.save()
        else:
            obj = ser.save(user=user)
        _recompose_snapshot_totals(user)
        return {"liability": LiabilityItemSerializer(obj).data}

    if tool == "remove_liability":
        obj = get_object_or_404(LiabilityItem, pk=args["liability_id"], user=user)
        obj.delete()
        _recompose_snapshot_totals(user)
        return {"removed_liability_id": args["liability_id"]}

    if tool == "update_quadrant":
        q, _ = QuadrantProfile.objects.get_or_create(user=user)
        data = QuadrantProfileSerializer(q).data
        for k in (
            "pct_e",
            "pct_s",
            "pct_b",
            "pct_i",
            "target_pct_b",
            "target_pct_i",
            "target_year",
        ):
            if k in args and args[k] is not None:
                data[k] = args[k]
        ser = QuadrantProfileSerializer(q, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return {"quadrant": ser.data}

    if tool == "set_phase":
        ph, _ = RichDadPhase.objects.get_or_create(user=user)
        ph.current_phase = int(args["current_phase"])
        ph.save(update_fields=["current_phase", "updated_at"])
        return {"phase": RichDadPhaseSerializer(ph).data}

    if tool == "toggle_phase_milestone":
        ph, _ = RichDadPhase.objects.get_or_create(user=user)
        prog = dict(ph.phase_progress or {})
        ph_key = str(int(args["phase"]))
        inner = dict(prog.get(ph_key) or {})
        ms = list(inner.get("milestones") or [])
        key = str(args["milestone_key"])
        done = bool(args.get("done", True))
        found = False
        for m in ms:
            if m.get("key") == key:
                m["done"] = done
                m["noted_at"] = timezone.now().isoformat()
                found = True
                break
        if not found:
            ms.append(
                {
                    "key": key,
                    "done": done,
                    "noted_at": timezone.now().isoformat(),
                }
            )
        inner["milestones"] = ms
        prog[ph_key] = inner
        ph.phase_progress = prog
        ph.save(update_fields=["phase_progress", "updated_at"])
        return {"phase": RichDadPhaseSerializer(ph).data}

    if tool == "update_bi_triangle":
        tri, _ = BITriangleScore.objects.get_or_create(user=user)
        data = BITriangleScoreSerializer(tri).data
        for k in (
            "mission",
            "leadership",
            "team",
            "product",
            "legal",
            "systems",
            "communications",
            "cashflow",
        ):
            if k in args and args[k] is not None:
                data[k] = int(args[k])
        ser = BITriangleScoreSerializer(tri, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return {"bi_triangle": ser.data}

    if tool == "upsert_deal":
        did = args.get("id")
        payload = {
            "title": args.get("title") or "Deal",
            "deal_type": args.get("deal_type") or "other",
            "status": args.get("status") or "evaluating",
            "entry_price": str(_dec(args.get("entry_price"))),
            "projected_monthly_cashflow": str(
                _dec(args.get("projected_monthly_cashflow"))
            ),
            "notes": args.get("notes") or "",
        }
        if args.get("projected_roi_pct") is not None:
            payload["projected_roi_pct"] = str(_dec(args["projected_roi_pct"]))
        if did:
            deal = get_object_or_404(Deal, pk=did, user=user)
            ser = DealSerializer(deal, data=payload, partial=True)
        else:
            ser = DealSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        deal = ser.save(user=user) if not did else ser.save()
        InvestorControlsChecklist.objects.get_or_create(deal=deal)
        return {"deal": DealSerializer(deal).data}

    if tool == "score_deal_controls":
        deal = get_object_or_404(Deal, pk=args["deal_id"], user=user)
        ctrl, _ = InvestorControlsChecklist.objects.get_or_create(deal=deal)
        data = InvestorControlsChecklistSerializer(ctrl).data
        for k in (
            "control_1_self",
            "control_2_ratios",
            "control_3_management",
            "control_4_taxes",
            "control_5_entry_exit",
            "control_6_brokerage",
            "control_7_etc_opm",
            "control_8_terms",
            "control_9_info_access",
            "control_10_philanthropy",
        ):
            if k in args and args[k] is not None:
                data[k] = int(args[k])
        ser = InvestorControlsChecklistSerializer(ctrl, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return {"controls": ser.data, "deal_id": deal.pk}

    if tool == "mark_next_action_done":
        na = get_object_or_404(NextAction, pk=args["next_action_id"], user=user)
        na.is_done = True
        na.done_at = timezone.now()
        na.save(update_fields=["is_done", "done_at"])
        return {"next_action": NextActionSerializer(na).data}

    if tool == "dismiss_next_action":
        na = get_object_or_404(NextAction, pk=args["next_action_id"], user=user)
        na.is_dismissed = True
        na.save(update_fields=["is_dismissed"])
        return {"next_action": NextActionSerializer(na).data}

    if tool == "forget_memory":
        mem = get_object_or_404(CoachMemory, pk=args["memory_id"], user=user)
        mem.is_forgotten = True
        mem.save(update_fields=["is_forgotten"])
        return {"forgotten_memory_id": mem.pk}

    raise ValueError(f"Unknown write tool: {tool}")


def execute_read_tool(user: User, tool: str, args: Dict[str, Any]) -> str:
    if tool == "get_snapshot":
        today = dt.date.today().replace(day=1)
        snap = (
            FinancialStatementSnapshot.objects.filter(user=user)
            .order_by("-period_month")
            .first()
        )
        if snap is None:
            snap = compose_snapshot(user, SnapshotInputs(period_month=today))
        return json.dumps(FinancialStatementSnapshotSerializer(snap).data)

    if tool == "get_assets":
        qs = AssetItem.objects.filter(user=user)
        if args.get("active_only", True):
            qs = qs.filter(is_active=True)
        return json.dumps(AssetItemSerializer(qs.order_by("-monthly_cashflow"), many=True).data)

    if tool == "get_liabilities":
        qs = LiabilityItem.objects.filter(user=user)
        if args.get("active_only", True):
            qs = qs.filter(is_active=True)
        return json.dumps(LiabilityItemSerializer(qs.order_by("-monthly_payment"), many=True).data)

    if tool == "get_deals":
        qs = Deal.objects.filter(user=user)
        st = args.get("status")
        if st:
            qs = qs.filter(status=st)
        return json.dumps(DealSerializer(qs[:50], many=True).data)

    if tool == "get_profile":
        quad, _ = QuadrantProfile.objects.get_or_create(user=user)
        lvl, _ = InvestorLevel.objects.get_or_create(user=user)
        ph, _ = RichDadPhase.objects.get_or_create(user=user)
        tri, _ = BITriangleScore.objects.get_or_create(user=user)
        return json.dumps(
            {
                "quadrant": QuadrantProfileSerializer(quad).data,
                "investor_level": InvestorLevelSerializer(lvl).data,
                "phase": RichDadPhaseSerializer(ph).data,
                "bi_triangle": BITriangleScoreSerializer(tri).data,
            }
        )

    if tool == "get_memories":
        from agents.rich_dad_coach.memory import top_memories

        lim = int(args.get("limit") or 12)
        rows = top_memories(user.id, k=lim)
        return json.dumps(
            [
                {
                    "id": m.pk,
                    "kind": m.kind,
                    "content": m.content,
                    "confidence": m.confidence,
                    "created_at": m.created_at.isoformat(),
                }
                for m in rows
            ]
        )

    return json.dumps({"error": "unknown_read_tool", "tool": tool})


def validate_and_normalize_args(tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Re-validate args using the same Pydantic models as tools."""

    mapping: Dict[str, type[BaseModel]] = {
        "update_statement_inputs": UpdateStatementInputsArgs,
        "upsert_asset": UpsertAssetArgs,
        "remove_asset": RemoveAssetArgs,
        "upsert_liability": UpsertLiabilityArgs,
        "remove_liability": RemoveLiabilityArgs,
        "update_quadrant": UpdateQuadrantArgs,
        "set_phase": SetPhaseArgs,
        "toggle_phase_milestone": TogglePhaseMilestoneArgs,
        "update_bi_triangle": UpdateBITriangleArgs,
        "upsert_deal": UpsertDealArgs,
        "score_deal_controls": ScoreDealControlsArgs,
        "mark_next_action_done": NextActionIdArgs,
        "dismiss_next_action": NextActionIdArgs,
        "forget_memory": ForgetMemoryArgs,
        "get_snapshot": EmptyArgs,
        "get_assets": EmptyArgs,
        "get_liabilities": EmptyArgs,
        "get_deals": GetDealsArgs,
        "get_profile": EmptyArgs,
        "get_memories": GetMemoriesArgs,
    }
    model = mapping.get(tool)
    if not model:
        raise ValueError(f"Unknown tool {tool}")
    parsed = model.model_validate(args)
    return parsed.model_dump(exclude_none=True)


def user_write_count_last_hour(user_id: int) -> int:
    since = timezone.now() - dt.timedelta(hours=1)
    return ActionAudit.objects.filter(
        user_id=user_id,
        status=ActionAudit.STATUS_CONFIRMED,
        created_at__gte=since,
    ).count()


def assert_can_confirm(user: User, proposal: ActionProposal) -> None:
    if proposal.status != ActionProposal.STATUS_PENDING:
        raise ValueError("Proposal is not pending.")
    if proposal.user_id != user.id:
        raise ValueError("Not your proposal.")
    age = timezone.now() - proposal.created_at
    if age > dt.timedelta(minutes=PROPOSAL_TTL_MINUTES):
        proposal.status = ActionProposal.STATUS_EXPIRED
        proposal.save(update_fields=["status"])
        raise ValueError("Proposal expired. Ask the coach again.")
    if user_write_count_last_hour(user.id) >= CONFIRM_WRITE_RATE_PER_HOUR:
        raise ValueError("Write limit reached for this hour. Try again later.")


def create_proposal(
    user: User,
    tool: str,
    args: Dict[str, Any],
    *,
    session_id: Optional[int] = None,
) -> ActionProposal:
    norm = validate_and_normalize_args(tool, args)
    diff = preview_diff(user, tool, norm)
    return ActionProposal.objects.create(
        user=user,
        tool=tool,
        args=norm,
        human_summary=human_summary_for_tool(tool, norm),
        diff_preview=diff,
        status=ActionProposal.STATUS_PENDING,
        session_id=session_id,
    )


def confirm_proposal(
    proposal: ActionProposal,
    user: User,
    override_args: Optional[Dict[str, Any]] = None,
) -> Tuple[ActionAudit, Dict[str, Any]]:
    assert_can_confirm(user, proposal)
    args = dict(proposal.args or {})
    if override_args:
        args.update(override_args)
    args = validate_and_normalize_args(proposal.tool, args)

    before = preview_diff(user, proposal.tool, args).get("before")
    try:
        after_payload = execute_write_tool(user, proposal.tool, args)
    except Exception as e:  # noqa: BLE001
        logger.exception("execute_write_tool failed")
        audit = ActionAudit.objects.create(
            user=user,
            proposal=proposal,
            tool=proposal.tool,
            args=args,
            before_json=before,
            after_json=None,
            status=ActionAudit.STATUS_FAILED,
            error_message=str(e)[:2000],
        )
        proposal.status = ActionProposal.STATUS_FAILED
        proposal.save(update_fields=["status"])
        raise

    audit = ActionAudit.objects.create(
        user=user,
        proposal=proposal,
        tool=proposal.tool,
        args=args,
        before_json=before,
        after_json=after_payload,
        status=ActionAudit.STATUS_CONFIRMED,
    )
    proposal.status = ActionProposal.STATUS_CONFIRMED
    proposal.confirmed_at = timezone.now()
    proposal.args = args
    proposal.save(update_fields=["status", "confirmed_at", "args"])
    return audit, after_payload


def cancel_proposal(proposal: ActionProposal, user: User) -> None:
    if proposal.user_id != user.id:
        raise ValueError("Not your proposal.")
    if proposal.status != ActionProposal.STATUS_PENDING:
        raise ValueError("Proposal is not pending.")
    proposal.status = ActionProposal.STATUS_CANCELLED
    proposal.save(update_fields=["status"])


def _stub_tool_fn(*args: Any, **kwargs: Any) -> str:
    raise RuntimeError("Coach loop resolves tools; this stub must not run.")


def _st(
    name: str,
    desc: str,
    schema: type[BaseModel],
) -> StructuredTool:
    return StructuredTool.from_function(
        name=name,
        description=desc,
        args_schema=schema,
        func=_stub_tool_fn,
    )


def build_wealth_coach_tools() -> List[StructuredTool]:
    return [
        _st(
            "get_snapshot",
            "Read the user's current monthly financial statement snapshot (JSON).",
            EmptyArgs,
        ),
        _st(
            "get_assets",
            "List the user's asset line items (JSON). No extra parameters.",
            EmptyArgs,
        ),
        _st(
            "get_liabilities",
            "List the user's liability line items (JSON). No extra parameters.",
            EmptyArgs,
        ),
        _st(
            "get_deals",
            "List investment deals (JSON). Optional status filter.",
            GetDealsArgs,
        ),
        _st(
            "get_profile",
            "Read quadrant, investor level, phase, and B-I triangle (JSON).",
            EmptyArgs,
        ),
        _st(
            "get_memories",
            "Read coach memories stored for this user (JSON).",
            GetMemoriesArgs,
        ),
        _st(
            "update_statement_inputs",
            "PROPOSE updating monthly income and expense inputs on the statement. Requires user confirmation.",
            UpdateStatementInputsArgs,
        ),
        _st(
            "upsert_asset",
            "PROPOSE creating or updating one asset row. Requires user confirmation.",
            UpsertAssetArgs,
        ),
        _st(
            "remove_asset",
            "PROPOSE removing an asset by id. Requires user confirmation.",
            RemoveAssetArgs,
        ),
        _st(
            "upsert_liability",
            "PROPOSE creating or updating one liability row. Requires user confirmation.",
            UpsertLiabilityArgs,
        ),
        _st(
            "remove_liability",
            "PROPOSE removing a liability by id. Requires user confirmation.",
            RemoveLiabilityArgs,
        ),
        _st(
            "update_quadrant",
            "PROPOSE updating CASHFLOW quadrant percentages. Requires user confirmation.",
            UpdateQuadrantArgs,
        ),
        _st(
            "set_phase",
            "PROPOSE setting the current investor phase (1-5). Requires user confirmation.",
            SetPhaseArgs,
        ),
        _st(
            "toggle_phase_milestone",
            "PROPOSE toggling a phase milestone. Requires user confirmation.",
            TogglePhaseMilestoneArgs,
        ),
        _st(
            "update_bi_triangle",
            "PROPOSE updating B-I Triangle scores. Requires user confirmation.",
            UpdateBITriangleArgs,
        ),
        _st(
            "upsert_deal",
            "PROPOSE creating or updating a deal. Requires user confirmation.",
            UpsertDealArgs,
        ),
        _st(
            "score_deal_controls",
            "PROPOSE updating 10 investor controls for a deal. Requires user confirmation.",
            ScoreDealControlsArgs,
        ),
        _st(
            "mark_next_action_done",
            "PROPOSE marking a next-action as done. Requires user confirmation.",
            NextActionIdArgs,
        ),
        _st(
            "dismiss_next_action",
            "PROPOSE dismissing a next-action. Requires user confirmation.",
            NextActionIdArgs,
        ),
        _st(
            "forget_memory",
            "PROPOSE forgetting a coach memory by id. Requires user confirmation.",
            ForgetMemoryArgs,
        ),
    ]
