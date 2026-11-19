'use strict';

/**
 * The shared Meadowlane media library, used by the DAM, Image, and Video practice projects.
 * This file is identical in all three projects, so doing one project first leaves the account
 * ready for the others (and in either order, nothing is uploaded twice).
 *
 * Rules:
 *  - Each asset's public ID is its file name without the extension (for example OUT-1001).
 *  - Each asset lives in the asset folder listed here (accounts use dynamic folder mode).
 *
 * `source` is where the file comes from. The photos are from Pixabay. Partners save them under `file`.
 * TODO (Cloudinary team): supply the Fall Sale hero video.
 */
module.exports = {
  customer: 'Meadowlane',

  folders: {
    outdoor: 'Products/Outdoor',
    home: 'Products/Home',
    campaign: 'Campaigns/Fall Sale',
    videos: 'Videos/Products',
    brand: 'Brand',
  },

  tags: {
    imageProduct: 'meadowlane-product', // added to the eight product photos by the Image project
    video: 'meadowlane-video', // added to the three videos by the Video project
  },

  // Eight product photos (Pixabay, 1280 pixels on the long side).
  products: [
    { key: 'OUT-1001', file: 'OUT-1001.jpg', source: 'https://cdn.pixabay.com/photo/2019/04/06/20/31/tent-4108274_1280.jpg', name: 'Trail tent', category: 'Outdoor', folder: 'Products/Outdoor', fallSale: true },
    { key: 'OUT-1002', file: 'OUT-1002.jpg', source: 'https://cdn.pixabay.com/photo/2018/05/02/17/21/backpack-3369137_1280.jpg', name: 'Daypack', category: 'Outdoor', folder: 'Products/Outdoor', fallSale: true },
    { key: 'OUT-1003', file: 'OUT-1003.jpg', source: 'https://cdn.pixabay.com/photo/2021/09/25/14/52/lantern-6655151_1280.jpg', name: 'Camp lantern', category: 'Outdoor', folder: 'Products/Outdoor', fallSale: false },
    { key: 'OUT-1004', file: 'OUT-1004.jpg', source: 'https://cdn.pixabay.com/photo/2018/08/28/20/21/jug-3638398_1280.jpg', name: 'Insulated bottle', category: 'Outdoor', folder: 'Products/Outdoor', fallSale: false },
    { key: 'HOM-2001', file: 'HOM-2001.jpg', source: 'https://cdn.pixabay.com/photo/2026/04/21/06/13/06-13-17-18_1280.jpg', name: 'Wool throw', category: 'Home', folder: 'Products/Home', fallSale: true },
    { key: 'HOM-2002', file: 'HOM-2002.jpg', source: 'https://cdn.pixabay.com/photo/2014/06/06/03/25/mug-363147_1280.jpg', name: 'Stoneware mug', category: 'Home', folder: 'Products/Home', fallSale: true },
    { key: 'HOM-2003', file: 'HOM-2003.jpg', source: 'https://cdn.pixabay.com/photo/2016/10/24/23/40/clock-1767616_1280.jpg', name: 'Wall clock', category: 'Home', folder: 'Products/Home', fallSale: false },
    { key: 'HOM-2004', file: 'HOM-2004.jpg', source: 'https://cdn.pixabay.com/photo/2015/05/31/14/35/pillow-791957_1280.jpg', name: 'Linen cushion', category: 'Home', folder: 'Products/Home', fallSale: false },
  ],

  banner: { key: 'fall-sale-banner', file: 'fall-sale-banner.png', source: 'https://res.cloudinary.com/meganamendola/image/upload/v1794430526/Sale_badge_cj99st.png', name: 'Fall Sale banner', folder: 'Campaigns/Fall Sale' },
  // The logo is included in each package's assets folder as logo.png (a placeholder Meadowlane logo).
  logo: { key: 'logo', file: 'logo.png', name: 'Meadowlane logo', folder: 'Brand' },

  videos: [
    { key: 'tent-setup', file: 'tent-setup.mp4', source: 'https://cdn.pixabay.com/video/2021/03/19/68413-528670667_large.mp4', name: 'Trail tent setup', folder: 'Videos/Products' },
    { key: 'daypack-packing', file: 'daypack-packing.mp4', source: 'https://cdn.pixabay.com/video/2025/03/08/263298_large.mp4', name: 'Daypack packing', folder: 'Videos/Products' },
        { key: 'fall-sale-hero', file: 'fall-sale-hero.mp4', source: 'https://cdn.pixabay.com/video/2018/09/25/18420-292228405_large.mp4', name: 'Fall Sale hero', folder: 'Campaigns/Fall Sale' },
  ],
};
