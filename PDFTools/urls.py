from django.urls import path
from .views import convert_pdf_to_docx, optimize_pdf

urlpatterns = [
    path('convert-to-docx/', convert_pdf_to_docx, name='convert_pdf_to_docx'),
    path('optimize/',         optimize_pdf,        name='optimize_pdf'),
]
