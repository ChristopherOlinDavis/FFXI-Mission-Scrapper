# Expand Button Feature

## Overview
The download manager now automatically clicks the "Expand" button on Fandom wiki pages before capturing the HTML content. This ensures that the full-width content is captured instead of the default narrow view.

## Implementation Details

### Button Selector
The expand button is identified using the CSS selector:
```css
button.content-size-toggle[name="content-size-toggle"]
```

### HTML Structure
The button appears in Fandom wiki pages with this structure:
```html
<button class="page-side-tool content-size-toggle"
        name="content-size-toggle"
        aria-label="Expand"
        data-wds-tooltip="Expand">
    <svg class="wds-icon wds-icon-small">
        <use xlink:href="#wds-icons-zoom-in-small"></use>
    </svg>
</button>
```

### Workflow
1. Page loads and waits for main content (`.mw-parser-output` or `.page-content`)
2. Searches for the expand button using the selector
3. If found, clicks the button
4. Waits 500ms for any CSS animations to complete
5. Captures the HTML content in expanded state

### Error Handling
- If the button is not found (e.g., on non-Fandom wikis or already-expanded pages), the script continues without error
- A friendly log message indicates whether the button was found and clicked

### Benefits
- **Full Content Capture**: Ensures tables and content sections are captured at full width
- **Better Parsing**: Makes it easier to extract mission data from the HTML
- **Cross-site Compatibility**: Gracefully handles both Fandom and non-Fandom wikis
- **No Manual Intervention**: Automated process requires no user interaction

## Testing
To test this feature:

1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. Download a Fandom page:
   ```bash
   npm run download -- ffxiclopedia-bastok
   ```

3. Check the logs for the expand button message:
   ```
   📐 Clicking expand button...
   ```
   or
   ```
   ℹ️  No expand button found (not a Fandom wiki or already expanded)
   ```

4. Verify the HTML file contains expanded content by checking the CSS classes or content width in the saved HTML

## Code Location
The expand button functionality is implemented in:
- **File**: `src/utils/download-manager.js`
- **Function**: `downloadHTML()`
- **Lines**: ~120-132
