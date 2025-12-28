import * as cheerio from 'cheerio';

/**
 * Test parser for BG Wiki category page
 */
function parseBGWikiCategoryPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = [];
  const seenUrls = new Set();

  // Method 1: Extract from mission table (more structured)
  // BG Wiki mission category pages often have a table with mission data
  $('table tr').each((i, row) => {
    const $row = $(row);
    // Look for rows with mission links (skip header rows)
    const $missionLink = $row.find('td a[href*="Mission"]');

    if ($missionLink.length > 0) {
      const href = $missionLink.attr('href');
      const title = $missionLink.text().trim();

      if (href && title && !seenUrls.has(href)) {
        // Convert relative URL to absolute
        let fullUrl = href;
        if (href.startsWith('/')) {
          const base = new URL(baseUrl);
          fullUrl = `${base.protocol}//${base.host}${href}`;
        }

        // Filter for mission pages
        if (!fullUrl.includes('Category:') &&
            !fullUrl.includes('Special:')) {
          links.push({
            url: fullUrl,
            title: title,
          });
          seenUrls.add(href);
        }
      }
    }
  });

  // Method 2: Extract from category listing at bottom (fallback)
  // BG Wiki uses #mw-pages .mw-category-group for mission listings
  $('#mw-pages .mw-category-group li a').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const title = $link.text().trim();

    if (href && title && !seenUrls.has(href)) {
      // Convert relative URL to absolute
      let fullUrl = href;
      if (href.startsWith('/')) {
        const base = new URL(baseUrl);
        fullUrl = `${base.protocol}//${base.host}${href}`;
      }

      // Filter for mission pages
      if (!fullUrl.includes('Category:') &&
          !fullUrl.includes('Special:')) {
        links.push({
          url: fullUrl,
          title: title,
        });
        seenUrls.add(href);
      }
    }
  });

  return links;
}

// Sample HTML from the user's message (simplified)
const testHTML = `
<body class="mediawiki ltr sitedir-ltr mw-hide-empty-elt ns-14 ns-subject page-Category_Bastok_Missions rootpage-Category_Bastok_Missions skin-timeless action-view skin--responsive">
  <div class="content-table">
    <table width="95%" align="center" style="text-align:center; color: black;">
      <tbody>
        <tr>
          <th bgcolor="#1A1C80"><span style="color:#E9DC76">Rank</span></th>
          <th bgcolor="#1A1C80"><span style="color:#E9DC76">Number</span></th>
          <th bgcolor="#1A1C80"><span style="color:#E9DC76">Mission Name</span></th>
          <th bgcolor="#1A1C80"><span style="color:#E9DC76">Type</span></th>
          <th bgcolor="#1A1C80"><span style="color:#E9DC76">Reward</span></th>
        </tr>
        <tr bgcolor="#C5C6DF">
          <th bgcolor="#5B6693" rowspan="4"><span style="color:#E9DC76; font-size:200%;">1</span></th>
          <td>1-1</td>
          <td><a href="/ffxi/Bastok_Mission_1-1" title="Bastok Mission 1-1">The Zeruhn Report</a></td>
          <td>Quest</td>
          <td>Rank Points</td>
        </tr>
        <tr bgcolor="#C5C6DF">
          <td>1-2</td>
          <td><a href="/ffxi/Bastok_Mission_1-2" title="Bastok Mission 1-2">A Geological Survey</a></td>
          <td>Quest</td>
          <td>Rank Points</td>
        </tr>
        <tr bgcolor="#C5C6DF">
          <td>1-3</td>
          <td><a href="/ffxi/Bastok_Mission_1-3" title="Bastok Mission 1-3">Fetichism</a></td>
          <td>Repeatable</td>
          <td>Rank 2<br>1000 gil</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div id="mw-pages">
    <h2>Pages in category "Bastok Missions"</h2>
    <p>The following 20 pages are in this category, out of 20 total.</p>
    <div class="mw-category mw-category-columns">
      <div class="mw-category-group">
        <h3>B</h3>
        <ul>
          <li><a href="/ffxi/Bastok_Mission_1-1" title="Bastok Mission 1-1">Bastok Mission 1-1</a></li>
          <li><a href="/ffxi/Bastok_Mission_1-2" title="Bastok Mission 1-2">Bastok Mission 1-2</a></li>
          <li><a href="/ffxi/Bastok_Mission_1-3" title="Bastok Mission 1-3">Bastok Mission 1-3</a></li>
          <li><a href="/ffxi/Bastok_Mission_2-1" title="Bastok Mission 2-1">Bastok Mission 2-1</a></li>
          <li><a href="/ffxi/Bastok_Mission_2-2" title="Bastok Mission 2-2">Bastok Mission 2-2</a></li>
        </ul>
      </div>
    </div>
  </div>
</body>
`;

// Test the parser
const baseUrl = 'https://www.bg-wiki.com/ffxi/Category:Bastok_Missions';
const links = parseBGWikiCategoryPage(testHTML, baseUrl);

console.log('\n✓ Extracted Links:\n');
links.forEach((link, i) => {
  console.log(`${i + 1}. ${link.title}`);
  console.log(`   ${link.url}`);
});

console.log(`\n✓ Total: ${links.length} unique mission links found\n`);
