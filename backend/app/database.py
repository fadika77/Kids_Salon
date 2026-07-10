import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Build from individual components if DATABASE_URL not set
    DB_SERVER   = os.getenv("DB_SERVER", "localhost")
    DB_NAME     = os.getenv("DB_NAME", "KidsBarbershop")
    DB_USER     = os.getenv("DB_USER", "sa")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_DRIVER   = os.getenv("DB_DRIVER", "ODBC+Driver+17+for+SQL+Server")

    DATABASE_URL = (
        f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}/{DB_NAME}"
        f"?driver={DB_DRIVER}"
    )

engine = create_engine(
    DATABASE_URL,
    fast_executemany=True,
    echo=False,
    # Azure SQL closes idle connections — without these two settings the app
    # hands out dead connections after quiet periods, causing 500 errors on
    # the first request. pre_ping tests each connection before use;
    # recycle replaces connections older than 25 minutes.
    pool_pre_ping=True,
    pool_recycle=1500,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
