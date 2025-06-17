const moment = require('moment-timezone');

// @desc    Get all available timezones
// @route   GET /api/v1/timezones
// @access  Public
const getTimezones = async (req, res, next) => {
    try {
        const timezones = moment.tz.names().map(tz => {
            const zone = moment.tz.zone(tz);
            const currentOffset = moment().tz(tz).format('Z');

            return {
                value: tz,
                label: `${tz.replace(/_/g, ' ')} (UTC${currentOffset})`,
                offset: currentOffset,
                region: tz.split('/')[0]
            };
        });

        // Group by region for better UX
        const groupedTimezones = timezones.reduce((acc, tz) => {
            if (!acc[tz.region]) {
                acc[tz.region] = [];
            }
            acc[tz.region].push(tz);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                timezones: groupedTimezones,
                all: timezones
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTimezones
};
