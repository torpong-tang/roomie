const normalizeBasePath = (value: string | undefined) => {
    if (value === undefined) return '/roomie';
    const trimmed = value.trim();
    if (!trimmed || trimmed === '/') return '';
    return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
};

const normalizeOrigin = (value: string | undefined) => value?.trim().replace(/\/+$/, '') || '';

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
export const apiOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_API_URL);

const withLeadingSlash = (path: string) => path.startsWith('/') ? path : `/${path}`;

export const appPath = (path: string) => {
    const normalizedPath = withLeadingSlash(path);
    if (!basePath) return normalizedPath;
    return normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)
        ? normalizedPath
        : `${basePath}${normalizedPath}`;
};

export const apiPath = (path: string) => {
    const normalizedPath = withLeadingSlash(path);
    return apiOrigin ? `${apiOrigin}${normalizedPath}` : appPath(normalizedPath);
};

export const apiFetch = (path: string, init: RequestInit = {}) => fetch(apiPath(path), {
    ...init,
    credentials: 'include',
});

export const assetPath = (path?: string | null) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
    // Existing Roomie records may contain the former `/roomie/api/...` value.
    // Normalize it so the same row renders through root-path Vercel and /roomie.
    const normalizedPath = path.startsWith('/roomie/api/') ? path.slice('/roomie'.length) : path;
    if (normalizedPath.startsWith('/api/')) return apiPath(normalizedPath);
    return appPath(path);
};
