from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('connection-status/', views.connection_status, name='connection_status'),
    path('admin/', admin.site.urls),
    path('image-optimization/', include('ImageOptimization.urls')),
]
