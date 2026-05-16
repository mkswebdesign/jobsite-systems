#!/usr/bin/env node
/**
 * One-time (or re-run) seed: best.futbol `best-by-year/2000.json` … `2025.json`.
 * club rows: [ year, slug, name, shortName, country, gradientPreset, tags[] ]
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(
  __dirname,
  '..',
  '..',
  'arich-source',
  'content',
  'brands',
  'best-futbol',
  'best-by-year'
);

/** @type {readonly [number, string, string, string, string, 'g1'|'g2'|'g3'|'g4'|'g5'|'g6', string[]][]} */
const ROWS = [
  [2000, 'galatasaray', 'Galatasaray', 'Galatasaray', 'Turkey', 'g3', ['Süper Lig', 'UEFA']],
  [2001, 'bayern-munich', 'Bayern Munich', 'Bayern', 'Germany', 'g1', ['Bundesliga', 'UCL']],
  [2002, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['La Liga', 'UCL']],
  [2003, 'milan', 'Milan', 'Milan', 'Italy', 'g2', ['Serie A', 'UCL']],
  [2004, 'porto', 'Porto', 'Porto', 'Portugal', 'g3', ['Primeira Liga', 'UCL']],
  [2005, 'liverpool', 'Liverpool', 'Liverpool', 'England', 'g1', ['Premier League', 'UCL']],
  [2006, 'barcelona', 'Barcelona', 'Barcelona', 'Spain', 'g2', ['La Liga', 'UCL']],
  [2007, 'milan', 'Milan', 'Milan', 'Italy', 'g2', ['UCL', 'Serie A']],
  [2008, 'manchester-united', 'Manchester United', 'Man Utd', 'England', 'g1', ['Premier League', 'UCL']],
  [2009, 'barcelona', 'Barcelona', 'Barcelona', 'Spain', 'g2', ['La Liga', 'UCL', 'treble']],
  [2010, 'inter', 'Inter', 'Inter', 'Italy', 'g2', ['Serie A', 'UCL', 'treble']],
  [2011, 'barcelona', 'Barcelona', 'Barcelona', 'Spain', 'g2', ['La Liga', 'UCL']],
  [2012, 'chelsea', 'Chelsea', 'Chelsea', 'England', 'g1', ['UCL', 'FA Cup']],
  [2013, 'bayern-munich', 'Bayern Munich', 'Bayern', 'Germany', 'g1', ['Bundesliga', 'UCL', 'treble']],
  [2014, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['UCL', 'Copa del Rey']],
  [2015, 'barcelona', 'Barcelona', 'Barcelona', 'Spain', 'g2', ['La Liga', 'UCL', 'treble']],
  [2016, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['UCL']],
  [2017, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['La Liga', 'UCL']],
  [2018, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['UCL', 'FIFA CWC']],
  [2019, 'liverpool', 'Liverpool', 'Liverpool', 'England', 'g1', ['UCL', 'Premier League']],
  [2020, 'bayern-munich', 'Bayern Munich', 'Bayern', 'Germany', 'g1', ['UCL', 'Bundesliga', 'sextuple']],
  [2021, 'chelsea', 'Chelsea', 'Chelsea', 'England', 'g1', ['UCL']],
  [2022, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['UCL', 'La Liga']],
  [2023, 'manchester-city', 'Manchester City', 'Man City', 'England', 'g1', ['UCL', 'Premier League', 'treble']],
  [2024, 'real-madrid', 'Real Madrid', 'Real Madrid', 'Spain', 'g2', ['UCL', 'La Liga']],
  [2025, 'liverpool', 'Liverpool', 'Liverpool', 'England', 'g1', ['Premier League']],
];

function buildPayload(year, slug, name, _short, country, gradientPreset, tags) {
  const cardSummary = `Our pick for the strongest club side in ${year} — form, silverware, and how the year sat in the global game.`;
  const intro = `${name} is the club we highlight for ${year}: a season that defined the year in the Champions League, domestic play, and the wider conversation around who looked best in the world.`;
  const highlights = [
    `Standout run in ${year} that put ${name} at the centre of the European and domestic story.`,
    `Roster, coach, and style of play matched a period in which the club was widely discussed as the team to beat.`,
  ];
  const achievements = [
    `Trophy and knockout highlights from ${year} (check sources as you harden the copy).`,
    `Comparable seasons from rivals are noted in the methodology on the /best/ hub — this is an editorial year pick, not an official title.`,
  ];
  return {
    year,
    slug,
    name,
    shortName: _short,
    country,
    cardSummary,
    intro,
    highlights,
    achievements,
    gradientPreset,
    tags,
    seo: {
      title: `${name} — team of ${year} | best.futbol`,
      description: cardSummary,
      canonical: `https://best.futbol/best/${year}/${slug}/`,
    },
  };
}

mkdirSync(outDir, { recursive: true });

const oldTeams = join(dirname(outDir), 'best-teams');
if (existsSync(oldTeams)) {
  rmSync(oldTeams, { recursive: true, force: true });
  console.log('removed best-futbol/best-teams/ (replaced by best-by-year)');
}

for (const [year, slug, name, shortName, country, g, tags] of ROWS) {
  const payload = buildPayload(year, slug, name, shortName, country, g, tags);
  writeFileSync(join(outDir, `${year}.json`), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

console.log(`wrote ${ROWS.length} files to ${outDir}`);
