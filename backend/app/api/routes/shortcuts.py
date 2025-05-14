from fastapi import APIRouter

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.core.config import default_shortcuts
from app.models import ShortcutsPublic


router = APIRouter(prefix="/shortcuts", tags=["shortcuts"])


@router.get("/")
def get_shortcuts(*, current_user: CurrentUser) -> ShortcutsPublic:
    """
    Get the shortcuts for the current user.
    """
    if not current_user.shortcuts:
        return ShortcutsPublic(**default_shortcuts)
    return current_user.shortcuts


@router.post("/")
def set_shortcuts(
    *, shortcuts: ShortcutsPublic, current_user: CurrentUser, session: SessionDep
) -> ShortcutsPublic:
    """
    Set the shortcuts for the current user.
    """
    if not current_user.shortcuts:
        current_user.shortcuts = crud.create_shortcuts(
            session=session,
            shortcuts_mapping=shortcuts,
            owner_id=current_user.id,
        )
    else:
        current_user.shortcuts = crud.update_shortcuts(
            session=session,
            db_shortcut=current_user.shortcuts,
            shortcuts_mapping=shortcuts,
        )

    return current_user.shortcuts


@router.delete("/")
def delete_shortcuts(
    *, current_user: CurrentUser, session: SessionDep
) -> ShortcutsPublic:
    """
    Delete the shortcuts for the current user.
    """
    if not current_user.shortcuts:
        return ShortcutsPublic(**default_shortcuts)

    crud.delete_shortcuts(session=session, db_shortcut=current_user.shortcuts)

    return ShortcutsPublic(**default_shortcuts)
