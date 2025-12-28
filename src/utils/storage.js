import fs from 'fs/promises';
import path from 'path';

/**
 * Ensures output directory exists
 */
export async function ensureOutputDir() {
  const outputDir = path.join(process.cwd(), 'output');
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

/**
 * Saves mission set data to JSON file
 */
export async function saveMissionSet(missionSet) {
  const outputDir = await ensureOutputDir();
  const filename = `${missionSet.id}.json`;
  const filepath = path.join(outputDir, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify(missionSet, null, 2),
    'utf-8'
  );

  console.log(`Saved mission set to: ${filepath}`);
  return filepath;
}

/**
 * Saves all mission sets to a combined file
 */
export async function saveAllMissions(missionSets) {
  const outputDir = await ensureOutputDir();
  const filepath = path.join(outputDir, 'all-missions.json');

  const data = {
    missionSets
  };

  await fs.writeFile(
    filepath,
    JSON.stringify(data, null, 2),
    'utf-8'
  );

  console.log(`Saved all missions to: ${filepath}`);
  return filepath;
}

/**
 * Loads scrape metadata
 */
export async function loadMetadata() {
  const outputDir = await ensureOutputDir();
  const filepath = path.join(outputDir, 'scrape-metadata.json');

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return empty metadata if file doesn't exist
    return { metadata: [] };
  }
}

/**
 * Saves scrape metadata
 */
export async function saveMetadata(metadata) {
  const outputDir = await ensureOutputDir();
  const filepath = path.join(outputDir, 'scrape-metadata.json');

  await fs.writeFile(
    filepath,
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  return filepath;
}

/**
 * Updates metadata for a specific mission set
 */
export async function updateMissionSetMetadata(missionSetId, lastKnownUpdate) {
  const metadata = await loadMetadata();

  const existing = metadata.metadata.find(m => m.missionSetId === missionSetId);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastScraped = now;
    existing.scrapeCount += 1;
    if (lastKnownUpdate) {
      existing.lastKnownUpdate = lastKnownUpdate;
    }
  } else {
    metadata.metadata.push({
      missionSetId,
      lastScraped: now,
      lastKnownUpdate: lastKnownUpdate || now,
      scrapeCount: 1
    });
  }

  await saveMetadata(metadata);
  return metadata;
}
