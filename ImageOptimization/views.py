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


# Directory to save Reduced images
IMG_SIZE_REDUCED_DIRS = os.path.join(settings.MEDIA_ROOT, 'reduced_images')
os.makedirs(IMG_SIZE_REDUCED_DIRS, exist_ok=True)


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



    




@csrf_exempt
def GetExtractedTextFile(request, fileName):
    """Retrieve and serve the extracted text file."""
    try:
        # Construct the full path to the text file
        file_path = os.path.join(EXTRACT_TEXTS_DIR, fileName)

        # Check if the file exists
        if not os.path.exists(file_path):
            return JsonResponse({'error': 'File not found'}, status=404)

        # Serve the file as a response
        return FileResponse(open(file_path, 'rb'), content_type='text/plain')

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)





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
            if len(image_files) > 5:
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







# Initialize EasyOCR reader
reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if available

EXTRACT_TEXTS_DIR = os.path.join(settings.MEDIA_ROOT, "extracted_texts")
os.makedirs(EXTRACT_TEXTS_DIR, exist_ok=True)  # Ensure directory exists

def calculate_y_threshold(results):
    """Calculate dynamic Y-threshold based on bounding box heights."""
    heights = [abs(bbox[0][1] - bbox[2][1]) for bbox, _, _ in results]
    return np.mean(heights) * 0.5 if heights else 10  # Default threshold

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

def extract_text_from_image(image_content):
    """Extract and group text from an image without saving the image."""
    results = reader.readtext(image_content)
    y_threshold = calculate_y_threshold(results)
    lines = group_text_into_lines(results, y_threshold)
    
    extracted_text = []
    for line in lines:
        line.sort(key=lambda x: x[0][0][0])  # Sort text by X-coordinate
        line_text = " ".join([text for _, text in line])
        extracted_text.append(line_text)

    return "\n".join(extracted_text)

def save_text_to_file(text):
    """Save extracted text to a uniquely named file."""
    unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.txt"
    file_path = os.path.join(EXTRACT_TEXTS_DIR, unique_name)

    with open(file_path, "w", encoding="utf-8") as file:
        file.write(text)

    return unique_name  # Return the generated filename

async def process_image(image):
    """Process image from memory, extract text, and save as .txt."""
    image_content = image.read()  # Read image data directly from memory
    extracted_text = await asyncio.to_thread(extract_text_from_image, image_content)
    return save_text_to_file(extracted_text)

@csrf_exempt
async def ExtractTextsFromImages(request):
    print("Image Get")
    """Extract text from uploaded images and return generated text file names."""
    if request.method == 'POST' and request.FILES.getlist('images'):
        tasks = [process_image(image) for image in request.FILES.getlist('images')]
        image_names = await asyncio.gather(*tasks)
        return JsonResponse({'image_names': image_names},status=200)


    return JsonResponse({'status': 'error', 'message': 'No images uploaded'}, status=400)






import os
import subprocess
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# Create necessary directories once
upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
IMG_SIZE_REDUCED_DIRS = os.path.join(settings.MEDIA_ROOT, "reduced_images")

os.makedirs(upload_dir, exist_ok=True)
os.makedirs(IMG_SIZE_REDUCED_DIRS, exist_ok=True)


@csrf_exempt
def reduce_image_size_view(request):
    print("Received request:", request)
    try:
        print("Request method:", request.method)
        print("Request POST data:", request.POST)
        print("Request FILES data:", request.FILES)

        if request.method != "POST":
            print("Invalid method:", request.method)
            return JsonResponse({"error": "Only POST method is allowed"}, status=405)

        if not request.FILES:
            print("No files received")
            return JsonResponse({"error": "No image files provided"}, status=400)

        try:
            target_sizes = request.POST.getlist("target_size")
            print("Raw target sizes received:", target_sizes)
            
            if not target_sizes:
                print("No target sizes provided")
                return JsonResponse({"error": "Invalid or missing target size"}, status=400)

            # Remove extra quotes and spaces
            target_sizes = [size.strip('"').strip() for size in target_sizes]

            # Ensure all values are numeric
            if any(not size.isdigit() for size in target_sizes):
                print("Invalid target sizes (non-numeric detected):", target_sizes)
                return JsonResponse({"error": "Invalid or missing target size"}, status=400)

            target_sizes = [int(size) for size in target_sizes]
            print("Converted target sizes:", target_sizes)
        except Exception as e:
            print("Error processing target sizes:", e)
            return JsonResponse({"error": "Error processing target sizes"}, status=400)


        images = request.FILES.getlist("image")
        print("Received images:", [img.name for img in images])
        print("Total images received:", len(images))
        print("Total target sizes received:", len(target_sizes))

        if len(images) != len(target_sizes):
            print("Mismatch in image and target size count")
            return JsonResponse({"error": "Number of images and target sizes must match"}, status=400)

        output_urls = []
        for image, target_size in zip(images, target_sizes):
            try:
                image_name = image.name
                input_path = os.path.join(settings.MEDIA_ROOT, "uploads", image_name)
                output_path = os.path.join(settings.MEDIA_ROOT, "reduced_images", image_name)
                print(f"Processing image: {image_name}, input path: {input_path}, target size: {target_size}")

                with open(input_path, "wb") as f:
                    for chunk in image.chunks():
                        f.write(chunk)
                print(f"Saved uploaded image: {input_path}")

                if compress_image(input_path, output_path, target_size):
                    output_urls.append({
                        "image": image_name,
                        "url": request.build_absolute_uri(settings.MEDIA_URL + f"reduced_images/{image_name}")
                    })
                    print(f"Image compressed successfully: {output_path}")
                else:
                    print(f"Failed to compress image: {image_name}")
            except Exception as e:
                print(f"Error processing image {image_name}: {e}")
                return JsonResponse({"error": f"Error processing image {image_name}"}, status=500)

        print("Final output URLs:", output_urls)
        return JsonResponse({"reduced_images": output_urls})
    except Exception as e:
        print("Unexpected error:", e)
        return JsonResponse({"error": "Unexpected server error"}, status=500)



def compress_image(input_path, output_path, target_size_kb):
    """Compress image while maintaining quality and reducing PNG efficiently."""
    target_size = target_size_kb * 1024  # Convert KB to bytes

    if not os.path.exists(input_path):
        return False

    image = Image.open(input_path)
    original_format = image.format
    extension = os.path.splitext(input_path)[1].lower()

    # Convert unsupported formats to JPEG
    if original_format not in ["JPEG", "PNG", "WEBP"]:
        original_format = "JPEG"
        extension = ".jpg"

    output_path = os.path.splitext(output_path)[0] + extension

    # Skip compression if already smaller
    if os.path.getsize(input_path) <= target_size:
        image.save(output_path, format=original_format)
        return True

    # Handle PNG Compression separately using pngquant
    if original_format == "PNG":
        return compress_png(input_path, output_path, target_size_kb)

    # Set initial quality
    quality = 95 if original_format in ["JPEG", "WEBP"] else None
    optimized = True if original_format in ["JPEG", "WEBP"] else False

    # Save first attempt
    image.save(output_path, format=original_format, quality=quality, optimize=optimized)

    # Iteratively reduce size
    while os.path.exists(output_path) and os.path.getsize(output_path) > target_size:
        if quality is not None and quality <= 10:
            break

        if quality is not None:
            quality -= 5
        else:
            # Resize PNG for further reduction
            width, height = image.size
            image = image.resize((int(width * 0.95), int(height * 0.95)), Image.LANCZOS)

        image.save(output_path, format=original_format, quality=quality, optimize=optimized)

    return True


def compress_png(input_path, output_path, target_size_kb):
    """Use pngquant for better PNG compression, with fallback."""
    try:
        subprocess.run(
            ["pngquant", "--force", "--quality=60-80", "--output", output_path, input_path],
            check=True
        )
        return os.path.exists(output_path) and os.path.getsize(output_path) <= target_size_kb * 1024
    except FileNotFoundError:
        print("Warning: pngquant not found. Falling back to Pillow compression.")
        image = Image.open(input_path)
        image = image.convert("P")  # Convert to palette mode for better compression
        image.save(output_path, format="PNG", optimize=True)
        return os.path.exists(output_path)
