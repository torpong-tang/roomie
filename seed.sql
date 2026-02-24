-- Clear existing data
DELETE FROM Booking;
DELETE FROM Room;

-- Insert 4 meeting rooms with images
INSERT INTO Room (id, name, capacity, description, image, createdAt, updatedAt)
VALUES 
('room1', 'The Modern Glass', 12, 'A premium, modern glass-walled meeting room with panoramic views.', '/rooms/room1.png', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('room2', 'Creative Lounge', 8, 'A cozy, creative meeting space with colorful furniture and plants.', '/rooms/room2.png', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('room3', 'Grand Executive', 20, 'A large, luxury conference hall with a marble table and leather chairs.', '/rooms/room3.png', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('room4', 'Focus Pod', 4, 'A small, minimalist focus room perfect for quick syncs or private calls.', '/rooms/room4.png', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample bookings for today (2026-02-01)
INSERT INTO Booking (id, roomId, title, startTime, endTime, user, createdAt, updatedAt)
VALUES 
('b1', 'room1', 'Morning Sync', '2026-02-01T09:00:00.000Z', '2026-02-01T10:00:00.000Z', 'Alice', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('b2', 'room2', 'Lunch Meeting', '2026-02-01T12:00:00.000Z', '2026-02-01T13:00:00.000Z', 'Bob', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('b3', 'room3', 'Executive Review', '2026-02-01T16:00:00.000Z', '2026-02-01T17:00:00.000Z', 'Charlie', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
