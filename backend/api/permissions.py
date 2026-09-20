from rest_framework import permissions

class IsOrganizationOwner(permissions.BasePermission):
    """
    Custom permission to only allow organization owners to access certain views.
    """

    def has_permission(self, request, view):
        # Allow access if the user is authenticated and is an organization owner
        return request.user.is_authenticated and (
            request.method in permissions.SAFE_METHODS
            or request.user.role == 'organization'
        )
    def has_object_permission(self, request, view, obj):
        # Allow access if the user is the owner of the organization
        if request.method in permissions.SAFE_METHODS:
            return True
        organization = getattr(obj, 'organization', None) or getattr(obj, 'author', None)
        owner_id = organization.owner_id if organization is not None else obj.owner_id
        return owner_id == request.user.pk
