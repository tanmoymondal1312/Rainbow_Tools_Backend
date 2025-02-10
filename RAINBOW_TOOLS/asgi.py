

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import web_socket.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'RAINBOW_TOOLS.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            web_socket.routing.websocket_urlpatterns
        )
    ),
})
