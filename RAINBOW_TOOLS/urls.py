from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .import views

urlpatterns = [
     path('connection-status/', views.connection_status, name='connection_status'),
    path('admin/', admin.site.urls),
    path('image-optimization/', include('ImageOptimization.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
