import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useSearchSuggestionState.js', 'utf8');

test('App delegates search suggestion state to a focused hook', () => {
  assert.match(app, /useSearchSuggestionState\(\)/);
  assert.doesNotMatch(app, /const \[suggestions, setSuggestions\] = useState/);
  assert.doesNotMatch(app, /const \[showSuggestions, setShowSuggestions\] = useState/);
  assert.doesNotMatch(app, /const suggestionSequenceRef = useRef/);
});

test('search suggestion hook preserves recent-search and request coordination state', () => {
  assert.match(hook, /localStorage\.getItem\('mercasto_recent_searches'\)/);
  assert.match(hook, /filter\(item => typeof item === 'string'\)\.slice\(0, 5\)/);
  for (const marker of [
    "const [searchQuery, setSearchQuery] = useState('')",
    'const [suggestions, setSuggestions] = useState([])',
    'const [showSuggestions, setShowSuggestions] = useState(false)',
    'const [highlightedIndex, setHighlightedIndex] = useState(-1)',
    'const suggestionDebounceRef = useRef(null)',
    'const suggestionAbortRef = useRef(null)',
    'const suggestionSequenceRef = useRef(0)',
    'const desktopSearchRef = useRef(null)',
    'const mobileSearchRef = useRef(null)',
  ]) assert.ok(hook.includes(marker), marker);
});
