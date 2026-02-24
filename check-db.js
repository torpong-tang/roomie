const Database = require('better-sqlite3');
const db = new Database('/home/hulky/projects/appstart/dev.db');

try {
    const rooms = db.prepare('SELECT * FROM Room').all();
    console.log('Rooms:', rooms);

    const bookings = db.prepare('SELECT * FROM Booking').all();
    console.log('Bookings count:', bookings.length);
    bookings.forEach(b => console.log(`- ${b.title} by ${b.user} at ${b.startTime}`));
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
