const MeetingTypeDefinition = require('../models/MeetingTypeDefinition');
const Meeting = require('../models/Meeting');

function getNextNDates(availableDays, n = 30) {
    const dates = [];
    let date = new Date();
    for (let i = 0; dates.length < n; i++) {
        const d = new Date(date);
        d.setDate(date.getDate() + i);
        if (availableDays.includes(d.getDay())) {
            dates.push(d.toISOString().split('T')[0]);
        }
    }
    return dates;
}

function generateSlots(meetingType, date, bookedTimes) {
    const slots = [];
    meetingType.availableTimeSlots.forEach(slot => {
        const [startHour, startMin] = slot.start.split(':').map(Number);
        const [endHour, endMin] = slot.end.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        for (let time = startTime; time + meetingType.defaultDuration <= endTime; time += meetingType.defaultDuration) {
            const hours = Math.floor(time / 60);
            const minutes = time % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            if (!bookedTimes.includes(timeString)) {
                slots.push(timeString);
            }
        }
    });
    return slots;
}

exports.handlePublicSchedule = async (req, res, next) => {
    try {
        const meetingTypeId = req.body.meetingTypeId || req.query.meetingTypeId;
        // Validate meetingTypeId format
        if (
            !meetingTypeId ||
            meetingTypeId === 'undefined' ||
            meetingTypeId === 'null' ||
            typeof meetingTypeId !== 'string' ||
            !meetingTypeId.match(/^[a-f\d]{24}$/i)
        ) {
            return res.status(400).json({ success: false, message: 'A valid meetingTypeId is required.' });
        }

        // Try to find the meeting type
        const meetingType = await MeetingTypeDefinition.findById(meetingTypeId).lean();
        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: `Meeting type not found for ID: ${meetingTypeId}`
            });
        }

        const booking = req.body.booking;

        // If booking is not included, return meeting info and slots
        if (!booking) {
            const availableDates = getNextNDates(meetingType.availableDays, 30);
            const availableSlots = {};
            for (const date of availableDates) {
                const meetings = await Meeting.find({
                    meetingTypeId: meetingTypeId,
                    date: date,
                    status: { $nin: ['cancelled'] }
                }).select('time');
                const bookedTimes = meetings.map(m => m.time);
                availableSlots[date] = generateSlots(meetingType, date, bookedTimes);
            }
            return res.json({
                success: true,
                meetingType: {
                    id: meetingType._id,
                    name: meetingType.name,
                    description: meetingType.description,
                    duration: meetingType.defaultDuration,
                    color: meetingType.color,
                    organizer: meetingType.organizer || {
                        name: 'Meeting Organizer',
                        title: '',
                        avatar: null
                    },
                    availableDates,
                    availableSlots
                }
            });
        }

        // Booking logic
        const { date, time, guestInfo } = booking;
        if (!date || !time || !guestInfo || !guestInfo.name || !guestInfo.email) {
            return res.status(400).json({ success: false, message: 'Booking requires date, time, and guestInfo (name, email)' });
        }
        // Check if slot is available
        const existingMeeting = await Meeting.findOne({
            meetingTypeId,
            date,
            time,
            status: { $nin: ['cancelled'] }
        });
        if (existingMeeting) {
            return res.status(409).json({ success: false, message: 'This time slot is no longer available.' });
        }
        // Create booking (ensure all required fields for Meeting schema)
        const meeting = await Meeting.create({
            meetingTypeId,
            meetingOwnerId: meetingType.createdBy,
            userId: meetingType.createdBy, // <-- Ensure userId is set
            title: `${meetingType.name} with ${booking.guestInfo.name}`,
            date: booking.date,
            time: booking.time,
            duration: meetingType.defaultDuration,
            guestInfo: booking.guestInfo,
            status: 'confirmed',
            scheduledAt: new Date(`${booking.date}T${booking.time}:00.000Z`), // <-- Ensure scheduledAt is set
            organizer: {
                name: meetingType.organizer?.name || 'Meeting Organizer', // <-- Ensure organizer.name is set
                email: meetingType.organizer?.email || 'no-reply@example.com' // <-- Ensure organizer.email is set
            }
        });

        await MeetingTypeDefinition.findByIdAndUpdate(meetingTypeId, { $inc: { totalBookings: 1 } });

        return res.status(201).json({
            success: true,
            message: 'Meeting booked successfully!',
            booking: {
                bookingId: meeting._id,
                meetingDetails: {
                    name: meetingType.name,
                    date: booking.date,
                    time: booking.time,
                    duration: meetingType.defaultDuration,
                    organizer: meetingType.organizer?.name || 'Meeting Organizer'
                },
                confirmationSent: true
            }
        });
    } catch (error) {
        next(error);
    }
};
