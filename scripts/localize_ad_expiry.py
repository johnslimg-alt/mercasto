#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ROOT / 'src' / 'locales'
COUNTDOWN = ROOT / 'src' / 'utils' / 'adExpiryCountdown.js'

TRANSLATIONS = {
    'es': {'endsIn': 'Termina en {{time}}', 'expired': 'Finalizado', 'expiresAt': 'Finaliza el {{date}}', 'dayShort': 'd', 'hourShort': 'h', 'minuteShort': 'min', 'secondShort': 's'},
    'en': {'endsIn': 'Ends in {{time}}', 'expired': 'Ended', 'expiresAt': 'Ends on {{date}}', 'dayShort': 'd', 'hourShort': 'h', 'minuteShort': 'min', 'secondShort': 's'},
    'pt': {'endsIn': 'Termina em {{time}}', 'expired': 'Encerrado', 'expiresAt': 'Termina em {{date}}', 'dayShort': 'd', 'hourShort': 'h', 'minuteShort': 'min', 'secondShort': 's'},
    'fr': {'endsIn': 'Se termine dans {{time}}', 'expired': 'Terminé', 'expiresAt': 'Se termine le {{date}}', 'dayShort': 'j', 'hourShort': 'h', 'minuteShort': 'min', 'secondShort': 's'},
    'de': {'endsIn': 'Endet in {{time}}', 'expired': 'Beendet', 'expiresAt': 'Endet am {{date}}', 'dayShort': 'T', 'hourShort': 'Std.', 'minuteShort': 'Min.', 'secondShort': 'Sek.'},
    'it': {'endsIn': 'Termina tra {{time}}', 'expired': 'Terminato', 'expiresAt': 'Termina il {{date}}', 'dayShort': 'g', 'hourShort': 'h', 'minuteShort': 'min', 'secondShort': 's'},
    'ru': {'endsIn': 'Осталось {{time}}', 'expired': 'Завершено', 'expiresAt': 'Завершится {{date}}', 'dayShort': 'д', 'hourShort': 'ч', 'minuteShort': 'мин', 'secondShort': 'с'},
    'ar': {'endsIn': 'ينتهي خلال {{time}}', 'expired': 'انتهى', 'expiresAt': 'ينتهي في {{date}}', 'dayShort': 'ي', 'hourShort': 'س', 'minuteShort': 'د', 'secondShort': 'ث'},
    'he': {'endsIn': 'מסתיים בעוד {{time}}', 'expired': 'הסתיים', 'expiresAt': 'מסתיים ב־{{date}}', 'dayShort': 'י', 'hourShort': 'ש', 'minuteShort': 'דק׳', 'secondShort': 'שנ׳'},
    'yi': {'endsIn': 'ענדיקט זיך אין {{time}}', 'expired': 'געענדיקט', 'expiresAt': 'ענדיקט זיך דעם {{date}}', 'dayShort': 'ט', 'hourShort': 'ש', 'minuteShort': 'מינ', 'secondShort': 'סעק'},
    'ja': {'endsIn': '残り{{time}}', 'expired': '終了', 'expiresAt': '{{date}}に終了', 'dayShort': '日', 'hourShort': '時間', 'minuteShort': '分', 'secondShort': '秒'},
    'ko': {'endsIn': '종료까지 {{time}}', 'expired': '종료됨', 'expiresAt': '{{date}}에 종료', 'dayShort': '일', 'hourShort': '시간', 'minuteShort': '분', 'secondShort': '초'},
    'zh': {'endsIn': '剩余 {{time}}', 'expired': '已结束', 'expiresAt': '结束时间：{{date}}', 'dayShort': '天', 'hourShort': '小时', 'minuteShort': '分', 'secondShort': '秒'},
}

HELPERS = r'''function getActiveLocale() {
  return String(
    i18n.resolvedLanguage
      || i18n.language
      || document.documentElement.lang
      || navigator.language
      || 'es-MX',
  ).replace('_', '-');
}

function getCountdownCopy() {
  const locale = getActiveLocale();
  if (translationCache?.locale === locale) return translationCache.copy;

  const baseLanguage = locale.toLowerCase().split('-')[0];
  const candidates = [...new Set([locale, baseLanguage, 'es'])];
  const defaults = {
    endsIn: 'Termina en {{time}}',
    expired: 'Finalizado',
    expiresAt: 'Finaliza el {{date}}',
    dayShort: 'd',
    hourShort: 'h',
    minuteShort: 'min',
    secondShort: 's',
  };

  const read = (key) => {
    for (const language of candidates) {
      const value = i18n.getResource(language, 'translation', `ads.expiryCountdown.${key}`);
      if (typeof value === 'string' && value.trim()) return value;
    }
    return defaults[key];
  };

  const copy = Object.fromEntries(Object.keys(defaults).map((key) => [key, read(key)]));
  translationCache = { locale, copy };
  return copy;
}

function applyTemplate(template, values) {
  return String(template).replace(/{{\s*(\w+)\s*}}/g, (_, key) => values[key] ?? '');
}

function formatExpiryDate(timestamp) {
  const date = new Date(timestamp);
  try {
    return date.toLocaleString(getActiveLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return date.toLocaleString();
  }
}

'''

FORMAT_REMAINING = r'''function formatRemaining(milliseconds) {
  const copy = getCountdownCopy();

  if (milliseconds <= 0) {
    return { text: copy.expired, state: 'expired' };
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    const time = `${days}${copy.dayShort} ${hours}${copy.hourShort}`;
    return {
      text: applyTemplate(copy.endsIn, { time }),
      state: days < 3 ? 'warning' : 'normal',
    };
  }

  if (hours > 0) {
    const time = `${hours}${copy.hourShort} ${minutes}${copy.minuteShort}`;
    return {
      text: applyTemplate(copy.endsIn, { time }),
      state: 'urgent',
    };
  }

  const time = `${minutes}${copy.minuteShort} ${seconds}${copy.secondShort}`;
  return {
    text: applyTemplate(copy.endsIn, { time }),
    state: 'urgent',
  };
}
'''

UPDATE_BADGE = r'''function updateBadge(badge) {
  const adId = badge.getAttribute(BADGE_ATTRIBUTE);
  const expiry = expiryByAdId.get(adId);
  if (!expiry) return;

  const remaining = formatRemaining(expiry - Date.now());
  const text = badge.querySelector('[data-countdown-text]');
  if (text) text.textContent = remaining.text;

  const locale = getActiveLocale();
  const copy = getCountdownCopy();
  const formattedDate = formatExpiryDate(expiry);

  badge.dataset.state = remaining.state;
  badge.lang = locale;
  badge.setAttribute('aria-label', remaining.text);
  badge.title = applyTemplate(copy.expiresAt, { date: formattedDate });
}
'''


def update_locales():
    files = sorted(LOCALES.glob('*.json'))
    actual = {path.stem for path in files}
    expected = set(TRANSLATIONS)
    if actual != expected:
        raise RuntimeError(f'Locale mismatch: missing={expected - actual}, extra={actual - expected}')

    for path in files:
        data = json.loads(path.read_text(encoding='utf-8'))
        data.setdefault('ads', {})['expiryCountdown'] = TRANSLATIONS[path.stem]
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def update_countdown():
    text = COUNTDOWN.read_text(encoding='utf-8')
    if not text.startswith("import i18n from '../i18n';"):
        text = "import i18n from '../i18n';\n\n" + text

    text = text.replace(
        'let refreshTimer = null;\nlet scanQueued = false;\n',
        'let refreshTimer = null;\nlet scanQueued = false;\nlet translationCache = null;\n',
    )

    if 'function getActiveLocale()' not in text:
        text = text.replace('function normalizeExpiry(value) {', HELPERS + 'function normalizeExpiry(value) {')

    text, format_count = re.subn(
        r'function formatRemaining\(milliseconds\) \{.*?\n\}\n\nfunction createBadge',
        FORMAT_REMAINING + '\nfunction createBadge',
        text,
        flags=re.S,
    )
    if format_count != 1:
        raise RuntimeError(f'formatRemaining replacement count={format_count}')

    if "badge.setAttribute('dir', 'auto');" not in text:
        text = text.replace(
            "  badge.setAttribute('aria-live', 'off');\n",
            "  badge.setAttribute('aria-live', 'off');\n  badge.setAttribute('dir', 'auto');\n",
        )

    text, badge_count = re.subn(
        r'function updateBadge\(badge\) \{.*?\n\}\n\nfunction attachCardBadges',
        UPDATE_BADGE + '\nfunction attachCardBadges',
        text,
        flags=re.S,
    )
    if badge_count != 1:
        raise RuntimeError(f'updateBadge replacement count={badge_count}')

    if 'function handleLanguageChange()' not in text:
        text = text.replace(
            'export function installAdExpiryCountdown() {',
            "function handleLanguageChange() {\n  translationCache = null;\n  queueScan();\n}\n\nexport function installAdExpiryCountdown() {",
        )

    if "i18n.on('languageChanged', handleLanguageChange);" not in text:
        text = text.replace(
            '  installXhrInterceptor();\n\n  const observer',
            "  installXhrInterceptor();\n  i18n.on('languageChanged', handleLanguageChange);\n\n  const observer",
        )

    if "i18n.off('languageChanged', handleLanguageChange);" not in text:
        text = text.replace(
            '    if (refreshTimer) window.clearInterval(refreshTimer);\n    observer.disconnect();',
            "    if (refreshTimer) window.clearInterval(refreshTimer);\n    i18n.off('languageChanged', handleLanguageChange);\n    observer.disconnect();",
        )

    COUNTDOWN.write_text(text, encoding='utf-8')


def validate():
    required = {'endsIn', 'expired', 'expiresAt', 'dayShort', 'hourShort', 'minuteShort', 'secondShort'}
    for path in sorted(LOCALES.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        if set(data['ads']['expiryCountdown']) != required:
            raise RuntimeError(f'Invalid expiry countdown keys in {path.name}')


if __name__ == '__main__':
    update_locales()
    update_countdown()
    validate()
    print(f'Localized ad countdown in {len(TRANSLATIONS)} languages.')
