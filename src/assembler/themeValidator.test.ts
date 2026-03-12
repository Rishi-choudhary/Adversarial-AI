import * as fs from 'fs';
import * as path from 'path';
import { validateTheme, validateSectionFile, ValidationReport } from './themeValidator';

// Use /tmp for test fixtures to avoid committing them
const TEST_THEME_DIR = '/tmp/test-theme';

describe('themeValidator', () => {
  beforeEach(() => {
    // Clean up and create test directory structure
    if (fs.existsSync(TEST_THEME_DIR)) {
      fs.rmSync(TEST_THEME_DIR, { recursive: true });
    }
    
    // Create theme directory structure
    const dirs = [
      'sections',
      'snippets',
      'layout',
      'templates',
      'assets',
      'config',
      'locales'
    ];
    
    for (const dir of dirs) {
      fs.mkdirSync(path.join(TEST_THEME_DIR, dir), { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_THEME_DIR)) {
      fs.rmSync(TEST_THEME_DIR, { recursive: true });
    }
  });

  describe('validateTheme', () => {
    it('should return error for non-existent theme directory', async () => {
      const result = await validateTheme('/non/existent/path');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Theme directory does not exist')
      );
    });

    it('should report missing required files', async () => {
      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual('Missing required file: layout/theme.liquid');
      expect(result.errors).toContainEqual('Missing required file: templates/index.json');
      expect(result.errors).toContainEqual('Missing required file: config/settings_schema.json');
      expect(result.errors).toContainEqual('Missing required file: config/settings_data.json');
      expect(result.errors).toContainEqual('Missing required file: locales/en.default.json');
    });

    it('should pass with all required files present', async () => {
      // Create all required files
      createRequiredFiles();
      
      // Create a valid section file
      const sectionContent = `
<div class="header">
  {{ section.settings.title }}
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing schema in section files', async () => {
      createRequiredFiles();
      
      // Create a section file without schema
      const sectionContent = `
<div class="header">
  {{ section.settings.title }}
</div>
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual('Missing {% schema %} in header.liquid');
    });

    it('should detect invalid JSON in schema blocks', async () => {
      createRequiredFiles();
      
      // Create a section file with invalid JSON schema
      const sectionContent = `
<div class="header">
  {{ section.settings.title }}
</div>
{% schema %}
{
  "name": "Header",
  "settings": [], // trailing comma and comment
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Invalid schema JSON in header.liquid')
      );
    });

    it('should detect unbalanced output tags {{ }}', async () => {
      createRequiredFiles();
      
      // Create a section file with unbalanced {{ }} tags
      const sectionContent = `
<div class="header">
  {{ section.settings.title 
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Unbalanced {{ }} tags in header.liquid')
      );
    });

    it('should detect unbalanced logic tags {% %}', async () => {
      createRequiredFiles();
      
      // Create a section file with unbalanced {% %} tags
      const sectionContent = `
<div class="header">
  {% if section.settings.show
    {{ section.settings.title }}
  {% endif %}
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Unbalanced {% %} tags in header.liquid')
      );
    });

    it('should detect unbalanced block tags (if/endif)', async () => {
      createRequiredFiles();
      
      // Create a section file with missing endif
      const sectionContent = `
<div class="header">
  {% if section.settings.show %}
    {{ section.settings.title }}
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Unbalanced if/endif tags in header.liquid')
      );
    });

    it('should warn about missing assets', async () => {
      createRequiredFiles();
      
      // Create a section file referencing a non-existent asset
      const sectionContent = `
<div class="header">
  <img src="{{ 'missing-image.png' | asset_url }}">
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.warnings).toContainEqual(
        'Missing asset: missing-image.png referenced in header.liquid'
      );
    });

    it('should not warn when assets exist', async () => {
      createRequiredFiles();
      
      // Create the asset
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'assets', 'existing-image.png'),
        'fake image data'
      );
      
      // Create a section file referencing the existing asset
      const sectionContent = `
<div class="header">
  <img src="{{ 'existing-image.png' | asset_url }}">
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR);
      
      expect(result.warnings).not.toContainEqual(
        expect.stringContaining('existing-image.png')
      );
    });

    it('should auto-fix invalid JSON when enabled', async () => {
      createRequiredFiles();
      
      // Create a section file with fixable JSON issues
      const sectionContent = `
<div class="header">
  {{ section.settings.title }}
</div>
{% schema %}
{
  "name": "Header",
  "settings": [], // trailing comma
}
{% endschema %}
`;
      fs.writeFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        sectionContent
      );

      const result = await validateTheme(TEST_THEME_DIR, { autoFix: true });
      
      expect(result.valid).toBe(true);
      expect(result.autoFixed).toBeDefined();
      expect(result.autoFixed).toContainEqual(
        expect.objectContaining({
          file: 'header.liquid',
          issue: 'Invalid schema JSON'
        })
      );

      // Verify the file was actually fixed
      const fixedContent = fs.readFileSync(
        path.join(TEST_THEME_DIR, 'sections', 'header.liquid'),
        'utf-8'
      );
      const schemaMatch = fixedContent.match(
        /\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/
      );
      expect(schemaMatch).not.toBeNull();
      expect(() => JSON.parse(schemaMatch![1])).not.toThrow();
    });
  });

  describe('validateSectionFile', () => {
    it('should return error for non-existent file', () => {
      const result = validateSectionFile('/non/existent/file.liquid');
      
      expect(result.errors).toContainEqual(
        expect.stringContaining('File does not exist')
      );
    });

    it('should validate a valid section file', () => {
      createRequiredFiles();
      
      const sectionContent = `
<div class="header">
  {{ section.settings.title }}
</div>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
`;
      const filePath = path.join(TEST_THEME_DIR, 'sections', 'test.liquid');
      fs.writeFileSync(filePath, sectionContent);

      const result = validateSectionFile(filePath);
      
      expect(result.errors).toHaveLength(0);
    });

    it('should detect issues in a single section file', () => {
      createRequiredFiles();
      
      const sectionContent = `
<div class="header">
  {{ section.settings.title
</div>
`;
      const filePath = path.join(TEST_THEME_DIR, 'sections', 'test.liquid');
      fs.writeFileSync(filePath, sectionContent);

      const result = validateSectionFile(filePath);
      
      expect(result.errors).toContainEqual(
        expect.stringContaining('Missing {% schema %}')
      );
      expect(result.errors).toContainEqual(
        expect.stringContaining('Unbalanced {{ }} tags')
      );
    });
  });
});

/**
 * Helper function to create all required theme files
 */
function createRequiredFiles(): void {
  // layout/theme.liquid
  fs.writeFileSync(
    path.join(TEST_THEME_DIR, 'layout', 'theme.liquid'),
    `
<!DOCTYPE html>
<html>
<head>
  {{ content_for_header }}
</head>
<body>
  {{ content_for_layout }}
</body>
</html>
`
  );

  // templates/index.json
  fs.writeFileSync(
    path.join(TEST_THEME_DIR, 'templates', 'index.json'),
    JSON.stringify({
      sections: {},
      order: []
    }, null, 2)
  );

  // config/settings_schema.json
  fs.writeFileSync(
    path.join(TEST_THEME_DIR, 'config', 'settings_schema.json'),
    JSON.stringify([
      {
        name: "theme_info",
        theme_name: "Test Theme",
        theme_version: "1.0.0"
      }
    ], null, 2)
  );

  // config/settings_data.json
  fs.writeFileSync(
    path.join(TEST_THEME_DIR, 'config', 'settings_data.json'),
    JSON.stringify({
      current: {},
      presets: {}
    }, null, 2)
  );

  // locales/en.default.json
  fs.writeFileSync(
    path.join(TEST_THEME_DIR, 'locales', 'en.default.json'),
    JSON.stringify({
      general: {}
    }, null, 2)
  );
}
