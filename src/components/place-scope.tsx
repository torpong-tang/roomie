'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { apiPath } from '@/lib/paths';
import { useSession } from '@/components/session-provider';
import { useTranslation } from '@/components/translation-provider';

export type Place = { id: string; key: string };

/**
 * Every data view is scoped to a place: an admin picks one, a place session is
 * pinned to its own. Returns the selection plus the places available to choose from.
 */
export function usePlaceScope() {
    const { user, status, isAdmin } = useSession();
    const [places, setPlaces] = useState<Place[]>([]);
    const [placeId, setPlaceId] = useState('');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (status !== 'ready') return;
        if (!user) {
            setReady(true);
            return;
        }

        let cancelled = false;
        const load = async () => {
            try {
                const response = await fetch(apiPath('/api/places'));
                const data: Place[] = response.ok ? await response.json() : [];
                if (cancelled) return;
                setPlaces(data);
                if (user.role === 'place' && user.placeId) {
                    setPlaceId(user.placeId);
                } else if (data.length > 0) {
                    setPlaceId((current) => current || data[0].id);
                }
            } catch {
                if (!cancelled) setPlaces([]);
            } finally {
                if (!cancelled) setReady(true);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [status, user]);

    return { places, placeId, setPlaceId, isAdmin, ready };
}

export function PlaceSelect({
    places,
    value,
    onChange,
    disabled,
    tourId,
}: {
    places: Place[];
    value: string;
    onChange: (placeId: string) => void;
    disabled?: boolean;
    tourId?: string;
}) {
    const { t } = useTranslation();

    return (
        <label className="relative" data-tour={tourId}>
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300" />
            <select
                aria-label={t('place.label')}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className="glass-input min-w-[185px] rounded-full bg-slate-800 py-3 pl-11 pr-9 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
                {places.length === 0 ? <option value="">{t('place.none')}</option> : null}
                {places.map((place) => <option key={place.id} value={place.id}>{place.key}</option>)}
            </select>
        </label>
    );
}
