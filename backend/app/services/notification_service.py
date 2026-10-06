import re
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.notification import Notification
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
    in the User model.

    The existing User model contains research_domain but does not contain
    separate keyword or technology-interest fields.
    """

    # Platform notifications are explicitly targeted at the user.
    if not user.research_domain:
        return False

    user_domain = _normalize(user.research_domain)

    if not user_domain:
        return False

    searchable_values = [
        domain,
        technology,
        title,
        description,
    ]

    if keywords:
        searchable_values.extend(keywords)

    for value in searchable_values:
        normalized_value = _normalize(value)

        if not normalized_value:
            continue

        # Full phrase match.
        if user_domain in normalized_value:
            return True

        # Token overlap.
        user_tokens = _tokens(user_domain)
        event_tokens = _tokens(normalized_value)

        if user_tokens and event_tokens:
            overlap = user_tokens.intersection(event_tokens)

            if overlap:
                return True

    return False


def build_deduplication_key(
    user_id: uuid.UUID,
    notification_type: str,
    related_module: str | None,
    related_record_id: str | None,
) -> str:
    """
    Creates the unique identifier used to prevent duplicate notifications.

    For record-based alerts, the same user + type + module + record
    produces the same key.
    """

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

    notification_type = notification_type.upper()
    priority = priority.upper()

    if notification_type not in VALID_NOTIFICATION_TYPES:
        raise ValueError(
            f"Unsupported notification type: {notification_type}"
        )

    if priority not in VALID_PRIORITIES:
        raise ValueError(
            f"Unsupported notification priority: {priority}"
        )

    # Platform notifications are explicitly targeted and therefore
    # normally do not require research-domain relevance checking.
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
            Notification.deduplication_key == deduplication_key
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
        # Handles a race condition where another request created
        # the same notification between our SELECT and INSERT.
        db.rollback()

        return (
            db.query(Notification)
            .filter(
                Notification.deduplication_key == deduplication_key
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
    organization: str | None,
    domain: str | None,
    deadline: str | None,
    description: str | None,
    link: str | None = None,
    keywords: list[str] | None = None,
    priority: str = "HIGH",
):
    message_parts = [
        f"Funding opportunity: {opportunity_name}.",
    ]

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
        related_module="Module 4",
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
    assignee: str | None,
    filing_date: str | None,
    domain: str | None,
    classification: str | None,
    citation_count: int | None,
    link: str | None = None,
    keywords: list[str] | None = None,
):
    message_parts = [
        f"Patent monitoring alert: {title}.",
    ]

    if assignee:
        message_parts.append(f"Assignee: {assignee}.")

    if filing_date:
        message_parts.append(f"Filing date: {filing_date}.")

    if domain:
        message_parts.append(f"Domain: {domain}.")

    if classification:
        message_parts.append(f"Classification: {classification}.")

    if citation_count is not None:
        message_parts.append(
            f"Citations: {citation_count}."
        )

    return create_notification(
        db,
        user,
        notification_type="PATENT",
        title=f"Patent Alert: {title}",
        message=" ".join(message_parts),
        related_module="Module 5",
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
    technology_domain: str | None,
    emerging_score: float | None,
    emerging_status: str | None,
    research_growth_rate: float | None = None,
    patent_growth_rate: float | None = None,
    link: str | None = None,
):
    message_parts = [
        f"Technology intelligence alert for {technology_name}."
    ]

    if technology_domain:
        message_parts.append(
            f"Domain: {technology_domain}."
        )

    if emerging_status:
        message_parts.append(
            f"Status: {emerging_status}."
        )

    if emerging_score is not None:
        message_parts.append(
            f"Emerging score: {emerging_score:.2f}."
        )

    if research_growth_rate is not None:
        message_parts.append(
            f"Research growth: {research_growth_rate:.2f}%."
        )

    if patent_growth_rate is not None:
        message_parts.append(
            f"Patent growth: {patent_growth_rate:.2f}%."
        )

    return create_notification(
        db,
        user,
        notification_type="TECHNOLOGY",
        title=f"Emerging Technology: {technology_name}",
        message=" ".join(message_parts),
        related_module="Module 6",
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
    trend_direction: str,
    publication_activity: str | None,
    period: str | None,
    explanation: str | None,
    domain: str | None,
    link: str | None = None,
):
    message_parts = [
        f"Research trend detected for {topic}.",
        f"Trend direction: {trend_direction}.",
    ]

    if publication_activity:
        message_parts.append(
            f"Publication activity: {publication_activity}."
        )

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
        related_module="Module 3",
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
    opportunity_type: str,
    explanation: str | None,
    domain: str | None,
    link: str | None = None,
):
    message_parts = [
        f"Potential commercialization opportunity for {technology}.",
        f"Opportunity type: {opportunity_type}.",
    ]

    if explanation:
        message_parts.append(explanation)

    # Important: this wording avoids presenting the result as a guarantee.
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
        related_module="Module 8",
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
):
    return create_notification(
        db,
        user,
        notification_type="PLATFORM",
        title=title,
        message=message,
        related_module="Platform",
        related_record_id=related_record_id,
        priority=priority,
        target_url=target_url,
        check_relevance=False,
    )