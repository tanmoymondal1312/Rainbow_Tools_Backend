from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.firebase_login, name='auth_login'),
    path('logout/', views.firebase_logout, name='auth_logout'),
    path('user/', views.firebase_user, name='auth_user'),
    path('csrf/', views.csrf_token_view, name='auth_csrf'),
]
