import { MetadataItem } from '../types';

export function exportToCsv(items: MetadataItem[], filename = 'microstock_metadata.csv') {
  if (!items || items.length === 0) return;

  const headers = [
    'Filename',
    'File Type',
    'Title',
    'Description',
    'Keywords',
    'Category',
    'Secondary Category',
    'Content Type',
    'Style',
    'Colors',
    'Orientation',
    'Background',
  ];

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const rows = items.map((item) => [
    escapeCsv(item.fileName),
    escapeCsv(item.fileType),
    escapeCsv(item.title || ''),
    escapeCsv(item.description || ''),
    escapeCsv(item.keywords ? item.keywords.join(', ') : ''),
    escapeCsv(item.primaryCategory || ''),
    escapeCsv(item.secondaryCategory || ''),
    escapeCsv(item.contentType || ''),
    escapeCsv(item.visualStyle || ''),
    escapeCsv(item.dominantColors ? item.dominantColors.join(', ') : ''),
    escapeCsv(item.technicalDetails?.orientation || 'Landscape'),
    escapeCsv(item.backgroundType || 'Isolated'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJson(items: MetadataItem[], filename = 'microstock_metadata.json') {
  if (!items || items.length === 0) return;

  const formattedData = items.map((item) => ({
    filename: item.fileName,
    fileType: item.fileType,
    title: item.title || '',
    description: item.description || '',
    keywords: item.keywords || [],
    category: item.primaryCategory || '',
    secondaryCategory: item.secondaryCategory || '',
    contentType: item.contentType || '',
    style: item.visualStyle || '',
    colors: item.dominantColors || [],
    orientation: item.technicalDetails?.orientation || 'Landscape',
    background: item.backgroundType || 'Isolated',
  }));

  const jsonString = JSON.stringify(formattedData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
