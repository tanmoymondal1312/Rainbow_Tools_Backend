import io
import os
import uuid
from django.http import JsonResponse, FileResponse
from rembg import remove
from PIL import Image, ImageEnhance

from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from datetime import datetime
from asgiref.sync import sync_to_async
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

import easyocr
import numpy as np
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import asyncio



# Directory to save bgRemoved processed images
BG_REMOVED_DIR = os.path.join(settings.MEDIA_ROOT, 'bg_removed_images')
os.makedirs(BG_REMOVED_DIR, exist_ok=True)
# Directory to save Inhance processes images
INHANCE_DIR = os.path.join(settings.MEDIA_ROOT, 'inhance_images')
os.makedirs(INHANCE_DIR, exist_ok=True)

# Directory to save extracted texts
EXTRACT_TEXTS_DIRS = os.path.join(settings.MEDIA_ROOT, 'extracted_texts')
os.makedirs(EXTRACT_TEXTS_DIRS, exist_ok=True)



@csrf_exempt
def GetBgRemovedImages(request, imageNo):
    """
    Serve the background-removed image by its name.
    """
    try:
        # Construct the full path to the image
        image_path = os.path.join(BG_REMOVED_DIR, imageNo)
        print(imageNo)

        # Check if the image exists
        if not os.path.exists(image_path):
            return JsonResponse({'error': 'Image not found'}, status=404)

        # Serve the image as a file response
        return FileResponse(open(image_path, 'rb'), content_type='image/png')

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

@csrf_exempt
def GetInhanceImages(request, imageNo):
    print(imageNo)
    try:
        # Construct the full path to the image
        image_path = os.path.join(INHANCE_DIR, imageNo)
        print(imageNo)

        # Check if the image exists
        if not os.path.exists(image_path):
            return JsonResponse({'error': 'Image not found'}, status=404)

        # Serve the image as a file response
        return FileResponse(open(image_path, 'rb'), content_type='image/png')

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)




def GetExtractedTexts(request, text_no):
    """Retrieve an extracted text file."""
    file_path = os.path.join(EXTRACT_TEXTS_DIRS, text_no)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'), content_type='text/plain')
    return JsonResponse({'status': 'error', 'message': 'File not found'}, status=404)





@csrf_exempt
async def remove_background(request):
    """
    Asynchronous background removal for uploaded images.
    Server Recommendations for Production
    To maximize performance, deploy this code with:
    1.Gunicorn:
    Configure Gunicorn with multiple workers (e.g., --workers=4) and threads (e.g., --threads=2) to handle concurrent requests.
    Example: gunicorn your_project.wsgi:application --workers=4 --threads=2
    Asynchronous Worker Class:
    2.Use uvicorn or daphne for fully asynchronous Django applications.
    Example: uvicorn your_project.asgi:application --workers=4
    Load Balancer:
    3.Use a load balancer (e.g., Nginx) to distribute incoming traffic efficiently.
    """
    if request.method == 'POST':
        print("Request get")
        try:
            # Check if images are uploaded
            if 'images' not in request.FILES:
                return JsonResponse({'error': 'No image files provided'}, status=400)

            # Limit the number of uploaded files
            image_files = request.FILES.getlist('images')
            if len(image_files) > 5:
                return JsonResponse({'error': 'Cannot upload more than 5 images'}, status=400)

            saved_image_names = []

            for image_file in image_files:
                # Read and process each image asynchronously
                input_image = Image.open(image_file)

                # Convert the input image to bytes
                input_bytes = io.BytesIO()
                input_image.save(input_bytes, format=input_image.format)
                input_bytes = input_bytes.getvalue()
                output_bytes = await sync_to_async(remove)(input_bytes)
                # Convert the processed image bytes to an image
                output_image = Image.open(io.BytesIO(output_bytes))
                # Generate a unique filename
                unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.png"
                save_path = os.path.join(BG_REMOVED_DIR, unique_name)
                # Save the image asynchronously
                await sync_to_async(output_image.save)(save_path)
                # Append the image name to the response list
                saved_image_names.append(unique_name)

                # Print progress in the terminal
                print(f"Processed and saved image: {unique_name}")
            # Return the names of the processed images
            return JsonResponse({'image_names': saved_image_names}, status=200)

        except Exception as e:
            print(f"Error occurred: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)





@csrf_exempt
async def InhanceImages(request):
    """
    Asynchronous image enhancement for uploaded images.
    """
    if request.method == 'POST':
        try:
            # Check if images are uploaded
            if 'images' not in request.FILES:
                return JsonResponse({'error': 'No image files provided'}, status=400)

            # Limit the number of uploaded files
            image_files = request.FILES.getlist('images')
            if len(image_files) > 40:
                return JsonResponse({'error': 'Cannot upload more than 5 images'}, status=400)

            saved_image_names = []

            for image_file in image_files:
                # Read and process each image asynchronously
                input_image = Image.open(image_file)
                
                # Enhance the image
                sharpness_enhancer = ImageEnhance.Sharpness(input_image)
                sharp_image = sharpness_enhancer.enhance(2.0)
                color_enhancer = ImageEnhance.Color(sharp_image)
                color_image = color_enhancer.enhance(1.5)  # 1.5 enhances colors by 50%
                brightness_enhancer = ImageEnhance.Brightness(color_image)
                bright_image = brightness_enhancer.enhance(1.2)  # 1.2 increases brightness by 20%
                contrast_enhancer = ImageEnhance.Contrast(bright_image)
                enhanced_image = contrast_enhancer.enhance(1.3)  # 1.3 increases contrast by 30%

                # Generate a unique filename
                unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.png"
                save_path = os.path.join(INHANCE_DIR, unique_name)

                # Save the image asynchronously
                await sync_to_async(enhanced_image.save)(save_path)

                # Append the image name to the response list
                saved_image_names.append(unique_name)

                # Print progress in the terminal
                print(f"Enhanced and saved image: {unique_name}")

            # Return the names of the enhanced images
            return JsonResponse({'image_names': saved_image_names}, status=200)

        except Exception as e:
            print(f"Error occurred: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)







# Initialize EasyOCR Reader
reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if available

def calculate_y_threshold(results):
    """Calculate dynamic Y-threshold based on average height of bounding boxes."""
    heights = [abs(bbox[0][1] - bbox[2][1]) for bbox, _, _ in results]
    return np.mean(heights) * 0.5 if heights else 10  # Default threshold if empty

def group_text_into_lines(results, y_threshold):
    """Group detected text into lines based on Y-coordinate."""
    lines = []
    current_line = []
    previous_y = None

    for detection in results:
        bbox, text, _ = detection
        top_left = bbox[0]
        y = top_left[1]

        if previous_y is None or abs(y - previous_y) < y_threshold:
            current_line.append((bbox, text))
        else:
            lines.append(current_line)
            current_line = [(bbox, text)]

        previous_y = y

    if current_line:
        lines.append(current_line)

    return lines

def extract_text_from_image(image_path):
    """Extract and group text from an image."""
    results = reader.readtext(image_path)
    y_threshold = calculate_y_threshold(results)
    lines = group_text_into_lines(results, y_threshold)
    
    extracted_text = []
    for line in lines:
        line.sort(key=lambda x: x[0][0][0])
        line_text = " ".join([text for _, text in line])
        extracted_text.append(line_text)

    return "\n".join(extracted_text)

def save_text_to_file(text):
    """Save the extracted text to a uniquely named file."""
    unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.txt"
    file_path = os.path.join(EXTRACT_TEXTS_DIRS, unique_name)
    
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(text)
    
    return unique_name

async def process_image(image):
    temp_path = default_storage.save(image.name, ContentFile(image.read()))
    extracted_text = await asyncio.to_thread(extract_text_from_image, os.path.join(settings.MEDIA_ROOT, temp_path))
    return save_text_to_file(extracted_text)

@csrf_exempt
async def ExtractTextsFromImages(request):
    """Extract text from uploaded images asynchronously for multiple users."""
    if request.method == 'POST' and request.FILES.getlist('images'):
        tasks = [process_image(image) for image in request.FILES.getlist('images')]
        extracted_files = await asyncio.gather(*tasks)
        return JsonResponse({'status': 'success', 'files': extracted_files})
    
    return JsonResponse({'status': 'error', 'message': 'No images uploaded'}, status=400)


