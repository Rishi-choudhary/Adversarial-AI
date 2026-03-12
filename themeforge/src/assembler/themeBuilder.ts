import { LiquidSection } from '../converter/liquidGenerator';
import { writeFile } from '../lib/storage';

export interface ThemeStructure {
  layout: { [filename: string]: string };
  templates: { [filename: string]: string };
  sections: { [filename: string]: string };
  snippets: { [filename: string]: string };
  assets: { [filename: string]: string | Buffer };
  config: { [filename: string]: string };
  locales: { [filename: string]: string };
}

/**
 * Build a complete Shopify theme structure
 */
export async function buildTheme(
  jobId: string,
  sections: LiquidSection[],
  css: string,
  js: string,
  images: Map<string, Buffer>
): Promise<ThemeStructure> {
  const theme: ThemeStructure = {
    layout: {},
    templates: {},
    sections: {},
    snippets: {},
    assets: {},
    config: {},
    locales: {},
  };

  // Add layout
  theme.layout['theme.liquid'] = generateThemeLayout(sections);

  // Add templates
  theme.templates['index.json'] = generateIndexTemplate(sections);
  theme.templates['page.json'] = generatePageTemplate();
  theme.templates['article.json'] = generateArticleTemplate();
  theme.templates['collection.json'] = generateCollectionTemplate();
  theme.templates['product.json'] = generateProductTemplate();
  theme.templates['cart.json'] = generateCartTemplate();
  theme.templates['404.json'] = generate404Template();

  // Add sections
  for (const section of sections) {
    theme.sections[section.filename] = section.content;
  }

  // Add standard sections
  theme.sections['main-page.liquid'] = generateMainPageSection();
  theme.sections['main-article.liquid'] = generateMainArticleSection();
  theme.sections['main-collection.liquid'] = generateMainCollectionSection();
  theme.sections['main-product.liquid'] = generateMainProductSection();
  theme.sections['main-cart.liquid'] = generateMainCartSection();
  theme.sections['404.liquid'] = generate404Section();

  // Add snippets
  theme.snippets['icon.liquid'] = generateIconSnippet();
  theme.snippets['social-icons.liquid'] = generateSocialIconsSnippet();

  // Add assets
  theme.assets['base.css'] = css;
  theme.assets['theme.js'] = js;

  // Add images
  for (const [filename, buffer] of images) {
    theme.assets[filename] = buffer;
  }

  // Add config
  theme.config['settings_schema.json'] = generateSettingsSchema();
  theme.config['settings_data.json'] = generateSettingsData();

  // Add locales
  theme.locales['en.default.json'] = generateDefaultLocale();

  // Write files to storage
  await writeThemeFiles(jobId, theme);

  return theme;
}

/**
 * Write theme files to storage
 */
async function writeThemeFiles(jobId: string, theme: ThemeStructure): Promise<void> {
  const writeOperations: Promise<string>[] = [];

  for (const [dir, files] of Object.entries(theme)) {
    for (const [filename, content] of Object.entries(files)) {
      const path = `${dir}/${filename}`;
      writeOperations.push(writeFile(jobId, path, content as string | Buffer));
    }
  }

  await Promise.all(writeOperations);
}

/**
 * Generate theme layout
 */
function generateThemeLayout(sections: LiquidSection[]): string {
  const headerSection = sections.find(s => s.name === 'header');
  const footerSection = sections.find(s => s.name === 'footer');

  return `<!doctype html>
<html class="no-js" lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="{{ settings.color_primary }}">
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
    <a class="skip-to-content-link visually-hidden" href="#MainContent">
      {{ "accessibility.skip_to_text" | t }}
    </a>

    ${headerSection ? `{% section 'header' %}` : '{% sections \'header-group\' %}'}

    <main id="MainContent" class="main-content" role="main" tabindex="-1">
      {{ content_for_layout }}
    </main>

    ${footerSection ? `{% section 'footer' %}` : '{% sections \'footer-group\' %}'}

    <script src="{{ 'theme.js' | asset_url }}" defer="defer"></script>
  </body>
</html>`;
}

/**
 * Generate index template
 */
function generateIndexTemplate(sections: LiquidSection[]): string {
  const sectionOrder = sections
    .filter(s => !['header', 'footer'].includes(s.name))
    .map(s => s.name);

  const sectionsObj: Record<string, { type: string; settings: object }> = {};
  for (const name of sectionOrder) {
    sectionsObj[name] = { type: name, settings: {} };
  }

  return JSON.stringify({
    sections: sectionsObj,
    order: sectionOrder,
  }, null, 2);
}

// Helper functions for generating standard templates and sections
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

function generateCollectionTemplate(): string {
  return JSON.stringify({
    sections: {
      main: { type: 'main-collection', settings: {} },
    },
    order: ['main'],
  }, null, 2);
}

function generateProductTemplate(): string {
  return JSON.stringify({
    sections: {
      main: { type: 'main-product', settings: {} },
    },
    order: ['main'],
  }, null, 2);
}

function generateCartTemplate(): string {
  return JSON.stringify({
    sections: {
      main: { type: 'main-cart', settings: {} },
    },
    order: ['main'],
  }, null, 2);
}

function generate404Template(): string {
  return JSON.stringify({
    sections: {
      main: { type: '404', settings: {} },
    },
    order: ['main'],
  }, null, 2);
}

function generateMainPageSection(): string {
  return `<div class="page-content">
  <h1>{{ page.title }}</h1>
  <div class="rte">
    {{ page.content }}
  </div>
</div>

{% schema %}
{
  "name": "Page content",
  "tag": "section",
  "class": "section-page"
}
{% endschema %}`;
}

function generateMainArticleSection(): string {
  return `<article class="article-content">
  <header>
    <h1>{{ article.title }}</h1>
    <time datetime="{{ article.published_at | date: '%Y-%m-%d' }}">
      {{ article.published_at | date: format: 'date' }}
    </time>
  </header>
  <div class="rte">
    {{ article.content }}
  </div>
</article>

{% schema %}
{
  "name": "Article content",
  "tag": "section",
  "class": "section-article"
}
{% endschema %}`;
}

function generateMainCollectionSection(): string {
  return `<div class="collection-content">
  <h1>{{ collection.title }}</h1>
  {% if collection.description != blank %}
    <div class="rte">{{ collection.description }}</div>
  {% endif %}
  
  <div class="products-grid">
    {% for product in collection.products %}
      <div class="product-card">
        <a href="{{ product.url }}">
          {% if product.featured_image %}
            <img src="{{ product.featured_image | image_url: width: 400 }}" alt="{{ product.title }}">
          {% endif %}
          <h3>{{ product.title }}</h3>
          <p>{{ product.price | money }}</p>
        </a>
      </div>
    {% endfor %}
  </div>
  
  {% if paginate.pages > 1 %}
    {% render 'pagination', paginate: paginate %}
  {% endif %}
</div>

{% schema %}
{
  "name": "Collection content",
  "tag": "section",
  "class": "section-collection"
}
{% endschema %}`;
}

function generateMainProductSection(): string {
  return `<div class="product-content">
  <div class="product-gallery">
    {% for image in product.images %}
      <img src="{{ image | image_url: width: 800 }}" alt="{{ image.alt | default: product.title }}">
    {% endfor %}
  </div>
  
  <div class="product-info">
    <h1>{{ product.title }}</h1>
    <p class="product-price">{{ product.price | money }}</p>
    
    {% form 'product', product %}
      {% for variant in product.variants %}
        <input type="radio" name="id" value="{{ variant.id }}" {% if forloop.first %}checked{% endif %}>
        <label>{{ variant.title }}</label>
      {% endfor %}
      
      <button type="submit" name="add">Add to Cart</button>
    {% endform %}
    
    <div class="rte">{{ product.description }}</div>
  </div>
</div>

{% schema %}
{
  "name": "Product content",
  "tag": "section",
  "class": "section-product"
}
{% endschema %}`;
}

function generateMainCartSection(): string {
  return `<div class="cart-content">
  <h1>{{ 'cart.title' | t }}</h1>
  
  {% if cart.item_count > 0 %}
    <form action="{{ routes.cart_url }}" method="post">
      {% for item in cart.items %}
        <div class="cart-item">
          <img src="{{ item.image | image_url: width: 100 }}" alt="{{ item.title }}">
          <div>
            <a href="{{ item.url }}">{{ item.title }}</a>
            <p>{{ item.price | money }}</p>
          </div>
          <input type="number" name="updates[]" value="{{ item.quantity }}" min="0">
          <p>{{ item.line_price | money }}</p>
        </div>
      {% endfor %}
      
      <div class="cart-total">
        <p>Total: {{ cart.total_price | money }}</p>
      </div>
      
      <button type="submit" name="update">Update Cart</button>
      <button type="submit" name="checkout">Checkout</button>
    </form>
  {% else %}
    <p>{{ 'cart.empty' | t }}</p>
  {% endif %}
</div>

{% schema %}
{
  "name": "Cart content",
  "tag": "section",
  "class": "section-cart"
}
{% endschema %}`;
}

function generate404Section(): string {
  return `<div class="page-404">
  <h1>{{ 'general.404.title' | t }}</h1>
  <p>{{ 'general.404.subtext' | t }}</p>
  <a href="{{ routes.root_url }}" class="btn">{{ 'general.404.link' | t }}</a>
</div>

{% schema %}
{
  "name": "404 page",
  "tag": "section",
  "class": "section-404"
}
{% endschema %}`;
}

function generateIconSnippet(): string {
  return `{%- comment -%}
  Icon Snippet
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
  {% when 'cart' %}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon icon-{{ icon }}" width="{{ size | default: 24 }}" height="{{ size | default: 24 }}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
{% endcase %}`;
}

function generateSocialIconsSnippet(): string {
  return `{%- comment -%}
  Social Icons Snippet
  Usage: {% render 'social-icons' %}
{%- endcomment -%}

<div class="social-icons">
  {% if settings.social_facebook_link != blank %}
    <a href="{{ settings.social_facebook_link }}" target="_blank" rel="noopener" aria-label="Facebook">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
      </svg>
    </a>
  {% endif %}
  
  {% if settings.social_instagram_link != blank %}
    <a href="{{ settings.social_instagram_link }}" target="_blank" rel="noopener" aria-label="Instagram">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    </a>
  {% endif %}
  
  {% if settings.social_twitter_link != blank %}
    <a href="{{ settings.social_twitter_link }}" target="_blank" rel="noopener" aria-label="Twitter">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
      </svg>
    </a>
  {% endif %}
</div>`;
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
      name: "Logo",
      settings: [
        {
          type: "image_picker",
          id: "logo",
          label: "Logo image"
        },
        {
          type: "range",
          id: "logo_width",
          label: "Logo width",
          min: 50,
          max: 300,
          step: 10,
          unit: "px",
          default: 150
        }
      ]
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
      name: "Social media",
      settings: [
        {
          type: "url",
          id: "social_facebook_link",
          label: "Facebook"
        },
        {
          type: "url",
          id: "social_instagram_link",
          label: "Instagram"
        },
        {
          type: "url",
          id: "social_twitter_link",
          label: "Twitter"
        }
      ]
    },
    {
      name: "Favicon",
      settings: [
        {
          type: "image_picker",
          id: "favicon",
          label: "Favicon image",
          info: "32 x 32 pixels recommended"
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

function generateDefaultLocale(): string {
  return JSON.stringify({
    general: {
      "404": {
        title: "Page not found",
        subtext: "The page you requested does not exist.",
        link: "Continue shopping"
      }
    },
    cart: {
      title: "Your cart",
      empty: "Your cart is empty"
    },
    accessibility: {
      skip_to_text: "Skip to content"
    }
  }, null, 2);
}
