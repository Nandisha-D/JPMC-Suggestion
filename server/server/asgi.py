import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from suggestserver.consumers import TestConsumer  # Replace with your actual app name

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

ws_patterns = [
    path('ws/test/', TestConsumer.as_asgi()),  # Add parentheses to as_asgi()
]

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(ws_patterns)
    ),
})
