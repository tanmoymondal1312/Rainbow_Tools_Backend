from django.urls import path
from . import views

urlpatterns = [
    path('api/analyze-metadata/', views.analyze_metadata, name='mm_analyze_metadata'),
    path('api/image-to-prompt/', views.image_to_prompt, name='mm_image_to_prompt'),
    path('api/render-eps/', views.render_eps, name='mm_render_eps'),
]
