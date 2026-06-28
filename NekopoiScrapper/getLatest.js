/**
 * @author Moe Poi <moepoi@protonmail.com>
 * @license MIT
 */
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch latest updates from Nekopoi, with optional category filtering
 * @param {number} page Page number (default: 1)
 * @param {string} categoryUrl Optional category base URL (default: homepage)
 * @returns {Promise<Array<{title: string, image: string|null, link: string}>>}
 */
const getLatest = async (page = 1, categoryUrl = null) => {
  const baseUrl = 'https://nekopoi.care';
  const rootUrl = categoryUrl || baseUrl;
  const url = page > 1 ? `${rootUrl.replace(/\/$/, '')}/page/${page}/` : rootUrl;

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const data = [];

    // Layout 1: Category/search pages use <a class="nk-search-item"> with background-image thumb
    const searchItems = $('a.nk-search-item');
    if (searchItems.length > 0) {
      searchItems.each((i, e) => {
        let link = $(e).attr('href');
        const title = $(e).find('div.nk-search-info h2, div.nk-search-info h3').first().text().trim();

        // Image is in background-image CSS on nk-search-thumb
        let image = null;
        const style = $(e).find('div.nk-search-thumb').attr('style') || '';
        const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (match) image = match[1];

        if (link) {
          try { link = new URL(link, baseUrl).href; } catch (_) {}
        }
        if (image) {
          try { image = new URL(image, baseUrl).href; } catch (_) {}
        }

        if (title && link) {
          data.push({ title, image: image || null, link });
        }
      });
    } else {
      // Layout 2: Homepage/new theme uses div.nk-post-card
      // Layout 3: Old theme uses div.eropost
      const cardSelectors = ['div.nk-post-card', 'div.eropost'];
      let targetSelector = '';

      for (const sel of cardSelectors) {
        if ($(sel).length > 0) {
          targetSelector = sel;
          break;
        }
      }

      if (!targetSelector) {
        throw new Error("No layout structures detected on the page");
      }

      $(targetSelector).each((i, e) => {
        const aTag = $(e).find('h2 a, h3 a, a').first();
        const imgTag = $(e).find('img').first();

        const title = aTag.text().trim();
        let link = aTag.attr('href');
        let image = imgTag.attr('src') || imgTag.attr('data-src') || imgTag.attr('data-lazy-src');

        // Fallback: background-image style
        if (!image) {
          const style = $(e).find('.nk-thumb-crop, .nk-post-thumb div').attr('style') || '';
          const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (match) image = match[1];
        }

        if (link) {
          try { link = new URL(link, baseUrl).href; } catch (_) {}
        }
        if (image) {
          try { image = new URL(image, baseUrl).href; } catch (_) {}
        }

        if (title && link) {
          data.push({ title, image: image || null, link });
        }
      });
    }

    if (data.length === 0) {
      throw new Error("No result found");
    }

    return data;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

module.exports = getLatest;
