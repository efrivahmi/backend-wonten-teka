const MAX_TIMER = 2 ** 31 - 1;
const timers = new Set();

export const eventAlarmSupported = () =>
    typeof window !== 'undefined' && 'Notification' in window;

export const eventAlarmPermission = () =>
    eventAlarmSupported() ? Notification.permission : 'unsupported';

export async function enableEventAlarms() {
    if (!eventAlarmSupported()) return false;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
    }
    return true;
}

const scheduleAt = (timestamp, callback) => {
    const remaining = timestamp - Date.now();
    if (remaining <= 0) {
        callback();
        return;
    }
    const timer = window.setTimeout(() => {
        timers.delete(timer);
        scheduleAt(timestamp, callback);
    }, Math.min(remaining, MAX_TIMER));
    timers.add(timer);
};

const notify = async (title, body, eventId) => {
    if (eventAlarmPermission() !== 'granted') return;
    const options = {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: `company-event-${eventId}`,
        renotify: true,
        data: { url: '/employee/calendar' },
    };
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
    } else {
        new Notification(title, options);
    }
};

export function scheduleEventAlarms(events) {
    timers.forEach(clearTimeout);
    timers.clear();
    if (eventAlarmPermission() !== 'granted') return;

    events.forEach(event => {
        const datePart = String(event.start_date || '').slice(0, 10);
        const timePart = String(event.start_time || '09:00:00').slice(0, 8);
        const start = new Date(`${datePart}T${timePart}`);
        if (Number.isNaN(start.getTime())) return;
        const reminders = [
            { at: start.getTime() - 15 * 60 * 1000, label: '15 menit lagi' },
            { at: start.getTime(), label: 'sekarang' },
        ];
        reminders.forEach(reminder => scheduleAt(reminder.at, () => notify(
            `Agenda perusahaan: ${event.title}`,
            `${reminder.label} • ${event.description || 'Jangan lewatkan kegiatan ini.'}`,
            event.id,
        )));
    });
}
