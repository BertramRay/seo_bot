declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'staging' | 'test';
      PORT?: string;
      DATABASE_URI: string;
      DATABASE_NAME: string;
      SESSION_SECRET: string;
      GITHUB_CLIENT_ID?: string;
      GITHUB_CLIENT_SECRET?: string;
      GITHUB_CALLBACK_URL?: string;
      ADMIN_EMAIL?: string;
      OPENAI_API_KEY?: string;
      BLOG_TITLE?: string;
      BLOG_DESCRIPTION?: string;
      SITE_URL?: string;
      BLOG_PATH?: string;
      DOMAIN_BASE_DOMAIN?: string;
      DOMAIN_RAILWAY_DOMAIN?: string;
    }
  }
}

export {}; 