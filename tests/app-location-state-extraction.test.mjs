import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useLocationSearchState.js', 'utf8');

test('App delegates location picker state to a focused hook', () => {
  assert.match(app, /useLocationSearchState\(\)/);
  assert.doesNotMatch(app, /const \[searchLocation, setSearchLocation\] = useState/);
  assert.doesNotMatch(app, /const \[showLocationPicker, setShowLocationPicker\] = useState/);
  assert.doesNotMatch(app, /const mobileSearchInputRef = useRef/);
});

test('location search hook preserves geo and responsive picker defaults', () => {
  for (const marker of [
    'const [radius, setRadius] = useState(50)',
    'const [searchLocation, setSearchLocation] = useState(null)',
    "const [searchLocationInput, setSearchLocationInput] = useState('')",
    'const [showLocationPicker, setShowLocationPicker] = useState(false)',
    'const [showMobileLocationPicker, setShowMobileLocationPicker] = useState(false)',
    "const [locState, setLocState] = useState('')",
    "const [locCity, setLocCity] = useState('')",
    'const mobileSearchInputRef = useRef(null)',
  ]) assert.ok(hook.includes(marker), marker);
});
