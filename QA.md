# QA record

## Automated checks

- `npm test`: 10 tests passed
- `npm run build`: passed
- GitHub Pages export validation: passed; all script and style URLs are relative; `.nojekyll` and linked local files are present
- Production export: approximately 644 KB uncompressed including five local font files; main JavaScript approximately 131 KB gzip

## Browser checks

Public deployment browser verification is pending. The cloud browser blocks loopback URLs, so the local browser check could not be run in that surface. The development server was verified to start using `127.0.0.1` (the default).
