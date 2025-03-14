// 认证相关配置
interface AuthConfig {
  github?: {
    clientID?: string;
    clientSecret?: string;
    callbackURL: string;
  };
  session: {
    secret: string;
    resave: boolean;
    saveUninitialized: boolean;
    cookie: {
      secure: boolean;
      maxAge: number;
    }
  }
}

const authConfig: AuthConfig = {
  github: {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'seo_bot_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 一周
    }
  }
};

export default authConfig; 