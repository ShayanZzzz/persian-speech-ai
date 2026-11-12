"""Account history queries shared by list and detail endpoints."""
import json
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import String, case, cast, func, literal, select, union_all

from src.models import MediaFile, TranscriptionHistory


def history_query(user_id):
    h, m = TranscriptionHistory, MediaFile
    video = func.lower(h.filename).regexp_match(r"\.(mp4|mov|mkv|webm|avi|mpeg|mpg)$")
    kind = case(
        (h.mode.like("tts:%"), "tts"),
        (h.mode == "video-export", "video"),
        (m.media_type.like("video/%"), "video"),
        (m.media_type.like("audio/%"), "stt"),
        (video, "video"),
        else_="stt",
    )
    # Keep historical numeric IDs in the legacy API; SQL uses strings for the union.
    saved = select(
        cast(h.id, String).label("id"), cast(m.public_id, String).label("public_id"),
        h.filename, h.language, h.text, h.duration_seconds, h.mode, h.segments,
        h.created_at, kind.label("conversion_type"),
    ).outerjoin(m, h.media_file_id == m.id).where(h.user_id == user_id)
    # Old TTS runs saved only MediaFile. The generated storage prefix identifies them.
    legacy = select(
        (literal("tts-") + cast(m.id, String)).label("id"),
        cast(m.public_id, String).label("public_id"), m.filename,
        m.detected_language.label("language"), literal("").label("text"),
        literal(None).label("duration_seconds"), literal("tts:legacy").label("mode"),
        literal(None).label("segments"), m.created_at,
        literal("tts").label("conversion_type"),
    ).where(
        m.user_id == user_id,
        m.storage_path.like(r"media_uploads/tts\_%", escape="\\"),
        ~select(h.id).where(h.media_file_id == m.id).exists(),
    )
    return union_all(saved, legacy).subquery()


def serialize_history(row):
    data = dict(row)
    data["id"] = int(data["id"]) if data["id"].isdigit() else data["id"]
    data["segments"] = json.loads(data["segments"]) if data["segments"] else []
    return data


def list_history(db, user_id, *, page=None, page_size=10, search="", kind="all",
                 language="", date_from=None, date_to=None, sort="newest"):
    rows = history_query(user_id)
    query = select(rows)
    if search.strip():
        term = search.strip().lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(func.lower(rows.c.filename).like(f"%{term}%", escape="\\"))
    if kind != "all":
        query = query.where(rows.c.conversion_type == kind)
    if language:
        query = query.where(rows.c.language == language)
    if date_from:
        query = query.where(rows.c.created_at >= datetime.combine(date_from, time.min, timezone.utc))
    if date_to:
        query = query.where(rows.c.created_at < datetime.combine(date_to + timedelta(days=1), time.min, timezone.utc))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    order = {
        "newest": rows.c.created_at.desc(), "oldest": rows.c.created_at.asc(),
        "name_asc": func.lower(rows.c.filename).asc(), "name_desc": func.lower(rows.c.filename).desc(),
    }[sort]
    query = query.order_by(order, rows.c.id.desc())
    if page is None:
        return [serialize_history(row) for row in db.execute(query.limit(50)).mappings()]
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    items = [serialize_history(row) for row in db.execute(query.offset((page - 1) * page_size).limit(page_size)).mappings()]
    languages = db.scalars(select(rows.c.language).where(rows.c.language.is_not(None)).distinct().order_by(rows.c.language)).all()
    return {"items": items, "total": total, "page": page, "pages": pages, "languages": languages}


def get_history_record(db, user_id, record_id):
    rows = history_query(user_id)
    row = db.execute(select(rows).where(rows.c.id == record_id)).mappings().first()
    return serialize_history(row) if row else None
