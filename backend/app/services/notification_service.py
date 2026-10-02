from uuid import UUID

from backend.app.models.notification import Notification


NOTIFICATION_TYPES = {
    "FUNDING",
    "PATENT",
    "TECHNOLOGY",
    "RESEARCH_TREND",
    "COMMERCIALIZATION",
    "PLATFORM",
}

PRIORITIES = {
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
}


def create_notification(
    session,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    related_module: str | None = None,
    related_record_id: str | None = None,
    priority: str = "NORMAL",
) -> Notification:
    """
    Create a notification for a user.

    Duplicate notifications for the same user,
    type, module and related record are avoided.
    """

    notification_type = notification_type.upper()
    priority = priority.upper()

    if notification_type not in NOTIFICATION_TYPES:
        raise ValueError(
            f"Invalid notification type: {notification_type}"
        )

    if priority not in PRIORITIES:
        raise ValueError(
            f"Invalid notification priority: {priority}"
        )

    existing = (
        session.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.notification_type
            == notification_type,
            Notification.related_module
            == related_module,
            Notification.related_record_id
            == related_record_id,
        )
        .first()
    )

    if existing:
        return existing

    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_module=related_module,
        related_record_id=related_record_id,
        priority=priority,
    )

    session.add(notification)
    session.commit()
    session.refresh(notification)

    return notification


def get_user_notifications(
    session,
    user_id: UUID,
    unread_only: bool = False,
    notification_type: str | None = None,
) -> list[Notification]:
    """
    Return notifications belonging only to the requested user.
    """

    query = (
        session.query(Notification)
        .filter(Notification.user_id == user_id)
    )

    if unread_only:
        query = query.filter(
            Notification.is_read.is_(False)
        )

    if notification_type:
        query = query.filter(
            Notification.notification_type
            == notification_type.upper()
        )

    return (
        query
        .order_by(Notification.created_at.desc())
        .all()
    )


def get_unread_count(
    session,
    user_id: UUID,
) -> int:
    """
    Return the number of unread notifications
    belonging to the requested user.
    """

    return (
        session.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .count()
    )


def mark_notification_read(
    session,
    user_id: UUID,
    notification_id: UUID,
) -> Notification | None:
    """
    Mark one notification as read.

    The user_id check ensures users cannot
    modify another user's notification.
    """

    notification = (
        session.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )

    if not notification:
        return None

    notification.is_read = True

    session.commit()
    session.refresh(notification)

    return notification


def mark_all_notifications_read(
    session,
    user_id: UUID,
) -> int:
    """
    Mark all notifications belonging to a user as read.

    Returns the number of notifications updated.
    """

    notifications = (
        session.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .all()
    )

    for notification in notifications:
        notification.is_read = True

    session.commit()

    return len(notifications)

def _normalize_text(value: str | None) -> str:
    """Normalize text for simple case-insensitive matching."""

    if not value:
        return ""

    return " ".join(value.lower().split())


def _contains_match(
    profile_terms: list[str],
    content: str,
) -> bool:
    """
    Return True when at least one profile term
    appears in the notification content.
    """

    normalized_content = _normalize_text(content)

    for term in profile_terms:
        normalized_term = _normalize_text(term)

        if normalized_term and normalized_term in normalized_content:
            return True

    return False


def is_notification_relevant(
    research_profile,
    content: str,
) -> bool:
    """
    Check whether notification content is relevant
    to a researcher's profile.

    Matching considers:
    - research domain
    - research interests
    - profile keywords
    - technology areas
    """

    if not research_profile:
        return False

    content = _normalize_text(content)

    if not content:
        return False

    # Research domain is a strong relevance signal.
    domain = _normalize_text(
        research_profile.research_domain
    )

    if domain and domain in content:
        return True

    # Research interests can contain multiple concepts.
    interests = _normalize_text(
        research_profile.research_interests
    )

    if interests:
        interest_terms = [
            term.strip()
            for term in interests.replace(
                ";", ","
            ).split(",")
            if term.strip()
        ]

        if _contains_match(
            interest_terms,
            content,
        ):
            return True

    # Explicit profile keywords.
    keyword_terms = [
        keyword.name
        for keyword in (
            research_profile.keywords or []
        )
        if keyword.name
    ]

    if _contains_match(
        keyword_terms,
        content,
    ):
        return True

    # Technology areas.
    technology_terms = [
        technology.name
        for technology in (
            research_profile.technology_areas or []
        )
        if technology.name
    ]

    if _contains_match(
        technology_terms,
        content,
    ):
        return True

    return False

def create_relevant_notification(
    session,
    user,
    notification_type: str,
    title: str,
    message: str,
    related_module: str | None = None,
    related_record_id: str | None = None,
    priority: str = "NORMAL",
) -> Notification | None:
    """
    Create a notification only when the content is relevant
    to the user's research profile.

    PLATFORM notifications are always allowed because they
    are system-level notifications.
    """

    if notification_type.upper() == "PLATFORM":
        return create_notification(
            session=session,
            user_id=user.id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_module=related_module,
            related_record_id=related_record_id,
            priority=priority,
        )

    research_profile = getattr(
        user,
        "research_profile",
        None,
    )

    content = f"{title} {message}"

    if not is_notification_relevant(
        research_profile,
        content,
    ):
        return None

    return create_notification(
        session=session,
        user_id=user.id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_module=related_module,
        related_record_id=related_record_id,
        priority=priority,
    )

def notify_user_about_funding(
    session,
    user,
    funding_opportunity,
) -> Notification | None:
    """
    Create a funding notification when the opportunity
    is relevant to the user's research profile.
    """

    deadline = (
        funding_opportunity.close_date.strftime("%d %b %Y")
        if funding_opportunity.close_date
        else "Deadline not specified"
    )

    research_area = (
        funding_opportunity.research_area
        or funding_opportunity.funding_category
        or "Research funding"
    )

    description = (
        funding_opportunity.description
        or "A new funding opportunity matches your research profile."
    )

    message = (
        f"{funding_opportunity.title} is available from "
        f"{funding_opportunity.agency or 'the funding organization'}. "
        f"Research area: {research_area}. "
        f"Deadline: {deadline}. "
        f"{description}"
    )

    if funding_opportunity.official_link:
        message += (
            f" Apply/View details: "
            f"{funding_opportunity.official_link}"
        )

    return create_relevant_notification(
        session=session,
        user=user,
        notification_type="FUNDING",
        title=f"New Funding Opportunity: {funding_opportunity.title}",
        message=message,
        related_module="funding",
        related_record_id=str(funding_opportunity.id),
        priority="HIGH" if funding_opportunity.close_date else "NORMAL",
    )

def notify_user_about_patent(
    session,
    user,
    patent,
) -> Notification | None:
    """
    Create a patent notification when the patent
    is relevant to the user's research profile.
    """

    filing_date = (
        patent.filing_date.strftime("%d %b %Y")
        if patent.filing_date
        else "Filing date not specified"
    )

    technology_domain = (
        patent.technology_domain
        or "Technology domain not specified"
    )

    classification = (
        patent.classification
        or "Classification not specified"
    )

    message = (
        f"A relevant patent has been identified: "
        f"{patent.title}. "
        f"Assignee: {patent.assignee or 'Not specified'}. "
        f"Filing date: {filing_date}. "
        f"Technology domain: {technology_domain}. "
        f"Classification: {classification}. "
        f"Citations: {patent.citation_count or 0}. "
        f"Status: {patent.status or 'Not specified'}."
    )

    if patent.official_link:
        message += (
            f" View patent: {patent.official_link}"
        )

    return create_relevant_notification(
        session=session,
        user=user,
        notification_type="PATENT",
        title=f"Relevant Patent: {patent.title}",
        message=message,
        related_module="patent",
        related_record_id=str(patent.id),
        priority="HIGH",
    )

def notify_user_about_technology(
    session,
    user,
    technology,
) -> Notification | None:
    """
    Create an emerging/developing technology notification
    when the technology is relevant to the user's profile.
    """

    status = (
        technology.emerging_status
        or "Developing"
    )

    score = (
        f"{technology.emerging_score:.1f}"
        if technology.emerging_score is not None
        else "Not available"
    )

    message = (
        f"{technology.technology_name} has been identified "
        f"as a {status} technology. "
        f"Technology domain: "
        f"{technology.technology_domain or 'Not specified'}. "
        f"Emerging score: {score}. "
        f"Research papers: "
        f"{technology.research_paper_count}. "
        f"Patents: {technology.patent_count}. "
        f"Citations: {technology.citation_count}. "
        f"Research growth: "
        f"{technology.research_growth_rate:.2f}%. "
        f"Patent growth: "
        f"{technology.patent_growth_rate:.2f}%."
    )

    if technology.description:
        message += (
            f" Description: {technology.description}"
        )

    return create_relevant_notification(
        session=session,
        user=user,
        notification_type="TECHNOLOGY",
        title=f"Emerging Technology: {technology.technology_name}",
        message=message,
        related_module="technology",
        related_record_id=str(technology.id),
        priority="HIGH",
    )

def notify_user_about_research_trend(
    session,
    user,
    trend: dict,
) -> Notification | None:
    """
    Create a research trend notification when a topic
    is relevant to the user's research profile.
    """

    topic = trend.get("topic")
    if not topic:
        return None

    status = trend.get("status", "Steady Growth")
    recent_papers = trend.get("recent_papers_2024_plus", 0)
    total_frequency = trend.get("total_frequency", 0)

    message = (
        f"The research topic '{topic}' is showing "
        f"{status.lower()}. "
        f"It appears in {total_frequency} research records, "
        f"with {recent_papers} papers from 2024 onward."
    )

    return create_relevant_notification(
        session=session,
        user=user,
        notification_type="RESEARCH_TREND",
        title=f"Research Trend Update: {topic}",
        message=message,
        related_module="research",
        related_record_id=topic,
        priority="HIGH" if status == "Accelerating" else "NORMAL",
    )

def notify_user_about_commercialization(
    session,
    user,
    opportunity: dict,
) -> Notification | None:
    """
    Create a commercialization notification when the
    opportunity is relevant to the user's research profile.
    """

    title = (
        opportunity.get("title")
        or opportunity.get("opportunity")
        or "Potential Commercialization Opportunity"
    )

    opportunity_type = (
        opportunity.get("type")
        or opportunity.get("opportunity_type")
        or "Commercialization"
    )

    evidence = (
        opportunity.get("evidence")
        or opportunity.get("description")
        or opportunity.get("reason")
        or "Supporting research and technology evidence identified."
    )

    message = (
        f"Potential {opportunity_type} opportunity identified: "
        f"{title}. "
        f"Supporting evidence: {evidence}. "
        f"This represents a potential opportunity and is not a guarantee."
    )

    return create_relevant_notification(
        session=session,
        user=user,
        notification_type="COMMERCIALIZATION",
        title=f"Potential Commercialization Opportunity: {title}",
        message=message,
        related_module="commercialization",
        related_record_id=str(
            opportunity.get("id")
            or opportunity.get("technology_id")
            or title
        ),
        priority="NORMAL",
    )

def notify_user_about_platform_event(
    session,
    user,
    title: str,
    message: str,
    related_module: str | None = None,
    related_record_id: str | None = None,
    priority: str = "NORMAL",
) -> Notification:
    """
    Create a system/platform notification for a user.
    """

    return create_notification(
        session=session,
        user_id=user.id,
        notification_type="PLATFORM",
        title=title,
        message=message,
        related_module=related_module,
        related_record_id=related_record_id,
        priority=priority,
    )

def notify_user_about_platform_event(
    session,
    user,
    title: str,
    message: str,
    related_module: str | None = None,
    related_record_id: str | None = None,
    priority: str = "NORMAL",
) -> Notification:
    """
    Create a system/platform notification for a user.
    """

    return create_notification(
        session=session,
        user_id=user.id,
        notification_type="PLATFORM",
        title=title,
        message=message,
        related_module=related_module,
        related_record_id=related_record_id,
        priority=priority,
    )