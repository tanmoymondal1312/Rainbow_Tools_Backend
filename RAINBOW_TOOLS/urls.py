from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('tools/<slug:slug>/', views.tool_detail, name='tool_detail'),
    path('connection-status/', views.connection_status, name='connection_status'),
    path('admin/', admin.site.urls),
    path('image-optimization/', include('ImageOptimization.urls')),
    path('pdf-tools/',          include('PDFTools.urls')),
    path('microstock-metadata/', include('MicrostockMetadata.urls')),
]
