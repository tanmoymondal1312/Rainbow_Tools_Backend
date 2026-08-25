import json
import os
from pathlib import Path

from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

import firebase_admin
from firebase_admin import auth as fb_auth, credentials

BASE_DIR = Path(__file__).resolve().parent.parent
SERVICE_ACCOUNT_PATH = BASE_DIR / 'firebase' / 'serviceAccount.json'

if not firebase_admin._apps:
    cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
    firebase_admin.initialize_app(cred)


def _get_or_create_user(uid, email, display_name):
    try:
        user = User.objects.get(username=uid)
        if display_name and user.first_name != display_name:
            user.first_name = display_name
            user.save(update_fields=['first_name'])
        return user
    except User.DoesNotExist:
        return User.objects.create_user(
            username=uid,
            email=email or f'{uid}@firebase.local',
            first_name=display_name or '',
        )


@csrf_exempt
@require_POST
def firebase_login(request):
    try:
        data = json.loads(request.body)
        id_token = data.get('idToken')
        if not id_token:
            return JsonResponse({'error': 'Missing idToken'}, status=400)

        decoded = fb_auth.verify_id_token(id_token)
        uid = decoded['uid']
        email = decoded.get('email', '')
        display_name = decoded.get('name', '')

        user = _get_or_create_user(uid, email, display_name)
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')

        return JsonResponse({
            'status': 'ok',
            'user': {
                'uid': uid,
                'email': email,
                'displayName': display_name,
            }
        })
    except fb_auth.InvalidIdTokenError:
        return JsonResponse({'error': 'Invalid Firebase ID token'}, status=401)
    except fb_auth.ExpiredIdTokenError:
        return JsonResponse({'error': 'Token expired'}, status=401)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def firebase_logout(request):
    logout(request)
    return JsonResponse({'status': 'ok'})


def firebase_user(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'user': {
                'uid': request.user.username,
                'email': request.user.email,
                'displayName': request.user.get_full_name() or request.user.username,
            }
        })
    return JsonResponse({'authenticated': False})


def csrf_token_view(request):
    return JsonResponse({'csrfToken': get_token(request)})
