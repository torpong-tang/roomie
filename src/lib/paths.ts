export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/roomie';

const withLeadingSlash = (path: string) => path.startsWith('/') ? path : `/${path}`;

export const appPath = (path: string) => {
    const normalizedPath = withLeadingSlash(path);
    return normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)
        ? normalizedPath
        : `${basePath}${normalizedPath}`;
};

export const apiPath = (path: string) => appPath(path);

export const assetPath = (path?: string | null) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
    return appPath(path);
};
