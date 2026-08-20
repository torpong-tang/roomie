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

const withApiRevision = (path: string, method?: string) => {
    if (method && method.toUpperCase() !== 'GET') return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}roomieApi=v2`;
};

export const apiFetch = (path: string, init: RequestInit = {}) => fetch(
    apiPath(withApiRevision(path, init.method)),
    {
        ...init,
        credentials: 'include',
        cache: 'no-store',
    }
);

export const readJson = async <T>(response: Response): Promise<T> => {
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    if (!contentType.includes('application/json')) {
        throw new Error(
            `Roomie API returned ${response.status} ${response.statusText || 'an invalid response'}. Please refresh and try again.`
        );
    }
    return response.json() as Promise<T>;
};

export const assetPath = (path?: string | null) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
    // Existing Roomie records may contain the former `/roomie/api/...` value.
    // Normalize it so the same row renders through root-path Vercel and /roomie.
    const normalizedPath = path.startsWith('/roomie/api/') ? path.slice('/roomie'.length) : path;
    if (normalizedPath.startsWith('/api/')) return apiPath(normalizedPath);
    return appPath(path);
};
