/**
 * @author Moe Poi <moepoi@protonmail.com>
 * @license MIT
 */
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch information and download links from a specific Nekopoi post URL
 * @param {string} url Post URL
 * @returns {Promise<{title: string, image: string|null, description: string, genres: Array<string>, downloads: Array<{title: string, links: Array<{host: string, url: string}>}>, links: Array<string>, streams: Array<{name: string, url: string}>}>}
 */
const getInfo = async (url) => {
  const baseUrl = 'https://nekopoi.care';
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // ── Detect page type ────────────────────────────────────────────────────
    const isSeriesPage = $('div.nk-series-info').length > 0;

    // ── SERIES PAGE (/hentai/<slug>/) ───────────────────────────────────────
    if (isSeriesPage) {
      // Title — og:title is cleanest
      const title =
        $('meta[property="og:title"]').attr('content')?.trim() ||
        $('div.nk-series-detail .nk-series-synopsis b').first().text().trim() ||
        '';

      // Cover — og:image (full-size) or nk-series-poster background-image
      let image =
        $('meta[property="og:image"]').attr('content') || null;
      if (!image) {
        const style = $('div.nk-series-poster').attr('style') || '';
        const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (m) image = m[1];
      }
      if (image) {
        try { image = new URL(image, baseUrl).href; } catch (_) {}
      }

      // Synopsis — nk-series-synopsis p
      const description = $('span.nk-series-synopsis p')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(t => t.length > 0)
        .join('\n')
        .trim() || '';

      // Genres — from nk-series-meta-list
      const genres = [];
      $('div.nk-series-meta-list').text().split('\n').forEach(line => {
        if (line.trim().startsWith('Genre:')) {
          line.replace('Genre:', '').trim().split(',').forEach(g => {
            const genre = g.trim();
            if (genre) genres.push(genre);
          });
        }
      });

      // Episodes — from nk-episode-grid
      const episodes = [];
      $('a.nk-episode-card').each((i, el) => {
        let epLink = $(el).attr('href');
        const epTitle = $(el).find('span.nk-episode-card-title').text().trim();
        const epBadge = $(el).find('span.nk-episode-badge').clone().find('.dashicons').remove().end().text().trim();
        const epDate = $(el).find('span.nk-episode-card-date').text().replace(/[\u{1F4C5}\u{1F5D3}]/gu, '').trim();
        const thumbStyle = $(el).find('div.nk-episode-card-thumb').attr('style') || '';
        const thumbMatch = thumbStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        let thumb = thumbMatch ? thumbMatch[1] : null;

        if (epLink) {
          try { epLink = new URL(epLink, baseUrl).href; } catch (_) {}
        }
        if (thumb) {
          try { thumb = new URL(thumb, baseUrl).href; } catch (_) {}
        }

        if (epLink) {
          episodes.push({
            badge: epBadge,
            title: epTitle,
            date: epDate,
            thumb: thumb || null,
            link: epLink
          });
        }
      });

      return { title, image, description, genres, downloads: [], links: [], streams: [], episodes };
    }

    // ── EPISODE / POST PAGE ─────────────────────────────────────────────────

    // Title — prefer post-header h1, fallback to og:title, then title tag
    const title =
      $('div.nk-post-header h1, div.nk-article h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').text().trim().replace(/\s*[–-]\s*NekoPoi\s*$/i, '') ||
      '';

    // Cover Image — og:image gives full-size (not thumbnail)
    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('div.nk-featured-img img').attr('src') ||
      $('img.wp-post-image').attr('src') ||
      $('div.imgdesc img').attr('src') ||
      $('div.thm img').attr('src') ||
      null;
    if (image) {
      try { image = new URL(image, baseUrl).href; } catch (_) {}
    }

    // Synopsis / Description
    const description =
      $('div.nk-post-body p, div.konten p, div.desc p, div.contentpost p')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(t => t.length > 0)
        .join('\n')
        .trim() || '';

    // Genres
    const genres = [];
    $('div.genre a, a[rel="tag"], .nk-post-tags a, .post-tags a').each((i, el) => {
      const genre = $(el).text().trim();
      if (genre && !genres.includes(genre)) genres.push(genre);
    });

    // Video Streams
    const streams = [];
    const tabs = [];
    $('#nk-player-tabs a').each((i, el) => { tabs.push($(el).text().trim()); });
    $('.nk-player-frame iframe, .nk-player-wrapper iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) streams.push({ name: tabs[i] || `Server ${i + 1}`, url: src });
    });

    // Download Groups
    const downloads = [];
    const links = [];

    if ($('div.nk-download-row').length > 0) {
      $('div.nk-download-row').each((i, e) => {
        const groupTitle = $(e).find('div.nk-download-name').text().trim() || `Download Group ${i + 1}`;
        const groupLinks = [];
        $(e).find('div.nk-download-links a').each((j, s) => {
          let href = $(s).attr('href');
          const host = $(s).text().trim();
          if (href) {
            try { href = new URL(href, baseUrl).href; } catch (_) {}
            groupLinks.push({ host, url: href });
            links.push(href);
          }
        });
        if (groupLinks.length > 0) downloads.push({ title: groupTitle, links: groupLinks });
      });
    } else {
      $('div.liner').each((i, e) => {
        const groupTitle = $(e).find('div.nama_liner, div.linertitle').text().trim() || `Download Group ${i + 1}`;
        const groupLinks = [];
        $(e).find('div.listlink').each((j, s) => {
          const aTag = $(s).find('a');
          let href = aTag.attr('href');
          const host = aTag.text().trim() || $(s).text().trim();
          if (href) {
            try { href = new URL(href, baseUrl).href; } catch (_) {}
            groupLinks.push({ host, url: href });
            links.push(href);
          }
        });
        if (groupLinks.length > 0) downloads.push({ title: groupTitle, links: groupLinks });
      });
    }

    return { title, image, description, genres, downloads, links, streams, episodes: [] };
  } catch (error) {
    throw new Error(`Error fetching page info: ${error.message}`);
  }
};

module.exports = getInfo;
