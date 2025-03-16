

from pathlib import Path
import subprocess
import re

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-rthdnmdx8j^b0uwd7$1mm3sai10ow=ekkqbum588k&1kvv^jzn'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True


def get_specific_ipv4():
    try:
        # Run ipconfig command
        result = subprocess.run(["ipconfig"], capture_output=True, text=True, check=True)
        
        # Regular expression to find the required IPv4 address
        ipv4_pattern = r"IPv4 Address[. ]*: (192\.168\.\d+\.\d+)"
        
        # Search for the IPv4 address
        match = re.search(ipv4_pattern, result.stdout)
        
        return match.group(1) if match else None
    except subprocess.CalledProcessError:
        return None

# Get IPv4 address
ipv4_address = get_specific_ipv4()

# Ensure ALLOWED_HOSTS is valid
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.1.*']
if ipv4_address:
    ALLOWED_HOSTS.append(ipv4_address)

print("Allowed Hosts:", ALLOWED_HOSTS)

# Allow larger file uploads
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB (adjust as needed)
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB (adjust as needed)



# Application definition

INSTALLED_APPS = [
    'rest_framework',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ImageOptimization',
    'web_socket'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'RAINBOW_TOOLS.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

#WSGI_APPLICATION = 'RAINBOW_TOOLS.wsgi.application'
ASGI_APPLICATION = 'RAINBOW_TOOLS.asgi.application'



# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

import os

# Media files (user uploads)
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Static files (CSS, JS, etc.)
STATIC_URL = '/static/'

# For development: specify additional static file directories
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# For production: collect all static files into a single directory
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')




# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/


# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field


# Other settings ...

# Add this section for channel layers configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [('192.168.0.102', 6379)],  # Use the LAN IP of your Redis server
        },
    },
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
