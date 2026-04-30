from django.urls import path
from .views import remove_background, InhanceImages, ExtractTextsFromImages, reduce_image_size_view

urlpatterns = [
    path('remove-bg/',           remove_background,      name='remove_background'),
    path('enhance-images/',      InhanceImages,          name='inhance_images'),
    path('extract-texts/',       ExtractTextsFromImages, name='extract_texts'),
    path('reduce-images-size/',  reduce_image_size_view, name='reduce_image_size'),
]
