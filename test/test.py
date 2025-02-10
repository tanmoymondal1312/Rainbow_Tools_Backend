from rembg import remove
from PIL import Image
import numpy as np
import os
import uuid


input_img_path = r"E:\PROGRAMMING\DJANGOOOOOOOOOOOOOO\RAINBOW TOOLS\RAINBOW_TOOLS\test\\tiger.jpg"


img = Image.open(input_img_path)
img_array = np.array(img)
result = remove(img_array)

unique_name = f"rbgt_{uuid.uuid4()}.png"

# Define the output folder and file path
output_folder = r"E:\PROGRAMMING\DJANGOOOOOOOOOOOOOO\RAINBOW TOOLS\RAINBOW_TOOLS\test\\"
output_img_path = os.path.join(output_folder, unique_name)

# Save the processed image to the local file system
processed_image = Image.fromarray(result)
processed_image.save(output_img_path, format='PNG')

print(f"Processed image saved at: {output_img_path}")


