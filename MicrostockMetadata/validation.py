import re


def _escape_regex(string):
    return re.sub(r'[.*+?^${}()|[\]\\]', r'\\$&', string)


def sanitize_and_validate_metadata(title, description, keywords, settings, max_allowed_keywords=49):
    issues = []
    duplicates_removed = 0
    prohibited_removed = 0

    prohibited_list = []
    if settings.get('prohibitedWordsEnabled'):
        prohibited_list = [
            w.strip().lower()
            for w in re.split(r'[,;\n]+', settings.get('prohibitedWordsText', ''))
            if w.strip()
        ]

    def is_prohibited(text):
        if not prohibited_list:
            return False
        lower = text.lower()
        return any(
            re.search(r'\b' + _escape_regex(p) + r'\b', lower)
            for p in prohibited_list
        )

    clean_title = re.sub(r'\s+', ' ', title.strip())
    generic_prefix_regex = re.compile(
        r'^(eps\s+vector\s+(of|with|illustration|graphic)?|'
        r'vector\s+(illustration\s+of|artwork\s+of|graphic\s+of|of|isolated|design\s+of)?|'
        r'illustration\s+(of|with)?|'
        r'graphic\s+design\s+(of)?|'
        r'stock\s+vector\s+(of)?)\s+',
        re.IGNORECASE,
    )
    m = generic_prefix_regex.match(clean_title)
    if m:
        stripped = clean_title[m.end():].strip()
        if len(stripped) > 5:
            clean_title = stripped[0].upper() + stripped[1:]

    for pw in prohibited_list:
        regex = re.compile(r'\b' + _escape_regex(pw) + r'\b', re.IGNORECASE)
        if regex.search(clean_title):
            clean_title = regex.sub('', clean_title)
            clean_title = re.sub(r'\s+', ' ', clean_title).strip()
            prohibited_removed += 1

    title_words = clean_title.split() if clean_title else []
    if len(title_words) < settings.get('minTitleWords', 8):
        issues.append(f"Title has {len(title_words)} words (minimum requested: {settings.get('minTitleWords', 8)})")
    if len(title_words) > settings.get('maxTitleWords', 22):
        issues.append(f"Title has {len(title_words)} words (maximum requested: {settings.get('maxTitleWords', 22)})")

    clean_description = re.sub(r'\s+', ' ', description.strip())
    for pw in prohibited_list:
        regex = re.compile(r'\b' + _escape_regex(pw) + r'\b', re.IGNORECASE)
        if regex.search(clean_description):
            clean_description = regex.sub('', clean_description)
            clean_description = re.sub(r'\s+', ' ', clean_description).strip()
            prohibited_removed += 1

    desc_words = clean_description.split() if clean_description else []
    if len(desc_words) < settings.get('minDescriptionWords', 18):
        issues.append(f"Description has {len(desc_words)} words (minimum requested: {settings.get('minDescriptionWords', 18)})")

    seen_keywords = set()
    clean_keywords = []

    for raw_kw in keywords:
        kw = raw_kw.strip().lower()
        kw = re.sub(r'^[,\.\-_:;]+|[,\.\-_:;]+$', '', kw).strip()
        if not kw:
            continue
        if is_prohibited(kw):
            prohibited_removed += 1
            continue
        if settings.get('singleWordKeywords') and ' ' in kw:
            sub_words = [w for w in kw.split() if len(w) > 2]
            for sw in sub_words:
                if sw not in seen_keywords and not is_prohibited(sw):
                    seen_keywords.add(sw)
                    clean_keywords.append(sw)
                else:
                    duplicates_removed += 1
            continue
        if kw in seen_keywords:
            duplicates_removed += 1
            continue
        seen_keywords.add(kw)
        clean_keywords.append(kw)
        if len(clean_keywords) >= max_allowed_keywords:
            break

    if len(clean_keywords) < settings.get('minKeywords', 25):
        issues.append(f"Keyword count ({len(clean_keywords)}) is below target min ({settings.get('minKeywords', 25)})")

    accuracy = 96
    if prohibited_removed > 0:
        accuracy -= min(6, prohibited_removed * 2)
    if len(clean_keywords) < 15:
        accuracy -= 8

    relevance = 94
    if duplicates_removed > 0:
        relevance -= min(8, int(duplicates_removed * 1.5))
    if settings.get('minTitleWords', 8) <= len(title_words) <= settings.get('maxTitleWords', 22):
        relevance += 2
    else:
        relevance -= 4

    kw_ratio = min(1, len(clean_keywords) / min(49, settings.get('maxKeywords', 49)))
    seo_potential = round(75 + kw_ratio * 23)
    if len(clean_keywords) >= 40:
        seo_potential = min(99, seo_potential + 2)

    accuracy = max(60, min(99, round(accuracy)))
    relevance = max(60, min(99, round(relevance)))
    seo_potential = max(60, min(99, round(seo_potential)))

    return {
        'cleanTitle': clean_title,
        'cleanDescription': clean_description,
        'cleanKeywords': clean_keywords,
        'qualityScore': {
            'accuracy': accuracy,
            'relevance': relevance,
            'seoPotential': seo_potential,
        },
        'report': {
            'valid': len(issues) == 0,
            'issues': issues,
            'duplicatesRemoved': duplicates_removed,
            'prohibitedRemoved': prohibited_removed,
            'keywordCount': len(clean_keywords),
            'titleWordCount': len(title_words),
            'descriptionWordCount': len(desc_words),
        },
    }


def adapt_metadata_for_platform(analysis, base_metadata, platform_id, settings):
    from .platforms import PLATFORMS

    platform_config = PLATFORMS.get(platform_id, PLATFORMS['adobe-stock'])
    max_keywords = min(settings.get('maxKeywords', 49), platform_config['maxKeywords'])

    raw_list = []

    if analysis.get('main_subject'):
        raw_list.extend(analysis['main_subject'].lower().split())

    if analysis.get('visible_text'):
        for txt in analysis['visible_text']:
            raw_list.extend(txt.lower().split())

    if analysis.get('objects'):
        raw_list.extend(o.lower() for o in analysis['objects'])

    if analysis.get('style'):
        raw_list.append(analysis['style'].lower())
    if analysis.get('content_type'):
        raw_list.append(analysis['content_type'].lower())
    if platform_id == 'vecteezy' or (analysis.get('content_type') and 'vector' in analysis['content_type'].lower()):
        raw_list.extend(['vector', 'illustration', 'graphic', 'eps', 'editable', 'design asset'])

    if analysis.get('theme'):
        raw_list.append(analysis['theme'].lower())

    if analysis.get('colors'):
        raw_list.extend(c.lower() for c in analysis['colors'])

    if base_metadata.get('keywords'):
        raw_list.extend(base_metadata['keywords'])

    result = sanitize_and_validate_metadata(
        base_metadata.get('title', ''),
        base_metadata.get('description', ''),
        raw_list,
        settings,
        max_keywords,
    )

    return {
        'title': result['cleanTitle'],
        'description': result['cleanDescription'],
        'keywords': result['cleanKeywords'],
        'primaryCategory': base_metadata.get('category', 'Graphic Resources'),
        'secondaryCategory': base_metadata.get('secondary_category', 'Illustration'),
        'qualityScore': result['qualityScore'],
        'validation': result['report'],
    }
