/**
 * @author Moe Poi <moepoi@protonmail.com>
 * @license MIT
 */
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Search posts on Nekopoi
 * @param {string} query Search query
 * @param {number} page Page number (default: 1)
 * @returns {Promise<Array<{title: string, image: string|null, link: string}>>}
 */
const search = async (query, page = 1) => {
  const baseUrl = 'https://nekopoi.care';
  const encodedQuery = encodeURIComponent(query);
  const url = page > 1 
    ? `${baseUrl}/page/${page}/?s=${encodedQuery}`
    : `${baseUrl}/?s=${encodedQuery}`;

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const data = [];

    // Supports various wordpress search result layout selectors including the new theme (a.nk-search-item)
    const cardSelectors = ['a.nk-search-item', 'div.nk-post-card', 'div.eropost', 'div.result', 'article', 'div.post-item'];
    let foundCards = false;

    for (const selector of cardSelectors) {
      if ($(selector).length > 0) {
        $(selector).each((i, e) => {
          let aTag;
          if ($(e).is('a')) {
            aTag = $(e);
          } else {
            aTag = $(e).find('h2 a, h3 a, a').first();
          }

          const imgTag = $(e).find('img').first();

          const title = $(e).is('a') 
            ? $(e).find('h2, h3').first().text().trim() 
            : aTag.text().trim();

          let link = aTag.attr('href');
          let image = imgTag.attr('src') || imgTag.attr('data-src') || imgTag.attr('data-lazy-src');

          // Fallback for background-image style (used in nk-search-item layout)
          if (!image) {
            const style = $(e).find('div.nk-search-thumb, .nk-thumb-crop, .nk-post-thumb div').attr('style') || '';
            const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (match) {
              image = match[1];
            }
          }

          if (link) {
            try {
              link = new URL(link, baseUrl).href;
            } catch (err) {
              // Keep raw if invalid URL
            }
          }

          if (image) {
            try {
              image = new URL(image, baseUrl).href;
            } catch (err) {
              // Keep raw if invalid URL
            }
          }

          if (title && link) {
            if (!data.some(item => item.link === link)) {
              data.push({
                title,
                image: image || null,
                link
              });
            }
          }
        });
        foundCards = true;
        break;
      }
    }

    if (!foundCards || data.length === 0) {
      throw new Error("No search results found");
    }

    return data;
  } catch (error) {
    throw new Error(`Error searching: ${error.message}`);
  }
};

module.exports = search;
