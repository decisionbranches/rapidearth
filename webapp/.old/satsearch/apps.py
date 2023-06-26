"""
Python script that is resposible for the listed apps being recognized and integrated by the django project.
"""

from django.apps import AppConfig

class SatsearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'satsearch'
