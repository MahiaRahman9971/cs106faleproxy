const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;

    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    // Function to replace text but skip URLs and attributes
    function replaceYaleWithFale(i, el) {
      if ($(el).children().length === 0 || $(el).text().trim() !== '') {
        // Get the HTML content of the element
        let content = $(el).html();
        
        // Only process if it's a text node
        if (content && $(el).children().length === 0) {
          // Replace Yale with Fale in text content only
          content = content.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
          $(el).html(content);
        }
      }
    }
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      // Replace text content but not in URLs or attributes
      const text = $(this).text();
      
      // Only perform replacement if 'Yale' is actually present (case-insensitive)
      if (text.match(/yale/i)) {
        // Use case-insensitive replacement with proper case preservation
        const newText = text.replace(/Yale/gi, function(match) {
          // Preserve the case pattern of the original match
          if (match === 'YALE') return 'FALE';
          if (match === 'yale') return 'fale';
          if (match === 'Yale') return 'Fale';
          return 'Fale'; // Default case
        });
        
        if (text !== newText) {
          $(this).replaceWith(newText);
        }
      }
    });
    
    // Process title separately
    let title = $('title').text();
    // Only replace if Yale is present
    if (title.match(/yale/i)) {
      title = title.replace(/Yale/gi, function(match) {
        // Preserve the case pattern of the original match
        if (match === 'YALE') return 'FALE';
        if (match === 'yale') return 'fale';
        if (match === 'Yale') return 'Fale';
        return 'Fale'; // Default case
      });
    }
    $('title').text(title);
    
    // Fix base URL to ensure relative links work properly
    const baseUrl = new URL(url).origin;
    // Add or update base tag in head
    const baseTag = $('base');
    if (baseTag.length) {
      baseTag.attr('href', baseUrl + '/');
    } else {
      $('head').prepend(`<base href="${baseUrl}/">`);  
    }
    $('title').text(title);
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: title,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Faleproxy server running at http://localhost:${PORT}`);
});
