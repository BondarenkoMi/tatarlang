from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from events.models import Event
from organizations.models import Course, Organization
from tatarlang.cache import cache


@receiver(post_save, sender=Course)
@receiver(post_delete, sender=Course)
def invalidate_courses(sender, instance, **kwargs):
    organization_id = instance.organization_id
    transaction.on_commit(lambda: cache.delete('courses:all'))
    transaction.on_commit(lambda: cache.delete(f'courses:org:{organization_id}'))


@receiver(post_save, sender=Organization)
@receiver(post_delete, sender=Organization)
def invalidate_organizations(sender, instance, **kwargs):
    transaction.on_commit(lambda: cache.delete('organizations:list'))
    transaction.on_commit(lambda: cache.delete_pattern('courses:*'))


@receiver(post_save, sender=Event)
@receiver(post_delete, sender=Event)
def invalidate_events(sender, instance, **kwargs):
    transaction.on_commit(lambda: cache.delete('events:list'))
