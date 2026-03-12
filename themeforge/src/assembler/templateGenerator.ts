import { LiquidSection } from '../converter/liquidGenerator';

export interface Template {
  name: string;
  filename: string;
  content: string;
}

/**
 * Generate index.json template
 */
export function generateIndexTemplate(sections: LiquidSection[]): Template {
  const sectionOrder = sections
    .filter(s => !['header', 'footer'].includes(s.name))
    .map(s => s.name);

  const sectionsObj: Record<string, { type: string; settings: object }> = {};
  for (const name of sectionOrder) {
    sectionsObj[name] = { type: name, settings: {} };
  }

  return {
    name: 'index',
    filename: 'index.json',
    content: JSON.stringify({
      sections: sectionsObj,
      order: sectionOrder,
    }, null, 2),
  };
}

/**
 * Generate page.json template
 */
export function generatePageTemplate(): Template {
  return {
    name: 'page',
    filename: 'page.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-page', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate article.json template
 */
export function generateArticleTemplate(): Template {
  return {
    name: 'article',
    filename: 'article.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-article', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate blog.json template
 */
export function generateBlogTemplate(): Template {
  return {
    name: 'blog',
    filename: 'blog.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-blog', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate collection.json template
 */
export function generateCollectionTemplate(): Template {
  return {
    name: 'collection',
    filename: 'collection.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-collection', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate product.json template
 */
export function generateProductTemplate(): Template {
  return {
    name: 'product',
    filename: 'product.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-product', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate cart.json template
 */
export function generateCartTemplate(): Template {
  return {
    name: 'cart',
    filename: 'cart.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-cart', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate search.json template
 */
export function generateSearchTemplate(): Template {
  return {
    name: 'search',
    filename: 'search.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-search', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate list-collections.json template
 */
export function generateListCollectionsTemplate(): Template {
  return {
    name: 'list-collections',
    filename: 'list-collections.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'main-list-collections', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate 404.json template
 */
export function generate404Template(): Template {
  return {
    name: '404',
    filename: '404.json',
    content: JSON.stringify({
      sections: {
        main: { type: '404', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate password.json template
 */
export function generatePasswordTemplate(): Template {
  return {
    name: 'password',
    filename: 'password.json',
    content: JSON.stringify({
      sections: {
        main: { type: 'password', settings: {} },
      },
      order: ['main'],
    }, null, 2),
  };
}

/**
 * Generate all standard templates
 */
export function generateAllTemplates(sections: LiquidSection[]): Template[] {
  return [
    generateIndexTemplate(sections),
    generatePageTemplate(),
    generateArticleTemplate(),
    generateBlogTemplate(),
    generateCollectionTemplate(),
    generateProductTemplate(),
    generateCartTemplate(),
    generateSearchTemplate(),
    generateListCollectionsTemplate(),
    generate404Template(),
    generatePasswordTemplate(),
  ];
}

/**
 * Generate customer templates (account, login, register, etc.)
 */
export function generateCustomerTemplates(): Template[] {
  const templates: Template[] = [];

  const customerPages = [
    { name: 'account', type: 'main-account' },
    { name: 'login', type: 'main-login' },
    { name: 'register', type: 'main-register' },
    { name: 'addresses', type: 'main-addresses' },
    { name: 'order', type: 'main-order' },
    { name: 'activate_account', type: 'main-activate' },
    { name: 'reset_password', type: 'main-reset-password' },
  ];

  for (const page of customerPages) {
    templates.push({
      name: `customers/${page.name}`,
      filename: `customers/${page.name}.json`,
      content: JSON.stringify({
        sections: {
          main: { type: page.type, settings: {} },
        },
        order: ['main'],
      }, null, 2),
    });
  }

  return templates;
}
