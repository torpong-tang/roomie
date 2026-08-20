export type BootstrapPlace = {
    id: string;
    key: string;
};

export type BootstrapRoom = {
    id: string;
    name: string;
    image?: string | null;
    placeId?: string | null;
};

export type BootstrapBooking = {
    id: string;
    roomId: string;
    title: string;
    startTime: string;
    endTime: string;
    user: string;
    contact?: string | null;
    room: BootstrapRoom;
};

/** Initial calendar data delivered with the session to avoid chained API requests. */
export type RoomieBootstrap = {
    placeId: string;
    places: BootstrapPlace[];
    rooms: BootstrapRoom[];
    bookings: BootstrapBooking[];
};
