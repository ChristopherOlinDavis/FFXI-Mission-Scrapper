/**
 * Utility to clean page titles from wiki artifacts
 */

/**
 * Clean page title by removing wiki UI artifacts and suffixes
 * @param {string} titleText - Raw title text from <title> tag
 * @param {string} filename - Fallback filename if title is empty
 * @returns {string} Cleaned title
 */
export function cleanPageTitle(titleText, filename = '') {
  if (!titleText || titleText.trim() === '') {
    // Fallback to filename
    return filename.replace(/^(bgwiki|ffxiclopedia)-/, '').replace(/_/g, ' ').replace(/\.html?$/i, '');
  }

  let cleaned = titleText;

  // Remove wiki suffixes
  cleaned = cleaned
    .replace(/ - FFXI Wiki$/i, '')
    .replace(/ - FFXIclopedia$/i, '')
    .replace(/ - The Final Fantasy XI Wiki$/i, '')
    .replace(/ - BG FFXI Wiki$/i, '');

  // Remove Fandom UI artifacts (critical for mobile apps)
  cleaned = cleaned
    .replace(/ \| FFXIclopedia \| Fandom.*$/i, '')
    .replace(/Back ButtonSearch IconFilter Icon$/i, '')
    .replace(/\s*\|\s*Fandom$/i, '')
    .replace(/\s*\|\s*FFXI Wiki$/i, '');

  // Remove any trailing separators
  cleaned = cleaned
    .replace(/\s*[\|;]\s*$/g, '')
    .trim();

  // If cleaning resulted in empty string, use filename
  if (cleaned === '') {
    cleaned = filename.replace(/^(bgwiki|ffxiclopedia)-/, '').replace(/_/g, ' ').replace(/\.html?$/i, '');
  }

  return cleaned;
}

export default cleanPageTitle;
