"""
Django settings for codeplatform project.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config

import pymysql
pymysql.install_as_MySQLdb()

BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------------------------------------------
# SECURITY
# --------------------------------------------------------------------------

SECRET_KEY = config(
    "SECRET_KEY",
    default="django-insecure-change-this-secret-key"
)

DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda v: [s.strip() for s in v.split(",")]
)

# --------------------------------------------------------------------------
# APPLICATIONS
# --------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",

    "accounts",
    "questions",
    "submissions",
]

AUTH_USER_MODEL = "accounts.User"

# --------------------------------------------------------------------------
# MIDDLEWARE
# --------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "codeplatform.urls"

# --------------------------------------------------------------------------
# TEMPLATES
# --------------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "codeplatform.wsgi.application"

# --------------------------------------------------------------------------
# DATABASE
# --------------------------------------------------------------------------



DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT"),
    }
}
# --------------------------------------------------------------------------
# PASSWORD VALIDATION
# --------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# --------------------------------------------------------------------------
# INTERNATIONALIZATION
# --------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True

# --------------------------------------------------------------------------
# STATIC FILES
# --------------------------------------------------------------------------

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
)

# --------------------------------------------------------------------------
# DEFAULT PRIMARY KEY
# --------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# DJANGO REST FRAMEWORK
# --------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

# --------------------------------------------------------------------------
# SIMPLE JWT
# --------------------------------------------------------------------------

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = config(
    "CORS_ORIGINS",
    default="http://localhost:3000",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

CORS_ALLOW_CREDENTIALS = True