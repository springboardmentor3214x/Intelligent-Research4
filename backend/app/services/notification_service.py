import re
import uuid
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.notification import Notification, NotificationPreference
from backend.app.models.user import User


VALID_NOTIFICATION_TYPES = {
    "FUNDING",
    "PATENT",
    "TECHNOLOGY",
    "RESEARCH_TREND",
    "COMMERCIALIZATION",
    "PLATFORM",
}

VALID_PRIORITIES = {
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
}


def _normalize(value: str | None) -> str:
    if not value:
        return ""

    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\s]+", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value


def _tokens(value: str | None) -> set[str]:
    normalized = _normalize(value)

    if not normalized:
        return set()

    return {
        token
        for token in normalized.split()
        if len(token) >= 3
    }


def is_event_relevant_to_user(
    user: User,
    *,
    domain: str | None = None,
    technology: str | None = None,
    keywords: list[str] | None = None,
    title: str | None = None,
    description: str | None = None,
) -> bool:
    """
    Basic relevance matching using the information currently available
    in the User model and research profile.
    """
    searchable_values = [
        domain,
        technology,
        title,
        description,
    ]

    if keywords:
        searchable_values.extend(keywords)

    combined_event_text = " ".join([v for v in searchable_values if v])
    if not combined_event_text:
        return False

    normalized_event_text = _normalize(combined_event_text)
    event_tokens = _tokens(normalized_event_text)

    # 1. Match against user.research_domain if set
    if user.research_domain:
        user_domain = _normalize(user.research_domain)
        if user_domain in normalized_event_text:
            return True
        user_tokens = _tokens(user_domain)
        if user_tokens and event_tokens and user_tokens.intersection(event_tokens):
            return True

    # 2. Match against user's attached ResearchProfile if available
    research_profile = getattr(user, "research_profile", None)
    if research_profile:
        if research_profile.research_domain:
            prof_domain = _normalize(research_profile.research_domain)
            if prof_domain and (prof_domain in normalized_event_text or _tokens(prof_domain).intersection(event_tokens)):
                return True

        if research_profile.research_interests:
            interests = _normalize(research_profile.research_interests)
            if interests and (interests in normalized_event_text or _tokens(interests).intersection(event_tokens)):
                return True

        for kw in (research_profile.keywords or []):
            if kw.name and _normalize(kw.name) in normalized_event_text:
                return True

        for ta in (research_profile.technology_areas or []):
            if ta.name and _normalize(ta.name) in normalized_event_text:
                return True

    # Fallback: if user has no specified domain/profile, default to allowing notification
    if not user.research_domain and not research_profile:
        return True

    return False


def get_user_preferences(db: Session, user_id: uuid.UUID) -> NotificationPreference:
    """Get or create user notification preferences."""
    pref = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user_id)
        .first()
    )
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        try:
            db.commit()
            db.refresh(pref)
        except IntegrityError:
            db.rollback()
            pref = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == user_id)
                .first()
            )
    return pref


def is_notification_type_enabled_for_user(
    db: Session,
    user_id: uuid.UUID,
    notification_type: str,
) -> bool:
    """Check if the user has opted in to this category of notification."""
    pref = get_user_preferences(db, user_id)
    n_type = notification_type.upper()
    if n_type == "FUNDING":
        return pref.funding_enabled
    if n_type == "PATENT":
        return pref.patent_enabled
    if n_type == "TECHNOLOGY":
        return pref.technology_enabled
    if n_type in ("RESEARCH_TREND", "RESEARCH"):
        return pref.research_enabled
    if n_type == "COMMERCIALIZATION":
        return pref.commercialization_enabled
    if n_type == "PLATFORM":
        return pref.platform_enabled
    return True


def build_deduplication_key(
    user_id: uuid.UUID,
    notification_type: str,
    related_module: str | None,
    related_record_id: str | None,
) -> str:
    return ":".join(
        [
            str(user_id),
            notification_type.upper(),
            related_module or "NONE",
            related_record_id or "NONE",
        ]
    )


def create_notification(
    db: Session,
    user: User,
    *,
    notification_type: str,
    title: str,
    message: str,
    related_module: str | None = None,
    related_record_id: str | None = None,
    priority: str = "NORMAL",
    target_url: str | None = None,
    check_relevance: bool = True,
    domain: str | None = None,
    technology: str | None = None,
    keywords: list[str] | None = None,
    event_title: str | None = None,
    description: str | None = None,
) -> Notification | None:
    """
    Create a notification for a user, respecting preferences and deduplication.
    """
    notification_type = notification_type.upper()
    priority = priority.upper()

    if notification_type not in VALID_NOTIFICATION_TYPES:
        raise ValueError(f"Unsupported notification type: {notification_type}")

    if priority not in VALID_PRIORITIES:
        raise ValueError(f"Unsupported notification priority: {priority}")

    # Check user preferences first
    if not is_notification_type_enabled_for_user(db, user.id, notification_type):
        return None

    # Relevance check
    if check_relevance and notification_type != "PLATFORM":
        relevant = is_event_relevant_to_user(
            user,
            domain=domain,
            technology=technology,
            keywords=keywords,
            title=event_title or title,
            description=description,
        )
        if not relevant:
            return None

    deduplication_key = build_deduplication_key(
        user.id,
        notification_type,
        related_module,
        related_record_id,
    )

    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.deduplication_key == deduplication_key,
        )
        .first()
    )

    if existing:
        return existing

    notification = Notification(
        user_id=user.id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_module=related_module,
        related_record_id=related_record_id,
        priority=priority,
        target_url=target_url,
        deduplication_key=deduplication_key,
    )

    db.add(notification)
    try:
        db.commit()
        db.refresh(notification)
    except IntegrityError:
        db.rollback()
        return (
            db.query(Notification)
            .filter(
                Notification.user_id == user.id,
                Notification.deduplication_key == deduplication_key,
            )
            .first()
        )

    return notification


def create_funding_notification(
    db: Session,
    user: User,
    *,
    opportunity_id: str,
    opportunity_name: str,
    organization: str | None = None,
    domain: str | None = None,
    deadline: str | None = None,
    description: str | None = None,
    link: str | None = None,
    keywords: list[str] | None = None,
    priority: str = "HIGH",
) -> Notification | None:
    message_parts = [f"Funding opportunity: {opportunity_name}."]
    if organization:
        message_parts.append(f"Organization: {organization}.")
    if domain:
        message_parts.append(f"Domain: {domain}.")
    if deadline:
        message_parts.append(f"Deadline: {deadline}.")
    if description:
        message_parts.append(description)

    return create_notification(
        db,
        user,
        notification_type="FUNDING",
        title=f"New Funding Opportunity: {opportunity_name}",
        message=" ".join(message_parts),
        related_module="funding",
        related_record_id=str(opportunity_id),
        priority=priority,
        target_url=link,
        domain=domain,
        keywords=keywords,
        event_title=opportunity_name,
        description=description,
    )


def create_patent_notification(
    db: Session,
    user: User,
    *,
    patent_id: str,
    title: str,
    assignee: str | None = None,
    filing_date: str | None = None,
    domain: str | None = None,
    classification: str | None = None,
    citation_count: int | None = None,
    link: str | None = None,
    keywords: list[str] | None = None,
) -> Notification | None:
    message_parts = [f"Patent monitoring alert: {title}."]
    if assignee:
        message_parts.append(f"Assignee: {assignee}.")
    if filing_date:
        message_parts.append(f"Filing date: {filing_date}.")
    if domain:
        message_parts.append(f"Domain: {domain}.")
    if classification:
        message_parts.append(f"Classification: {classification}.")
    if citation_count is not None:
        message_parts.append(f"Citations: {citation_count}.")

    return create_notification(
        db,
        user,
        notification_type="PATENT",
        title=f"Patent Alert: {title}",
        message=" ".join(message_parts),
        related_module="patent",
        related_record_id=str(patent_id),
        priority="NORMAL",
        target_url=link,
        domain=domain,
        keywords=keywords,
        event_title=title,
    )


def create_technology_notification(
    db: Session,
    user: User,
    *,
    technology_id: str,
    technology_name: str,
    technology_domain: str | None = None,
    emerging_score: float | None = None,
    emerging_status: str | None = None,
    research_growth_rate: float | None = None,
    patent_growth_rate: float | None = None,
    link: str | None = None,
) -> Notification | None:
    message_parts = [f"Technology intelligence alert for {technology_name}."]
    if technology_domain:
        message_parts.append(f"Domain: {technology_domain}.")
    if emerging_status:
        message_parts.append(f"Status: {emerging_status}.")
    if emerging_score is not None:
        message_parts.append(f"Emerging score: {emerging_score:.2f}.")
    if research_growth_rate is not None:
        message_parts.append(f"Research growth: {research_growth_rate:.2f}%.")
    if patent_growth_rate is not None:
        message_parts.append(f"Patent growth: {patent_growth_rate:.2f}%.")

    return create_notification(
        db,
        user,
        notification_type="TECHNOLOGY",
        title=f"Emerging Technology: {technology_name}",
        message=" ".join(message_parts),
        related_module="technology",
        related_record_id=str(technology_id),
        priority="HIGH",
        target_url=link,
        domain=technology_domain,
        technology=technology_name,
        event_title=technology_name,
    )


def create_research_trend_notification(
    db: Session,
    user: User,
    *,
    trend_id: str,
    topic: str,
    trend_direction: str = "Growing",
    publication_activity: str | None = None,
    period: str | None = None,
    explanation: str | None = None,
    domain: str | None = None,
    link: str | None = None,
) -> Notification | None:
    message_parts = [
        f"Research trend detected for {topic}.",
        f"Trend direction: {trend_direction}.",
    ]
    if publication_activity:
        message_parts.append(f"Publication activity: {publication_activity}.")
    if period:
        message_parts.append(f"Period: {period}.")
    if explanation:
        message_parts.append(explanation)

    return create_notification(
        db,
        user,
        notification_type="RESEARCH_TREND",
        title=f"Research Trend Update: {topic}",
        message=" ".join(message_parts),
        related_module="research",
        related_record_id=str(trend_id),
        priority="NORMAL",
        target_url=link,
        domain=domain,
        technology=topic,
        event_title=topic,
        description=explanation,
    )


def create_commercialization_notification(
    db: Session,
    user: User,
    *,
    opportunity_id: str,
    technology: str,
    opportunity_type: str = "Commercialization",
    explanation: str | None = None,
    domain: str | None = None,
    link: str | None = None,
) -> Notification | None:
    message_parts = [
        f"Potential commercialization opportunity for {technology}.",
        f"Opportunity type: {opportunity_type}.",
    ]
    if explanation:
        message_parts.append(explanation)
    message_parts.append(
        "This is a potential opportunity identified by the platform "
        "and is not a guaranteed commercial outcome."
    )

    return create_notification(
        db,
        user,
        notification_type="COMMERCIALIZATION",
        title=f"Potential Commercialization Opportunity: {technology}",
        message=" ".join(message_parts),
        related_module="commercialization",
        related_record_id=str(opportunity_id),
        priority="HIGH",
        target_url=link,
        domain=domain,
        technology=technology,
        event_title=technology,
        description=explanation,
    )


def create_platform_notification(
    db: Session,
    user: User,
    *,
    title: str,
    message: str,
    related_record_id: str | None = None,
    priority: str = "NORMAL",
    target_url: str | None = None,
) -> Notification | None:
    return create_notification(
        db,
        user,
        notification_type="PLATFORM",
        title=title,
        message=message,
        related_module="platform",
        related_record_id=related_record_id,
        priority=priority,
        target_url=target_url,
        check_relevance=False,
    )


# Helper aliases for backwards compatibility with earlier module code
def notify_user_about_funding(session, user, funding_opportunity):
    deadline = (
        funding_opportunity.close_date.strftime("%d %b %Y")
        if funding_opportunity.close_date
        else "Deadline not specified"
    )
    return create_funding_notification(
        session,
        user,
        opportunity_id=str(funding_opportunity.id),
        opportunity_name=funding_opportunity.title,
        organization=funding_opportunity.agency,
        domain=funding_opportunity.research_area,
        deadline=deadline,
        description=funding_opportunity.description,
        link=funding_opportunity.official_link,
    )


def notify_user_about_patent(session, user, patent):
    filing_date = (
        patent.filing_date.strftime("%d %b %Y")
        if patent.filing_date
        else "Filing date not specified"
    )
    return create_patent_notification(
        session,
        user,
        patent_id=str(patent.id),
        title=patent.title,
        assignee=patent.assignee,
        filing_date=filing_date,
        domain=patent.technology_domain,
        classification=patent.classification,
        citation_count=patent.citation_count,
        link=patent.official_link,
    )


def notify_user_about_technology(session, user, technology):
    return create_technology_notification(
        session,
        user,
        technology_id=str(technology.id),
        technology_name=technology.technology_name,
        technology_domain=technology.technology_domain,
        emerging_score=technology.emerging_score,
        emerging_status=technology.emerging_status,
        research_growth_rate=technology.research_growth_rate,
        patent_growth_rate=technology.patent_growth_rate,
        link=None,
    )


def notify_user_about_research_trend(session, user, trend: dict):
    topic = trend.get("topic")
    if not topic:
        return None
    return create_research_trend_notification(
        session,
        user,
        trend_id=topic,
        topic=topic,
        trend_direction=trend.get("status", "Steady Growth"),
        explanation=f"Appears in {trend.get('total_frequency', 0)} records",
    )


def notify_user_about_commercialization(session, user, opportunity: dict):
    title = (
        opportunity.get("title")
        or opportunity.get("opportunity")
        or "Potential Commercialization Opportunity"
    )
    return create_commercialization_notification(
        session,
        user,
        opportunity_id=str(opportunity.get("id") or opportunity.get("technology_id") or title),
        technology=title,
        opportunity_type=opportunity.get("type", "Commercialization"),
        explanation=opportunity.get("evidence") or opportunity.get("description"),
    )


def notify_user_about_platform_event(session, user, title: str, message: str, related_module: str | None = None, related_record_id: str | None = None, priority: str = "NORMAL"):
    return create_platform_notification(
        session,
        user,
        title=title,
        message=message,
        related_record_id=related_record_id,
        priority=priority,
    )
