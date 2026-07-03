from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import AppSetting, SystemUser, AssetStatus, AssetCategory, AssetModel, Asset
from app.services.passwords import hash_password

router = APIRouter(prefix="/setup", tags=["setup"])

DEFAULT_STATUSES = [
    {"name": "Ready", "color": "#22C55E", "is_deployable": True, "sort_order": 0},
    {"name": "Assigned", "color": "#3B82F6", "is_deployable": True, "sort_order": 1},
    {"name": "Broken", "color": "#EF4444", "is_deployable": False, "sort_order": 2},
    {"name": "In Repair", "color": "#F59E0B", "is_deployable": False, "sort_order": 3},
    {"name": "EOL", "color": "#6B7280", "is_deployable": False, "sort_order": 4},
    {"name": "Archived", "color": "#374151", "is_deployable": False, "sort_order": 5},
]

DEFAULT_CATEGORIES = [
    {"name": "Laptop", "type": "Hardware", "eol_years": 5},
    {"name": "Desktop", "type": "Hardware", "eol_years": 7},
    {"name": "Monitor", "type": "Hardware", "eol_years": 10},
    {"name": "Phone", "type": "Hardware", "eol_years": 3},
    {"name": "Tablet", "type": "Hardware", "eol_years": 4},
    {"name": "Server", "type": "Hardware", "eol_years": 7},
    {"name": "Network Equipment", "type": "Hardware", "eol_years": 7},
    {"name": "Peripheral", "type": "Hardware", "eol_years": 5},
]


@router.get("/status")
async def setup_status(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == "setup_complete")
    )
    setting = result.scalar_one_or_none()
    return {"complete": setting is not None and setting.value == "true"}


EXAMPLE_MODELS = [
    {"name": "MacBook Air M3", "manufacturer": "Apple", "model_number": "MQKQ3LL/A", "category_name": "Laptop", "eol_years": 5},
    {"name": "MacBook Pro M4", "manufacturer": "Apple", "model_number": "MX2Y3LL/A", "category_name": "Laptop", "eol_years": 6},
    {"name": "ThinkPad T16 Gen 3", "manufacturer": "Lenovo", "model_number": "21MN000MUS", "category_name": "Laptop", "eol_years": 5},
    {"name": "iPhone 16 Pro", "manufacturer": "Apple", "model_number": "MYNX3LL/A", "category_name": "Phone", "eol_years": 3},
    {"name": "UltraSharp P2723D", "manufacturer": "Dell", "model_number": "P2723D", "category_name": "Monitor", "eol_years": 8},
]

EXAMPLE_ASSETS = [
    {
        "name": "MacBook Air — Engineering",
        "asset_tag": "SG-001",
        "serial": "C02XG0JFHV2Q",
        "model_key": "MacBook Air M3",
        "make": "Apple", "model": "MacBook Air M3",
        "purchase_date": date.today() - timedelta(days=180),
        "purchase_price": 1299.00,
        "warranty_months": 12,
        "status_name": "Assigned",
    },
    {
        "name": "ThinkPad — IT Dept",
        "asset_tag": "SG-002",
        "serial": "PF2BNNQX",
        "model_key": "ThinkPad T16 Gen 3",
        "make": "Lenovo", "model": "ThinkPad T16 Gen 3",
        "purchase_date": date.today() - timedelta(days=90),
        "purchase_price": 1149.00,
        "warranty_months": 36,
        "status_name": "Ready",
    },
    {
        "name": "iPhone 16 Pro — CEO",
        "asset_tag": "SG-003",
        "serial": "F17NP4QSQ1GC",
        "model_key": "iPhone 16 Pro",
        "make": "Apple", "model": "iPhone 16 Pro",
        "purchase_date": date.today() - timedelta(days=30),
        "purchase_price": 999.00,
        "warranty_months": 12,
        "status_name": "Assigned",
    },
    {
        "name": "Dell Monitor — Workstation 1",
        "asset_tag": "SG-004",
        "serial": "CN0P2723D7K0",
        "model_key": "UltraSharp P2723D",
        "make": "Dell", "model": "UltraSharp P2723D",
        "purchase_date": date.today() - timedelta(days=365),
        "purchase_price": 549.00,
        "warranty_months": 36,
        "status_name": "Assigned",
    },
]


class SetupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    create_examples: bool = False


@router.post("", status_code=status.HTTP_201_CREATED)
async def run_setup(body: SetupRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == "setup_complete")
    )
    existing = result.scalar_one_or_none()
    if existing and existing.value == "true":
        raise HTTPException(status_code=409, detail="Setup already complete")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    user = SystemUser(
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    session.add(user)

    for s in DEFAULT_STATUSES:
        session.add(AssetStatus(**s))

    categories: dict[str, AssetCategory] = {}
    for c in DEFAULT_CATEGORIES:
        cat = AssetCategory(**c)
        session.add(cat)
        categories[c["name"]] = cat

    await session.flush()

    if body.create_examples:
        # Build status name → id map
        status_result = await session.execute(select(AssetStatus))
        statuses = {s.name: s for s in status_result.scalars().all()}

        # Create asset models
        model_objs: dict[str, AssetModel] = {}
        for m in EXAMPLE_MODELS:
            cat = categories.get(m["category_name"])
            am = AssetModel(
                name=m["name"],
                manufacturer=m["manufacturer"],
                model_number=m["model_number"],
                category_id=cat.id if cat else None,
                eol_years=m["eol_years"],
            )
            session.add(am)
            model_objs[m["name"]] = am

        await session.flush()

        # Create assets
        for a in EXAMPLE_ASSETS:
            am = model_objs.get(a["model_key"])
            cat_name = "Laptop" if "MacBook" in a["model_key"] or "ThinkPad" in a["model_key"] else \
                       "Phone" if "iPhone" in a["model_key"] else "Monitor"
            cat = categories.get(cat_name)
            st = statuses.get(a["status_name"]) or statuses.get("Ready")
            purchase = a.get("purchase_date")
            warranty_months = a.get("warranty_months")
            warranty_expiry = (
                date(purchase.year + warranty_months // 12, purchase.month + warranty_months % 12, purchase.day)
                if purchase and warranty_months
                else None
            )
            eol_years = am.eol_years if am else None
            eol_date = date(purchase.year + eol_years, purchase.month, purchase.day) if purchase and eol_years else None
            session.add(Asset(
                name=a["name"],
                asset_tag=a["asset_tag"],
                serial=a.get("serial"),
                asset_model_id=am.id if am else None,
                make=a.get("make"),
                model=a.get("model"),
                model_number=am.model_number if am else None,
                category_id=cat.id if cat else None,
                status_id=st.id,
                purchase_date=purchase,
                purchase_price=a.get("purchase_price"),
                warranty_months=warranty_months,
                warranty_expiry=warranty_expiry,
                eol_date=eol_date,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ))

    setting = AppSetting(key="setup_complete", value="true")
    session.add(setting)
    session.add(AppSetting(key="audit_interval_months", value="12"))
    session.add(AppSetting(key="asset_tag_prefix", value="SG-"))

    await session.commit()
    return {"message": "Setup complete"}
