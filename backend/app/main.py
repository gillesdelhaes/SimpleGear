from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    health,
    setup,
    auth,
    assets,
    people,
    categories,
    statuses,
    locations,
    search,
    dashboard,
    import_export,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="SimpleGear API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(setup.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(import_export.router, prefix="/api")
app.include_router(people.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(statuses.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(users.router, prefix="/api")
