import json
import logging
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

logger = logging.getLogger('auth_app')

BASE_DIR = Path(__file__).resolve().parent.parent
SERVICE_ACCOUNT_PATH = BASE_DIR / 'firebase' / 'serviceAccount.json'

if not firebase_admin._apps:
    cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
    firebase_admin.initialize_app(cred)
    logger.info('[AUTH] Firebase Admin initialized')


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
    logger.info('[AUTH LOGIN] POST /auth/login/ called')
    try:
        data = json.loads(request.body)
        id_token = data.get('idToken')
        if not id_token:
            logger.warning('[AUTH LOGIN] Missing idToken')
            return JsonResponse({'error': 'Missing idToken'}, status=400)

        logger.info('[AUTH LOGIN] Verifying token, length=%d', len(id_token))
        decoded = fb_auth.verify_id_token(id_token)
        uid = decoded['uid']
        email = decoded.get('email', '')
        display_name = decoded.get('name', '')

        logger.info('[AUTH LOGIN] Token verified: uid=%s email=%s name=%s', uid, email, display_name)
        user = _get_or_create_user(uid, email, display_name)
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        logger.info('[AUTH LOGIN] Login successful for uid=%s', uid)

        return JsonResponse({
            'status': 'ok',
            'user': {
                'uid': uid,
                'email': email,
                'displayName': display_name,
            }
        })
    except fb_auth.InvalidIdTokenError as e:
        logger.error('[AUTH LOGIN] InvalidIdTokenError: %s', e)
        return JsonResponse({'error': 'Invalid Firebase ID token'}, status=401)
    except fb_auth.ExpiredIdTokenError as e:
        logger.error('[AUTH LOGIN] ExpiredIdTokenError: %s', e)
        return JsonResponse({'error': 'Token expired'}, status=401)
    except Exception as e:
        logger.exception('[AUTH LOGIN] Unexpected error: %s', e)
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
