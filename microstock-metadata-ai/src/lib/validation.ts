import { AppSettings, PlatformId, QualityScore, ValidationReport, VisualAnalysisData } from '../types';
import { PLATFORMS } from './platforms';

export function sanitizeAndValidateMetadata(
  title: string,
  description: string,
  keywords: string[],
  settings: AppSettings,
  maxAllowedKeywords: number = 49
): {
  cleanTitle: string;
  cleanDescription: string;
  cleanKeywords: string[];
  qualityScore: QualityScore;
  report: ValidationReport;
} {
  const issues: string[] = [];
  let duplicatesRemoved = 0;
  let prohibitedRemoved = 0;

  // 1. Prohibited words list
  const prohibitedList = settings.prohibitedWordsEnabled
    ? settings.prohibitedWordsText
        .toLowerCase()
        .split(/[,;\n]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)
    : [];

  const isProhibited = (text: string) => {
    if (!prohibitedList.length) return false;
    const lower = text.toLowerCase();
    return prohibitedList.some((p) => {
      const regex = new RegExp(`\\b${escapeRegex(p)}\\b`, 'i');
      return regex.test(lower);
    });
  };

  // 2. Clean Title
  let cleanTitle = title.trim().replace(/\s+/g, ' ');
  
  // Clean generic starting boilerplate if accidentally generated (e.g. "EPS Vector of ...", "Vector illustration of ...")
  const genericPrefixRegex = /^(eps\s+vector\s+(of|with|illustration|graphic)?|vector\s+(illustration\s+of|artwork\s+of|graphic\s+of|of|isolated|design\s+of)?|illustration\s+(of|with)?|graphic\s+design\s+(of)?|stock\s+vector\s+(of)?)\s+/i;
  if (genericPrefixRegex.test(cleanTitle)) {
    const stripped = cleanTitle.replace(genericPrefixRegex, '').trim();
    if (stripped.length > 5) {
      // Capitalize first letter
      cleanTitle = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    }
  }

  if (prohibitedList.length) {
    prohibitedList.forEach((pw) => {
      const regex = new RegExp(`\\b${escapeRegex(pw)}\\b`, 'gi');
      if (regex.test(cleanTitle)) {
        cleanTitle = cleanTitle.replace(regex, '').replace(/\s+/g, ' ').trim();
        prohibitedRemoved++;
      }
    });
  }

  const titleWords = cleanTitle ? cleanTitle.split(/\s+/).filter(Boolean) : [];
  if (titleWords.length < settings.minTitleWords) {
    issues.push(`Title has ${titleWords.length} words (minimum requested: ${settings.minTitleWords})`);
  }
  if (titleWords.length > settings.maxTitleWords) {
    issues.push(`Title has ${titleWords.length} words (maximum requested: ${settings.maxTitleWords})`);
  }

  // 3. Clean Description
  let cleanDescription = description.trim().replace(/\s+/g, ' ');
  if (prohibitedList.length) {
    prohibitedList.forEach((pw) => {
      const regex = new RegExp(`\\b${escapeRegex(pw)}\\b`, 'gi');
      if (regex.test(cleanDescription)) {
        cleanDescription = cleanDescription.replace(regex, '').replace(/\s+/g, ' ').trim();
        prohibitedRemoved++;
      }
    });
  }

  const descWords = cleanDescription ? cleanDescription.split(/\s+/).filter(Boolean) : [];
  if (descWords.length < settings.minDescriptionWords) {
    issues.push(`Description has ${descWords.length} words (minimum requested: ${settings.minDescriptionWords})`);
  }

  // 4. Clean Keywords
  const seenKeywords = new Set<string>();
  const cleanKeywords: string[] = [];

  for (const rawKw of keywords) {
    let kw = rawKw.trim().toLowerCase();
    // remove punctuation except hyphens/spaces
    kw = kw.replace(/^[,\.\-_:;]+|[,\.\-_:;]+$/g, '').trim();

    if (!kw) continue;

    // Check prohibited
    if (isProhibited(kw)) {
      prohibitedRemoved++;
      continue;
    }

    // Single word check if strictly enabled
    if (settings.singleWordKeywords && kw.includes(' ')) {
      // Break into single words
      const subWords = kw.split(/\s+/).filter((w) => w.length > 2);
      for (const sw of subWords) {
        if (!seenKeywords.has(sw) && !isProhibited(sw)) {
          seenKeywords.add(sw);
          cleanKeywords.push(sw);
        } else {
          duplicatesRemoved++;
        }
      }
      continue;
    }

    // Deduplication
    if (seenKeywords.has(kw)) {
      duplicatesRemoved++;
      continue;
    }

    seenKeywords.add(kw);
    cleanKeywords.push(kw);

    if (cleanKeywords.length >= maxAllowedKeywords) {
      break;
    }
  }

  if (cleanKeywords.length < settings.minKeywords) {
    issues.push(`Keyword count (${cleanKeywords.length}) is below target min (${settings.minKeywords})`);
  }

  // Calculate dynamic Quality Scores locally
  let accuracy = 96;
  if (prohibitedRemoved > 0) accuracy -= Math.min(6, prohibitedRemoved * 2);
  if (cleanKeywords.length < 15) accuracy -= 8;

  let relevance = 94;
  if (duplicatesRemoved > 0) relevance -= Math.min(8, duplicatesRemoved * 1.5);
  if (titleWords.length >= settings.minTitleWords && titleWords.length <= settings.maxTitleWords) {
    relevance += 2;
  } else {
    relevance -= 4;
  }

  let seoPotential = 91;
  const kwRatio = Math.min(1, cleanKeywords.length / Math.min(49, settings.maxKeywords));
  seoPotential = Math.round(75 + kwRatio * 23);
  if (cleanKeywords.length >= 40) seoPotential = Math.min(99, seoPotential + 2);

  // Clamp scores
  accuracy = Math.max(60, Math.min(99, Math.round(accuracy)));
  relevance = Math.max(60, Math.min(99, Math.round(relevance)));
  seoPotential = Math.max(60, Math.min(99, Math.round(seoPotential)));

  const report: ValidationReport = {
    valid: issues.length === 0,
    issues,
    duplicatesRemoved,
    prohibitedRemoved,
    keywordCount: cleanKeywords.length,
    titleWordCount: titleWords.length,
    descriptionWordCount: descWords.length,
  };

  const qualityScore: QualityScore = {
    accuracy,
    relevance,
    seoPotential,
  };

  return {
    cleanTitle,
    cleanDescription,
    cleanKeywords,
    qualityScore,
    report,
  };
}

/**
 * Adapt metadata for a target platform using existing visual analysis data (0 AI calls)
 */
export function adaptMetadataForPlatform(
  analysis: VisualAnalysisData,
  baseMetadata: {
    title: string;
    description: string;
    keywords: string[];
    category?: string;
    secondary_category?: string;
  },
  platform: PlatformId,
  settings: AppSettings
) {
  const platformConfig = PLATFORMS[platform] || PLATFORMS['adobe-stock'];
  const maxKeywords = Math.min(settings.maxKeywords, platformConfig.maxKeywords);

  // 1. Gather all potential keywords in priority order
  const rawList: string[] = [];

  // Priority 1: Main subject words
  if (analysis.main_subject) {
    rawList.push(...analysis.main_subject.toLowerCase().split(/\s+/));
  }

  // Priority 2: Visible text words (if any text was visibly detected)
  if (analysis.visible_text && analysis.visible_text.length > 0) {
    analysis.visible_text.forEach((txt) => {
      rawList.push(...txt.toLowerCase().split(/\s+/));
    });
  }

  // Priority 3: Visible objects
  if (analysis.objects && analysis.objects.length > 0) {
    rawList.push(...analysis.objects.map((o) => o.toLowerCase()));
  }

  // Priority 4: Style & Content type
  if (analysis.style) rawList.push(analysis.style.toLowerCase());
  if (analysis.content_type) rawList.push(analysis.content_type.toLowerCase());
  if (platform === 'vecteezy' || analysis.content_type.toLowerCase().includes('vector')) {
    rawList.push('vector', 'illustration', 'graphic', 'eps', 'editable', 'design asset');
  }

  // Priority 5: Theme
  if (analysis.theme) rawList.push(analysis.theme.toLowerCase());

  // Priority 6: Dominant colors
  if (analysis.colors && analysis.colors.length > 0) {
    rawList.push(...analysis.colors.map((c) => c.toLowerCase()));
  }

  // Priority 7: Base keywords generated from initial AI call
  if (baseMetadata.keywords && baseMetadata.keywords.length > 0) {
    rawList.push(...baseMetadata.keywords);
  }

  // Sanitize and limit to platform max
  const { cleanTitle, cleanDescription, cleanKeywords, qualityScore, report } =
    sanitizeAndValidateMetadata(
      baseMetadata.title,
      baseMetadata.description,
      rawList,
      settings,
      maxKeywords
    );

  return {
    title: cleanTitle,
    description: cleanDescription,
    keywords: cleanKeywords,
    primaryCategory: baseMetadata.category || 'Graphic Resources',
    secondaryCategory: baseMetadata.secondary_category || 'Illustration',
    qualityScore,
    validation: report,
  };
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
