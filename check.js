#!/usr/bin/env node
'use strict';

/**
 * Meadowlane DAM practice project: check script.
 *
 * Reads your Cloudinary account (it never changes your work) and reports whether each
 * step was completed correctly.
 *
 * Usage:
 *   export CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
 *   npm install
 *   node check.js
 */

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const config = require('./project-config');

if (!process.env.CLOUDINARY_URL) {
  console.error('CLOUDINARY_URL is not set. Copy it from the API Keys page of your demo account and try again.');
  process.exit(2);
}
cloudinary.config({ secure: true });
const cfg = cloudinary.config();

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const lower = (value) => String(value == null ? '' : value).trim().toLowerCase();

function errorMessage(err) {
  if (!err) return 'Unknown error';
  if (err.error && err.error.message) return err.error.message;
  if (err.message) return err.message;
  return String(err);
}

const results = [];
const ctx = {}; // values passed from one step to the next

/**
 * Runs one step. `fn` receives a `check(name, ok, detail)` function.
 * Search results can lag a few seconds behind changes, so a failing step is retried.
 */
async function runStep(id, title, fn, { retries = 0, wait = 5000 } = {}) {
  let checks = [];
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    checks = [];
    const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
    try {
      await fn(check);
    } catch (err) {
      checks.push({ name: 'Step ran without errors', ok: false, detail: errorMessage(err) });
    }
    if (checks.every((c) => c.ok)) break;
    if (attempt < retries) await sleep(wait);
  }
  const passed = checks.length > 0 && checks.every((c) => c.ok);
  results.push({ id, title, passed, checks });

  console.log(`\nStep ${id}: ${title}  [${passed ? 'PASS' : 'FAIL'}]`);
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}${!c.ok && c.detail ? `\n      ${c.detail}` : ''}`);
  }
  return passed;
}

function notChecked(id, title, message) {
  results.push({ id, title, passed: null, checks: [], note: message });
  console.log(`\nStep ${id}: ${title}  [NOT CHECKED BY SCRIPT]`);
  console.log(`  ${message}`);
}

/** Reads a text file the partner fills in, ignoring the starter note lines that begin with #. */
function readExpression(file) {
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => !line.trim().startsWith('#')).join(' ').trim();
}

/** Runs a Search API expression and returns every matching asset, with metadata and tags. */
async function searchAll(expression) {
  const found = [];
  let cursor;
  do {
    let query = cloudinary.search
      .expression(expression)
      .with_field('metadata')
      .with_field('tags')
      .max_results(100);
    if (cursor) query = query.next_cursor(cursor);
    const response = await query.execute();
    found.push(...response.resources);
    cursor = response.next_cursor;
  } while (cursor);
  return found;
}

/** True when an asset's public ID, display name, or file name contains the match text. */
function matches(resource, matchText) {
  const needle = lower(matchText);
  return [resource.public_id, resource.display_name, resource.filename, resource.original_filename]
    .some((value) => value && lower(value).includes(needle));
}

const hasTag = (resource, tag) => (resource.tags || []).map(lower).includes(lower(tag));

function folderPath(...parts) {
  return parts.join('/');
}

// ---------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------

async function main() {
  console.log(`${config.customer} DAM practice project: checking cloud "${cfg.cloud_name}"`);

  const connected = await runStep('0', 'Connection to your demo account', async (check) => {
    // A simple read of the folder list proves the cloud name, key and secret work.
    await cloudinary.api.root_folders();
    check('Your credentials work', true);
  });
  if (!connected) {
    console.log('\nThe script cannot reach your account, so it stopped. Check CLOUDINARY_URL and try again.');
    finish();
    return;
  }

  // Step 2: folder structure -------------------------------------------------
  await runStep('2', 'Folder structure', async (check) => {
    const f = config.folders;
    const root = await cloudinary.api.root_folders();
    const rootNames = root.folders.map((folder) => folder.name);
    check(`Top-level folder "${f.products}" exists`, rootNames.includes(f.products), `Found: ${rootNames.join(', ') || 'none'}`);
    check(`Top-level folder "${f.campaigns}" exists`, rootNames.includes(f.campaigns), `Found: ${rootNames.join(', ') || 'none'}`);

    if (rootNames.includes(f.products)) {
      const sub = await cloudinary.api.sub_folders(f.products);
      const names = sub.folders.map((folder) => folder.name);
      check(`"${f.products}/${f.outdoor}" exists`, names.includes(f.outdoor), `Found inside ${f.products}: ${names.join(', ') || 'none'}`);
      check(`"${f.products}/${f.home}" exists`, names.includes(f.home), `Found inside ${f.products}: ${names.join(', ') || 'none'}`);
    } else {
      check(`"${f.products}/${f.outdoor}" and "${f.products}/${f.home}" exist`, false, `Create the "${f.products}" folder first.`);
    }

    if (rootNames.includes(f.campaigns)) {
      const sub = await cloudinary.api.sub_folders(f.campaigns);
      const names = sub.folders.map((folder) => folder.name);
      check(`"${f.campaigns}/${f.fallSale}" exists`, names.includes(f.fallSale), `Found inside ${f.campaigns}: ${names.join(', ') || 'none'}`);
    } else {
      check(`"${f.campaigns}/${f.fallSale}" exists`, false, `Create the "${f.campaigns}" folder first.`);
    }
  });

  // Step 3: structured metadata fields --------------------------------------
  await runStep('3', 'Structured metadata fields', async (check) => {
    const { metadata_fields: fields } = await cloudinary.api.list_metadata_fields();
    const byLabel = (label) => fields.find((field) => lower(field.label) === lower(label));
    const labels = config.fieldLabels;

    const sku = byLabel(labels.sku);
    check(`A field labelled "${labels.sku}" exists`, sku, 'Create it in Settings > Structured metadata.');
    if (sku) check(`"${labels.sku}" is a text field`, sku.type === 'string', `Its type is "${sku.type}".`);

    const category = byLabel(labels.category);
    check(`A field labelled "${labels.category}" exists`, category, 'Create it in Settings > Structured metadata.');
    if (category) {
      check(`"${labels.category}" is a single-selection list`, category.type === 'enum', `Its type is "${category.type}".`);
      check(`"${labels.category}" is mandatory`, category.mandatory === true, 'Turn on the mandatory setting.');
      const values = ((category.datasource && category.datasource.values) || []).map((v) => v.value);
      for (const wanted of config.categories) {
        check(`"${labels.category}" has the value "${wanted}"`, values.map(lower).includes(lower(wanted)), `Values found: ${values.join(', ') || 'none'}`);
      }
    }

    const usageEnd = byLabel(labels.usageEnd);
    check(`A field labelled "${labels.usageEnd}" exists`, usageEnd, 'Create it in Settings > Structured metadata.');
    if (usageEnd) check(`"${labels.usageEnd}" is a date field`, usageEnd.type === 'date', `Its type is "${usageEnd.type}".`);

    ctx.fields = { sku, category, usageEnd };
    if (category && category.datasource) {
      ctx.categoryIds = {};
      for (const value of category.datasource.values || []) ctx.categoryIds[lower(value.value)] = value.external_id;
    }
  });

  // Step 4: upload preset -----------------------------------------------------
  await runStep('4', 'Upload preset', async (check) => {
    let preset;
    try {
      preset = await cloudinary.api.upload_preset(config.presetName);
    } catch (err) {
      check(`An upload preset named "${config.presetName}" exists`, false, 'Create it in Settings > Upload presets.');
      return;
    }
    const settings = preset.settings || {};
    check(`An upload preset named "${config.presetName}" exists`, true);
    check('The preset is signed', preset.unsigned === false, 'Set the signing mode to Signed.');

    const folder = settings.asset_folder || settings.folder || '';
    check(`The preset puts assets in ${folderPath(config.folders.products, config.folders.outdoor)}`,
      lower(folder) === lower(folderPath(config.folders.products, config.folders.outdoor)),
      `The preset's folder is "${folder || 'not set'}".`);

    const tags = Array.isArray(settings.tags) ? settings.tags : String(settings.tags || '').split(',');
    check(`The preset adds the tag "${config.outdoorTag}"`, tags.map(lower).map((t) => t.trim()).includes(lower(config.outdoorTag)),
      `The preset's tags are "${tags.join(', ') || 'not set'}".`);

    // The upload preset UI offers contextual metadata, so the preset must set context category=Outdoor.
    const rawContext = settings.context;
    let context = {};
    if (rawContext && typeof rawContext === 'object') context = rawContext;
    else if (typeof rawContext === 'string') {
      rawContext.split('|').forEach((pair) => {
        const i = pair.indexOf('=');
        if (i > 0) context[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
      });
    }
    const key = Object.keys(context).find((k) => lower(k) === lower(config.presetContext.key));
    check(`The preset adds the contextual metadata ${config.presetContext.key} = ${config.presetContext.value}`,
      key && lower(String(context[key])) === lower(config.presetContext.value),
      `The preset's contextual metadata is "${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ') || 'not set'}".`);
  });

  // Step 5: uploads -----------------------------------------------------------
  const outdoorFolder = folderPath(config.folders.products, config.folders.outdoor);
  const homeFolder = folderPath(config.folders.products, config.folders.home);
  const bannerFolder = folderPath(config.folders.campaigns, config.folders.fallSale);

  await runStep('5', 'Uploads and metadata defaults', async (check) => {
    const inFolder = {
      [outdoorFolder]: await searchAll(`asset_folder="${outdoorFolder}"`),
      [homeFolder]: await searchAll(`asset_folder="${homeFolder}"`),
      [bannerFolder]: await searchAll(`asset_folder="${bannerFolder}"`),
    };
    ctx.inFolder = inFolder;
    const categoryField = ctx.fields && ctx.fields.category;

    for (const asset of config.assets) {
      const folder = asset.category === 'Outdoor' ? outdoorFolder : homeFolder;
      const resource = inFolder[folder].find((r) => matches(r, asset.match));
      check(`${asset.key} is in ${folder}`, resource, `Upload it into ${folder}.`);
      if (!resource) continue;

      if (categoryField) {
        const stored = resource.metadata && resource.metadata[categoryField.external_id];
        const wanted = ctx.categoryIds && ctx.categoryIds[lower(asset.category)];
        check(`${asset.key} has ${config.fieldLabels.category} set to ${asset.category}`, wanted && stored === wanted,
          `${config.fieldLabels.category} is "${stored || 'not set'}".`);
      }
      if (asset.category === 'Outdoor') {
        check(`${asset.key} carries the tag "${config.outdoorTag}"`, hasTag(resource, config.outdoorTag), 'Upload outdoor assets with the preset.');
      }
    }

    const banner = inFolder[bannerFolder].find((r) => matches(r, config.banner.match));
    check(`${config.banner.key} is in ${bannerFolder}`, banner, `Upload it into ${bannerFolder}.`);
    ctx.banner = banner;
  }, { retries: 2 });

  // Step 6: Fall Sale tags and metadata ---------------------------------------
  await runStep('6', 'Fall Sale tags and metadata', async (check) => {
    const lists = ctx.inFolder || {};
    const all = [...(lists[outdoorFolder] || []), ...(lists[homeFolder] || [])];
    const { sku, usageEnd } = ctx.fields || {};

    for (const asset of config.assets) {
      const resource = all.find((r) => matches(r, asset.match));
      if (!resource) {
        check(`${asset.key} can be found`, false, 'Finish step 5 first.');
        continue;
      }
      if (asset.fallSale) {
        check(`${asset.key} carries the tag "${config.fallSaleTag}"`, hasTag(resource, config.fallSaleTag), 'Tag the four Fall Sale products.');
        if (sku) {
          const stored = resource.metadata && resource.metadata[sku.external_id];
          check(`${asset.key} has ${config.fieldLabels.sku} ${asset.sku}`, stored === asset.sku, `${config.fieldLabels.sku} is "${stored || 'not set'}".`);
        }
        if (usageEnd) {
          const stored = resource.metadata && resource.metadata[usageEnd.external_id];
          check(`${asset.key} has ${config.fieldLabels.usageEnd} ${config.usageEndDate}`, stored === config.usageEndDate, `${config.fieldLabels.usageEnd} is "${stored || 'not set'}".`);
        }
      } else {
        check(`${asset.key} does not carry the tag "${config.fallSaleTag}"`, !hasTag(resource, config.fallSaleTag), 'Only the four Fall Sale products get this tag.');
      }
    }
  }, { retries: 2 });

  // Step 7: collection and sharing link --------------------------------------
  await runStep('7', 'Collection and sharing link', async (check) => {
    const base = process.env.COLLECTIONS_API_BASE || `https://api.cloudinary.com/v2/asset_management/${cfg.cloud_name}`;
    const auth = `Basic ${Buffer.from(`${cfg.api_key}:${cfg.api_secret}`).toString('base64')}`;
    const call = async (pathname) => {
      const response = await fetch(`${base}${pathname}`, { headers: { Authorization: auth } });
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch (err) { /* not JSON */ }
      return { status: response.status, body };
    };
    // Follows next_cursor so collections or assets beyond the first page are not missed.
    const listAll = async (pathname, extra = '') => {
      const all = [];
      let cursor;
      do {
        const sep = pathname.includes('?') ? '&' : '?';
        const page = await call(`${pathname}${sep}max_results=100${extra}${cursor ? `&next_cursor=${encodeURIComponent(cursor)}` : ''}`);
        if (page.status !== 200 || !page.body) throw new Error(`The Collections API returned status ${page.status} for ${pathname.split('?')[0]}.`);
        all.push(...(page.body.data || []));
        cursor = page.body.next_cursor;
      } while (cursor);
      return all;
    };

    // The sharing link the partner pasted.
    const file = path.resolve(process.cwd(), config.collectionLinkFile);
    check(`${config.collectionLinkFile} has a link in it`, readExpression(file).length > 0, `Paste the collection's public sharing link into ${config.collectionLinkFile}.`);
    const link = readExpression(file).split(/\s+/)[0] || '';
    const linkOk = /^https:\/\/collection\.cloudinary\.com\//i.test(link);
    if (link) check('The file contains a Cloudinary collection link', linkOk, 'Paste only the link, starting with https://collection.cloudinary.com/');
    const normalize = (u) => String(u || '').trim().replace(/[/?#].*$/, (m) => (m[0] === '/' ? m : '')).replace(/\/+$/, '').toLowerCase();
    const pageIdOf = (u) => String(u || '').split(/[?#]/)[0].replace(/\/+$/, '').split('/').pop().toLowerCase();

    // Find the collection by name.
    const collections = await listAll(`/collections?query=${encodeURIComponent(config.collectionName)}`);
    const collection = collections.find((c) => lower(c.name) === lower(config.collectionName));
    check(`A collection named "${config.collectionName}" exists`, collection, 'Create it in the Media Library.');
    if (!collection) return;

    // The assets inside it.
    const items = await listAll(`/collections/${collection.id}/assets`);
    const wanted = [...config.assets.filter((a) => a.fallSale), config.banner];
    for (const asset of wanted) {
      check(`The collection holds ${asset.key}`, items.some((item) => matches(item, asset.match)), 'Add it to the collection.');
    }
    const extras = items.filter((item) => !wanted.some((a) => matches(item, a.match)));
    check('The collection holds nothing else', extras.length === 0,
      `Remove: ${extras.map((e) => e.display_name || e.public_id).join(', ')}.`);

    // The public sharing link belongs to this collection.
    const pages = await call(`/collections/${collection.id}/public_pages`);
    const pageList = (pages.body && pages.body.data) || [];
    check('The collection has a public sharing link', pages.status === 200 && pageList.length > 0, 'Use the collection\'s Share option to create a public link.');
    if (linkOk) {
      const mine = pageList.some((p) => normalize(p.url) === normalize(link) || pageIdOf(p.url) === pageIdOf(link));
      check('The link in your file is this collection\'s sharing link', mine, 'The link does not match a sharing link of the collection. Copy it again from the Share option.');
    }
  });

  // Step 8: roles -------------------------------------------------------------
  notChecked('8', 'Roles and access',
    'This step is reviewed from your screenshots. Submit a screenshot of the folder roles you assigned.');

  // Step 9: search expression ------------------------------------------------
  await runStep('9', 'Search expression', async (check) => {
    const file = path.resolve(process.cwd(), config.searchExpressionFile);
    check(`${config.searchExpressionFile} exists and has an expression`, readExpression(file).length > 0,
      `Save your expression in ${config.searchExpressionFile}.`);
    if (!fs.existsSync(file)) return;
    const expression = readExpression(file);
    if (!expression) return;

    // Structured metadata is searched by external ID (not label), and single-selection values by their own external ID.
    const f = ctx.fields || {};
    const ids = [];
    if (f.category) ids.push(`${config.fieldLabels.category} = ${f.category.external_id}${ctx.categoryIds && ctx.categoryIds.outdoor ? ` (Outdoor = ${ctx.categoryIds.outdoor})` : ''}`);
    if (f.usageEnd) ids.push(`${config.fieldLabels.usageEnd} = ${f.usageEnd.external_id}`);
    const hint = ids.length ? ` Your field external IDs: ${ids.join('; ')}.` : '';
    console.log(`\nRunning your expression: ${expression}`);
    let found;
    try {
      found = await searchAll(expression);
    } catch (err) {
      check('Cloudinary can run your expression', false, `${errorMessage(err)}${hint}`);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const expected = config.assets.filter((a) => a.fallSale && a.category === 'Outdoor' && config.usageEndDate >= today);
    const foundKeys = config.assets.filter((a) => found.some((r) => matches(r, a.match))).map((a) => a.key);
    const expectedKeys = expected.map((a) => a.key);

    for (const key of expectedKeys) {
      check(`Your search finds ${key}`, foundKeys.includes(key), `It should find every Fall Sale outdoor image that can still be used.${hint}`);
    }
    const extra = foundKeys.filter((key) => !expectedKeys.includes(key));
    check('Your search finds nothing else', extra.length === 0 && found.length === expectedKeys.length,
      `It also finds: ${extra.join(', ') || `${found.length - expectedKeys.length} other asset(s)`}.${hint}`);
  }, { retries: 1 });

  finish();
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function finish() {
  const graded = results.filter((r) => r.passed !== null);
  const passed = graded.filter((r) => r.passed).length;
  console.log('\n----------------------------------------');
  console.log(`Steps passed: ${passed} of ${graded.length} checked by this script`);
  const failed = graded.filter((r) => !r.passed).map((r) => r.id);
  if (failed.length) console.log(`Steps to revisit: ${failed.join(', ')}`);
  console.log('Step 1 is setup, and step 8 is reviewed from your screenshot.');

  const output = {
    project: `${config.customer} DAM practice project`,
    cloud: cfg.cloud_name,
    checkedAt: new Date().toISOString(),
    stepsPassed: passed,
    stepsChecked: graded.length,
    steps: results,
  };
  fs.writeFileSync('results.json', JSON.stringify(output, null, 2));
  console.log('Your results were saved to results.json. Submit that file with your screenshots.');
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((err) => {
  console.error(`The check script stopped unexpectedly: ${errorMessage(err)}`);
  process.exit(2);
});
