import { LiquidSection } from '../converter/liquidGenerator';

/**
 * Generate the main theme.liquid layout file
 */
export function generateThemeLayout(options: {
  sections?: LiquidSection[];
  includeAnnouncement?: boolean;
  includeSearch?: boolean;
} = {}): string {
  const {
    sections = [],
    includeAnnouncement = false,
    includeSearch = false,
  } = options;

  const headerSection = sections.find(s => s.name === 'header');
  const footerSection = sections.find(s => s.name === 'footer');

  return `<!doctype html>
<html class="no-js" lang="{{ request.locale.iso_code }}" dir="{{ request.locale.text_direction }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="{{ settings.color_primary }}">
    
    <link rel="canonical" href="{{ canonical_url }}">
    <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>

    {%- if settings.favicon != blank -%}
      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
    {%- endif -%}

    {%- unless settings.font_body.system? -%}
      <link rel="preconnect" href="https://fonts.shopifycdn.com" crossorigin>
    {%- endunless -%}

    <title>
      {{ page_title }}
      {%- if current_tags %} &ndash; {{ 'general.meta.tags' | t: tags: current_tags | join: ', ' }}{% endif -%}
      {%- if current_page != 1 %} &ndash; {{ 'general.meta.page' | t: page: current_page }}{% endif -%}
      {%- unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless -%}
    </title>

    {% if page_description %}
      <meta name="description" content="{{ page_description | escape }}">
    {% endif %}

    {% render 'meta-tags' %}

    <script src="{{ 'global.js' | asset_url }}" defer="defer"></script>
    {{ content_for_header }}

    {%- liquid
      assign body_font_bold = settings.font_body | font_modify: 'weight', 'bold'
      assign body_font_italic = settings.font_body | font_modify: 'style', 'italic'
      assign body_font_bold_italic = body_font_bold | font_modify: 'style', 'italic'
    %}

    {% style %}
      {{ settings.font_body | font_face: font_display: 'swap' }}
      {{ body_font_bold | font_face: font_display: 'swap' }}
      {{ body_font_italic | font_face: font_display: 'swap' }}
      {{ body_font_bold_italic | font_face: font_display: 'swap' }}
      {{ settings.font_heading | font_face: font_display: 'swap' }}

      :root {
        --font-body-family: {{ settings.font_body.family }}, {{ settings.font_body.fallback_families }};
        --font-body-style: {{ settings.font_body.style }};
        --font-body-weight: {{ settings.font_body.weight }};
        --font-body-size: {{ settings.font_body_size }}px;

        --font-heading-family: {{ settings.font_heading.family }}, {{ settings.font_heading.fallback_families }};
        --font-heading-style: {{ settings.font_heading.style }};
        --font-heading-weight: {{ settings.font_heading_weight }};

        --color-primary: {{ settings.color_primary }};
        --color-primary-contrast: {{ settings.color_primary_contrast }};
        --color-secondary: {{ settings.color_secondary }};
        --color-secondary-contrast: {{ settings.color_secondary_contrast }};
        --color-background: {{ settings.color_background }};
        --color-background-secondary: {{ settings.color_background_secondary }};
        --color-text: {{ settings.color_text }};
        --color-text-secondary: {{ settings.color_text_secondary }};
        --color-border: {{ settings.color_border }};

        --page-width: {{ settings.page_width }}px;
        --section-spacing: {{ settings.section_spacing }}px;
        --border-radius: {{ settings.border_radius }}px;
        --button-border-radius: {{ settings.button_border_radius }}px;
      }
    {% endstyle %}

    {{ 'base.css' | asset_url | stylesheet_tag }}

    {%- if settings.enable_custom_css -%}
      <style>{{ settings.custom_css }}</style>
    {%- endif -%}

    {%- if settings.custom_head_js != blank -%}
      <script>{{ settings.custom_head_js }}</script>
    {%- endif -%}
  </head>

  <body class="template-{{ template.name | handle }}{% if template.suffix %} template-{{ template.name }}-{{ template.suffix }}{% endif %}">
    <a class="skip-to-content-link visually-hidden" href="#MainContent">
      {{ 'accessibility.skip_to_text' | t }}
    </a>

    ${includeAnnouncement ? `{%- if settings.show_announcement -%}
      {% section 'announcement-bar' %}
    {%- endif -%}` : ''}

    ${headerSection ? `{% section 'header' %}` : `{% sections 'header-group' %}`}

    <main id="MainContent" class="main-content" role="main" tabindex="-1">
      {{ content_for_layout }}
    </main>

    ${footerSection ? `{% section 'footer' %}` : `{% sections 'footer-group' %}`}

    {%- if settings.cart_type == 'drawer' -%}
      {% section 'cart-drawer' %}
    {%- endif -%}

    <script src="{{ 'theme.js' | asset_url }}" defer="defer"></script>

    {%- if settings.custom_body_js != blank -%}
      <script>{{ settings.custom_body_js }}</script>
    {%- endif -%}
  </body>
</html>`;
}

/**
 * Generate password layout
 */
export function generatePasswordLayout(): string {
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

    <title>{{ shop.name }}</title>

    {{ content_for_header }}
    {{ 'base.css' | asset_url | stylesheet_tag }}
  </head>

  <body class="template-password">
    <main id="MainContent" class="password-main" role="main">
      {{ content_for_layout }}
    </main>
  </body>
</html>`;
}

/**
 * Generate checkout layout (for Shopify Plus)
 */
export function generateCheckoutLayout(): string {
  return `<!doctype html>
<html lang="{{ locale }}" dir="{{ direction }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">

    {{ content_for_header }}
  </head>

  <body>
    {{ content_for_layout }}
  </body>
</html>`;
}
