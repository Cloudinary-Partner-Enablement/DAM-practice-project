'use strict';

/**
 * Project settings for the Meadowlane DAM practice project.
 * The Cloudinary team edits this file. Partners should not need to change it.
 *
 * Each asset below is found in the partner's account by looking for the `match`
 * text in the asset's public ID, display name, or file name (not case sensitive).
 * Set `match` to a word that appears in the real file name of each asset.
 */
const library = require('./meadowlane-library');

module.exports = {
  customer: library.customer,

  // Folder names the partner must create.
  folders: {
    products: 'Products',
    outdoor: 'Outdoor',
    home: 'Home',
    campaigns: 'Campaigns',
    fallSale: 'Fall Sale',
  },

  // Structured metadata fields the partner must create (matched by label, not case sensitive).
  fieldLabels: {
    sku: 'SKU',
    category: 'Category',
    usageEnd: 'Usage end date',
  },
  categories: ['Outdoor', 'Home'],

  presetName: 'meadowlane_outdoor',
  outdoorTag: 'outdoor',
  // Contextual metadata the preset must add (the upload preset UI offers contextual, not structured, metadata).
  presetContext: { key: 'category', value: 'Outdoor' },
  fallSaleTag: 'fall-sale',
  collectionName: 'Fall Sale Agency',
  // File the partner pastes the collection's public sharing link into (step 7).
  collectionLinkFile: 'collection-link.txt',

  // The usage end date partners are told to enter for Fall Sale products (YYYY-MM-DD).
  // Must match the date stated in the partner guide (step 6).
  usageEndDate: '2027-12-31',

  // The sample assets come from meadowlane-library.js, which is shared with the Image and Video
  // projects. Each asset's public ID is its SKU (for example OUT-1001), so `match` is the SKU.
  assets: library.products.map((p) => ({ key: p.key, match: p.key, sku: p.key, category: p.category, fallSale: p.fallSale })),

  // The Fall Sale banner lives in Campaigns/Fall Sale and has no SKU or category.
  banner: { key: library.banner.key, match: library.banner.key },

  // File the partner saves their Search API expression in (step 9).
  searchExpressionFile: 'search-expression.txt',
};
