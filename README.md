# OneDrive Vercel Index Plus

OneDrive Vercel Index with the latest dependencies and Vercel Blob.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/angr6908/onedrive-vercel-index-plus&project-name=onedrive-vercel-index-plus&repository-name=onedrive-vercel-index-plus)

## Vercel deployment

1. Import this repository into Vercel.
2. Open the Storage tab and connect a Vercel Blob store to this project.
3. Add the environment variables below.
4. Deploy, open the site, and finish the OAuth flow.

Required:

```dotenv
CLIENT_ID="YOUR_CLIENT_ID"
OBFUSCATED_CLIENT_SECRET="YOUR_OBFUSCATED_CLIENT_SECRET"
```

The default Microsoft OAuth callback URL is `http://localhost:3000`, matching the previous deployment behavior. If your
Microsoft app registration uses a different callback, set it explicitly:

```dotenv
REDIRECT_URI="http://localhost:3000"
```

Optional:

```dotenv
CLIENT_SECRET=""
AUTH_API="https://login.microsoftonline.com/common/oauth2/v2.0/token"
DRIVE_API="https://graph.microsoft.com/v1.0/me/drive"
SCOPE="user.read files.read.all offline_access"
CACHE_CONTROL_HEADER="max-age=0, s-maxage=60, stale-while-revalidate"
SITE_ICON="/icons/128.png"
SITE_TITLE="OneDrive"
BASE_DIRECTORY="/"
MAX_ITEMS="100"
SITE_FOOTER='Powered by <a href="https://github.com/angr6908/onedrive-vercel-index-plus" target="_blank" rel="noopener noreferrer">onedrive-vercel-index-plus</a>.'
PROTECTED_ROUTES="[]"
SITE_EMAIL=""
SITE_LINKS="[]"
DATETIME_FORMAT="YYYY-MM-DD HH:mm:ss"
GOOGLE_FONT_SANS="Inter"
GOOGLE_FONT_MONO="Fira Mono"
GOOGLE_FONT_LINKS='["https://fonts.googleapis.com/css2?family=Fira+Mono&family=Inter:wght@400;500;700&display=swap"]'
AUTH_TOKEN_BLOB_PATH="onedrive-auth-tokens.json"
```

## License

This repository is distributed under the MIT License.
