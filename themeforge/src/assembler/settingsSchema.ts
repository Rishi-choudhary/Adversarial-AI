export interface SettingsSchemaSection {
  name: string;
  settings?: SettingsSchemaField[];
  theme_name?: string;
  theme_version?: string;
  theme_author?: string;
  theme_documentation_url?: string;
  theme_support_url?: string;
}

export interface SettingsSchemaField {
  type: string;
  id: string;
  label: string;
  default?: string | number | boolean;
  info?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string; label: string }[];
}

/**
 * Generate the complete settings_schema.json content
 */
export function generateSettingsSchema(options: {
  themeName?: string;
  themeVersion?: string;
  themeAuthor?: string;
  additionalSections?: SettingsSchemaSection[];
} = {}): string {
  const {
    themeName = 'ThemeForge Theme',
    themeVersion = '1.0.0',
    themeAuthor = 'ThemeForge',
    additionalSections = [],
  } = options;

  const schema: SettingsSchemaSection[] = [
    // Theme info
    {
      name: 'theme_info',
      theme_name: themeName,
      theme_version: themeVersion,
      theme_author: themeAuthor,
      theme_documentation_url: 'https://themeforge.app/docs',
      theme_support_url: 'https://themeforge.app/support',
    },
    
    // Logo settings
    {
      name: 'Logo',
      settings: [
        {
          type: 'image_picker',
          id: 'logo',
          label: 'Logo image',
        },
        {
          type: 'range',
          id: 'logo_width',
          label: 'Logo width',
          min: 50,
          max: 300,
          step: 10,
          unit: 'px',
          default: 150,
        },
      ],
    },
    
    // Color settings
    {
      name: 'Colors',
      settings: [
        {
          type: 'header',
          id: 'color_header_primary',
          label: 'Primary colors',
        },
        {
          type: 'color',
          id: 'color_primary',
          label: 'Primary color',
          default: '#f97316',
          info: 'Used for buttons, links, and accents',
        },
        {
          type: 'color',
          id: 'color_primary_contrast',
          label: 'Primary contrast',
          default: '#ffffff',
          info: 'Text color on primary backgrounds',
        },
        {
          type: 'header',
          id: 'color_header_secondary',
          label: 'Secondary colors',
        },
        {
          type: 'color',
          id: 'color_secondary',
          label: 'Secondary color',
          default: '#1e293b',
        },
        {
          type: 'color',
          id: 'color_secondary_contrast',
          label: 'Secondary contrast',
          default: '#ffffff',
        },
        {
          type: 'header',
          id: 'color_header_general',
          label: 'General colors',
        },
        {
          type: 'color',
          id: 'color_background',
          label: 'Background color',
          default: '#ffffff',
        },
        {
          type: 'color',
          id: 'color_background_secondary',
          label: 'Secondary background',
          default: '#f8fafc',
        },
        {
          type: 'color',
          id: 'color_text',
          label: 'Text color',
          default: '#121212',
        },
        {
          type: 'color',
          id: 'color_text_secondary',
          label: 'Secondary text',
          default: '#64748b',
        },
        {
          type: 'color',
          id: 'color_border',
          label: 'Border color',
          default: '#e2e8f0',
        },
      ],
    },
    
    // Typography settings
    {
      name: 'Typography',
      settings: [
        {
          type: 'font_picker',
          id: 'font_body',
          label: 'Body font',
          default: 'system-ui',
        },
        {
          type: 'range',
          id: 'font_body_size',
          label: 'Base font size',
          min: 14,
          max: 20,
          step: 1,
          unit: 'px',
          default: 16,
        },
        {
          type: 'font_picker',
          id: 'font_heading',
          label: 'Heading font',
          default: 'system-ui',
        },
        {
          type: 'select',
          id: 'font_heading_weight',
          label: 'Heading weight',
          default: '700',
          options: [
            { value: '400', label: 'Regular' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi-bold' },
            { value: '700', label: 'Bold' },
          ],
        },
      ],
    },
    
    // Layout settings
    {
      name: 'Layout',
      settings: [
        {
          type: 'range',
          id: 'page_width',
          label: 'Page width',
          min: 1000,
          max: 1600,
          step: 50,
          unit: 'px',
          default: 1200,
        },
        {
          type: 'range',
          id: 'section_spacing',
          label: 'Section spacing',
          min: 20,
          max: 100,
          step: 10,
          unit: 'px',
          default: 60,
        },
        {
          type: 'range',
          id: 'border_radius',
          label: 'Border radius',
          min: 0,
          max: 20,
          step: 2,
          unit: 'px',
          default: 8,
        },
      ],
    },
    
    // Buttons settings
    {
      name: 'Buttons',
      settings: [
        {
          type: 'select',
          id: 'button_style',
          label: 'Button style',
          default: 'filled',
          options: [
            { value: 'filled', label: 'Filled' },
            { value: 'outline', label: 'Outline' },
            { value: 'text', label: 'Text only' },
          ],
        },
        {
          type: 'range',
          id: 'button_border_radius',
          label: 'Button border radius',
          min: 0,
          max: 50,
          step: 2,
          unit: 'px',
          default: 8,
        },
        {
          type: 'select',
          id: 'button_text_transform',
          label: 'Button text style',
          default: 'none',
          options: [
            { value: 'none', label: 'Normal' },
            { value: 'uppercase', label: 'Uppercase' },
          ],
        },
      ],
    },
    
    // Social media settings
    {
      name: 'Social media',
      settings: [
        {
          type: 'header',
          id: 'social_header',
          label: 'Social media links',
        },
        {
          type: 'url',
          id: 'social_facebook_link',
          label: 'Facebook',
          info: 'https://facebook.com/yourpage',
        },
        {
          type: 'url',
          id: 'social_instagram_link',
          label: 'Instagram',
          info: 'https://instagram.com/yourhandle',
        },
        {
          type: 'url',
          id: 'social_twitter_link',
          label: 'Twitter',
          info: 'https://twitter.com/yourhandle',
        },
        {
          type: 'url',
          id: 'social_youtube_link',
          label: 'YouTube',
        },
        {
          type: 'url',
          id: 'social_tiktok_link',
          label: 'TikTok',
        },
        {
          type: 'url',
          id: 'social_linkedin_link',
          label: 'LinkedIn',
        },
        {
          type: 'url',
          id: 'social_pinterest_link',
          label: 'Pinterest',
        },
      ],
    },
    
    // Favicon
    {
      name: 'Favicon',
      settings: [
        {
          type: 'image_picker',
          id: 'favicon',
          label: 'Favicon image',
          info: '32 x 32 pixels recommended. PNG format with transparency.',
        },
      ],
    },
    
    // Cart settings
    {
      name: 'Cart',
      settings: [
        {
          type: 'select',
          id: 'cart_type',
          label: 'Cart type',
          default: 'drawer',
          options: [
            { value: 'drawer', label: 'Drawer' },
            { value: 'page', label: 'Page' },
          ],
        },
        {
          type: 'checkbox',
          id: 'cart_show_vendor',
          label: 'Show vendor',
          default: false,
        },
      ],
    },
    
    // Custom CSS/JS
    {
      name: 'Custom code',
      settings: [
        {
          type: 'checkbox',
          id: 'enable_custom_css',
          label: 'Enable custom CSS',
          default: false,
        },
        {
          type: 'textarea',
          id: 'custom_css',
          label: 'Custom CSS',
          info: 'Add custom CSS styles',
        },
        {
          type: 'textarea',
          id: 'custom_head_js',
          label: 'Custom head JavaScript',
          info: 'JavaScript added to the head (runs before page loads)',
        },
        {
          type: 'textarea',
          id: 'custom_body_js',
          label: 'Custom body JavaScript',
          info: 'JavaScript added before closing body tag',
        },
      ],
    },
    
    // Add any additional sections
    ...additionalSections,
  ];

  return JSON.stringify(schema, null, 2);
}

/**
 * Generate settings_data.json content
 */
export function generateSettingsData(currentSettings: Record<string, unknown> = {}): string {
  const defaultSettings = {
    color_primary: '#f97316',
    color_primary_contrast: '#ffffff',
    color_secondary: '#1e293b',
    color_secondary_contrast: '#ffffff',
    color_background: '#ffffff',
    color_background_secondary: '#f8fafc',
    color_text: '#121212',
    color_text_secondary: '#64748b',
    color_border: '#e2e8f0',
    logo_width: 150,
    font_body_size: 16,
    font_heading_weight: '700',
    page_width: 1200,
    section_spacing: 60,
    border_radius: 8,
    button_style: 'filled',
    button_border_radius: 8,
    button_text_transform: 'none',
    cart_type: 'drawer',
    cart_show_vendor: false,
    enable_custom_css: false,
  };

  return JSON.stringify({
    current: {
      ...defaultSettings,
      ...currentSettings,
    },
  }, null, 2);
}
