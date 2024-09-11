from django.shortcuts import render
import requests
from django.http import JsonResponse
# Create your views here.


from django.http import JsonResponse
import json

def test(request):
    if request.method == 'POST':
        try:
            # Read and decode JSON data from the request body
            data = json.loads(request.body.decode('utf-8'))
            
            # Log the received data
            print("Received Data:", data)
            
            # Respond with a JSON response
            return JsonResponse({'connected': "Connected", 'received_data': data}, status=200)
        except json.JSONDecodeError as e:
            # Handle JSON decoding errors
            print("Error decoding JSON:", e)
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
    else:
        # Handle unsupported HTTP methods
        return JsonResponse({'error': 'Method not allowed'}, status=405)
