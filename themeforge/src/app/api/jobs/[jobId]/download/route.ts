import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { getJobStore } from '@/lib/jobStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const jobStore = getJobStore();
  const job = jobStore.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { error: 'Job not completed yet' },
      { status: 400 }
    );
  }

  try {
    // Create the ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Generate sample Shopify theme structure
    // In production, this would read from actual generated files
    const hostname = new URL(job.url).hostname;
    
    // Layout files
    archive.append(generateThemeLayout(), { name: 'layout/theme.liquid' });
    
    // Template files
    archive.append(generateIndexTemplate(), { name: 'templates/index.json' });
    archive.append(generatePageTemplate(), { name: 'templates/page.json' });
    archive.append(generateArticleTemplate(), { name: 'templates/article.json' });
    
    // Section files
    const sections = ['header', 'hero', 'features', 'testimonials', 'pricing', 'faq', 'newsletter', 'footer'];
    for (const section of sections) {
      archive.append(generateSectionLiquid(section), { name: `sections/${section}.liquid` });
    }
    
    // Asset files
    archive.append(generateBaseCSS(), { name: 'assets/base.css' });
    archive.append(generateThemeJS(), { name: 'assets/theme.js' });
    
    // Config files
    archive.append(generateSettingsSchema(), { name: 'config/settings_schema.json' });
    archive.append(generateSettingsData(), { name: 'config/settings_data.json' });
    
    // Snippets
    archive.append(generateIconSnippet(), { name: 'snippets/icon.liquid' });
    
    archive.finalize();

    // Convert archive to readable stream for response
    const chunks: Uint8Array[] = [];
    archive.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    
    await new Promise<void>((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${hostname}-theme.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating ZIP:', error);
    return NextResponse.json(
      { error: 'Failed to generate ZIP file' },
      { status: 500 }
    );
  }
}

// Helper functions to generate theme files
function generateThemeLayout(): string {
  return `<!doctype html>
<html class="no-js" lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="">
    <link rel="canonical" href="{{ canonical_url }}">

    {%- if settings.favicon != blank -%}
      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
    {%- endif -%}

    <title>
      {{ page_title }}
      {%- if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif -%}
      {%- if current_page != 1 %} &ndash; Page {{ current_page }}{% endif -%}
      {%- unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless -%}
    </title>

    {% if page_description %}
      <meta name="description" content="{{ page_description | escape }}">
    {% endif %}

    {{ content_for_header }}

    {{ 'base.css' | asset_url | stylesheet_tag }}

    {%- if settings.enable_custom_css -%}
      <style>{{ settings.custom_css }}</style>
    {%- endif -%}
  </head>

  <body class="template-{{ template.name }}">
    {% sections 'header-group' %}

    <main id="MainContent" class="main-content" role="main" tabindex="-1">
      {{ content_for_layout }}
    </main>

    {% sections 'footer-group' %}

    {{ 'theme.js' | asset_url | script_tag }}
  </body>
</html>`;
}

function generateIndexTemplate(): string {
  return JSON.stringify({
    sections: {
      hero: { type: 'hero', settings: {} },
      features: { type: 'features', settings: {} },
      testimonials: { type: 'testimonials', settings: {} },
      pricing: { type: 'pricing', settings: {} },
      faq: { type: 'faq', settings: {} },
      newsletter: { type: 'newsletter', settings: {} },
    },
    order: ['hero', 'features', 'testimonials', 'pricing', 'faq', 'newsletter'],
  }, null, 2);
}

function generatePageTemplate(): string {
  return JSON.stringify({
    sections: {
      main: { type: 'main-page', settings: {} },
    },
    order: ['main'],
  }, null, 2);
}

function generateArticleTemplate(): string {
  return JSON.stringify({
    sections: {
      main: { type: 'main-article', settings: {} },
    },
    order: ['main'],
  }, null, 2);
}

function generateSectionLiquid(sectionName: string): string {
  const capitalizedName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
  
  return `{%- comment -%}
  ${capitalizedName} Section - Generated by ThemeForge
{%- endcomment -%}

<section class="section-${sectionName}" id="${sectionName}">
  <div class="container">
    <div class="section-${sectionName}__inner">
      {% if section.settings.heading != blank %}
        <h2 class="section-${sectionName}__heading">{{ section.settings.heading }}</h2>
      {% endif %}
      
      {% if section.settings.description != blank %}
        <p class="section-${sectionName}__description">{{ section.settings.description }}</p>
      {% endif %}
      
      <div class="section-${sectionName}__content">
        {%- for block in section.blocks -%}
          <div class="section-${sectionName}__item" {{ block.shopify_attributes }}>
            {% if block.settings.title != blank %}
              <h3>{{ block.settings.title }}</h3>
            {% endif %}
            {% if block.settings.text != blank %}
              <p>{{ block.settings.text }}</p>
            {% endif %}
          </div>
        {%- endfor -%}
      </div>
    </div>
  </div>
</section>

{% schema %}
{
  "name": "${capitalizedName}",
  "tag": "section",
  "class": "section-${sectionName}",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "${capitalizedName}"
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "Description"
    },
    {
      "type": "color",
      "id": "background_color",
      "label": "Background color",
      "default": "#ffffff"
    },
    {
      "type": "color",
      "id": "text_color",
      "label": "Text color",
      "default": "#000000"
    }
  ],
  "blocks": [
    {
      "type": "item",
      "name": "Item",
      "settings": [
        {
          "type": "text",
          "id": "title",
          "label": "Title"
        },
        {
          "type": "richtext",
          "id": "text",
          "label": "Text"
        },
        {
          "type": "image_picker",
          "id": "image",
          "label": "Image"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "${capitalizedName}"
    }
  ]
}
{% endschema %}`;
}

function generateBaseCSS(): string {
  return `/* Base CSS - Generated by ThemeForge */

:root {
  --color-base-background: #ffffff;
  --color-base-text: #121212;
  --color-base-accent: #f97316;
  --font-body-family: system-ui, -apple-system, sans-serif;
  --font-heading-family: system-ui, -apple-system, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: var(--font-body-family);
  color: var(--color-base-text);
  background-color: var(--color-base-background);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Section Styles */
section {
  padding: 4rem 0;
}

/* Header Styles */
.section-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-base-background);
  border-bottom: 1px solid #e5e5e5;
  padding: 1rem 0;
}

/* Footer Styles */
.section-footer {
  background: #f5f5f5;
  padding: 3rem 0;
}

/* Utility Classes */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.hidden { display: none !important; }
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}`;
}

function generateThemeJS(): string {
  return `/* Theme JavaScript - Generated by ThemeForge */

(function() {
  'use strict';

  // DOM Ready
  document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
  });

  function initializeTheme() {
    initMobileMenu();
    initSmoothScroll();
    initLazyLoading();
  }

  // Mobile Menu Toggle
  function initMobileMenu() {
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');

    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', function() {
        mobileMenu.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', 
          mobileMenu.classList.contains('is-open'));
      });
    }
  }

  // Smooth Scroll for anchor links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Lazy Loading for images
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const image = entry.target;
            if (image.dataset.src) {
              image.src = image.dataset.src;
              image.classList.remove('lazy');
            }
            observer.unobserve(image);
          }
        });
      });

      document.querySelectorAll('img.lazy').forEach(function(image) {
        imageObserver.observe(image);
      });
    }
  }

  // Expose to global scope if needed
  window.ThemeForge = {
    init: initializeTheme
  };
})();`;
}

function generateSettingsSchema(): string {
  return JSON.stringify([
    {
      name: "theme_info",
      theme_name: "ThemeForge Theme",
      theme_version: "1.0.0",
      theme_author: "ThemeForge",
      theme_documentation_url: "https://themeforge.app/docs",
      theme_support_url: "https://themeforge.app/support"
    },
    {
      name: "Colors",
      settings: [
        {
          type: "color",
          id: "color_primary",
          label: "Primary color",
          default: "#f97316"
        },
        {
          type: "color",
          id: "color_secondary",
          label: "Secondary color",
          default: "#1e293b"
        },
        {
          type: "color",
          id: "color_background",
          label: "Background color",
          default: "#ffffff"
        },
        {
          type: "color",
          id: "color_text",
          label: "Text color",
          default: "#121212"
        }
      ]
    },
    {
      name: "Typography",
      settings: [
        {
          type: "font_picker",
          id: "font_body",
          label: "Body font",
          default: "system-ui"
        },
        {
          type: "font_picker",
          id: "font_heading",
          label: "Heading font",
          default: "system-ui"
        }
      ]
    },
    {
      name: "Custom CSS/JS",
      settings: [
        {
          type: "checkbox",
          id: "enable_custom_css",
          label: "Enable custom CSS",
          default: false
        },
        {
          type: "textarea",
          id: "custom_css",
          label: "Custom CSS"
        }
      ]
    }
  ], null, 2);
}

function generateSettingsData(): string {
  return JSON.stringify({
    current: {
      color_primary: "#f97316",
      color_secondary: "#1e293b",
      color_background: "#ffffff",
      color_text: "#121212"
    }
  }, null, 2);
}

function generateIconSnippet(): string {
  return `{%- comment -%}
  Icon Snippet - Generated by ThemeForge
  Usage: {% render 'icon', icon: 'arrow-right' %}
{%- endcomment -%}

{% case icon %}
  {% when 'arrow-right' %}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon icon-{{ icon }}" width="{{ size | default: 24 }}" height="{{ size | default: 24 }}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  {% when 'menu' %}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon icon-{{ icon }}" width="{{ size | default: 24 }}" height="{{ size | default: 24 }}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  {% when 'close' %}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon icon-{{ icon }}" width="{{ size | default: 24 }}" height="{{ size | default: 24 }}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
{% endcase %}`;
}
