# In your Django `views.py` file
from django.http import JsonResponse


def connection_status(request):
    """
    Simple endpoint to check server connection.
    This will return a JSON response indicating the server is up.
    """
    try:
        # Perform any necessary actions to check the server, such as a database check.
        return JsonResponse({"status": "success", "message": "Server is up"}, status=200)
    except Exception as e:
        # If any error occurs (such as database connection error), return failure response
        return JsonResponse({"status": "error", "message": f"Server error: {str(e)}"}, status=500)
