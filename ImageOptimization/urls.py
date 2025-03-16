from django.urls import path
from .views import remove_background,GetBgRemovedImages,InhanceImages,GetInhanceImages,ExtractTextsFromImages,GetExtractedTextFile,reduce_image_size_view

urlpatterns = [
    path('remove-bg/', remove_background, name='remove_background'),
    path('get_bg_removed_images/<str:imageNo>', GetBgRemovedImages),
    path('enhance-images/',InhanceImages,name = "inhance_images"),
    path('get_enhance_images/<str:imageNo>',GetInhanceImages),
    path('extract-texts/',ExtractTextsFromImages,name = "extract_texts"),
    path('get_extracted_texts/<str:fileName>',GetExtractedTextFile),
    path('reduce-images-size/',reduce_image_size_view,name = "reduce_image_size"),


]
