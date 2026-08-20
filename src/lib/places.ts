import { getAccessCode } from '@/lib/auth';

export const MIN_CODE_LENGTH = 6;

/** Never expose the stored hashes to the client, only whether a view code exists. */
export const PLACE_SELECT = {
    id: true,
    key: true,
    isActive: true,
    createdAt: true,
    viewCodeHash: true,
} as const;

type PlaceRow = { viewCodeHash: string | null } & Record<string, unknown>;

export const toPlaceResponse = ({ viewCodeHash, ...place }: PlaceRow) => ({
    ...place,
    hasViewCode: Boolean(viewCodeHash),
});

export const validateCode = (code: string, label: string) => {
    if (code.length < MIN_CODE_LENGTH) {
        return `${label} must be at least ${MIN_CODE_LENGTH} characters`;
    }
    if (code === getAccessCode()) {
        return `${label} must differ from the admin access code`;
    }
    return null;
};
