const { Sequelize } = require('sequelize');

const getBestProfession = async (req, res) => {
    const { Profile } = req.app.get('models');
    const { start, end } = req.query;

    if (!start || !end) {
        return res.status(400).json({ message: 'Start and End date is not present. Please provide it in YYYY-MM-DD format' });
    }

    try {
        const bestProfession = await Profile.findOne({
            where: { type: 'contractor' },
            attributes: [
                'profession',
                [
                    Sequelize.literal(`(
                        SELECT SUM(Jobs.price) 
                        FROM Jobs 
                        INNER JOIN Contracts ON Jobs.ContractId = Contracts.id 
                        WHERE Contracts.ContractorId = Profile.id 
                        AND Jobs.paid = 1
                        AND Jobs.paymentDate BETWEEN '${start}' AND '${end}'
                    )`),
                    'totalEarned'
                ]
            ],
            group: ['profession'],
            having: Sequelize.literal(`totalEarned IS NOT NULL`),
            order: [[Sequelize.literal('totalEarned'), 'DESC']],
            limit: 1,
            raw: true
        });

        if (!bestProfession) {
            return res.status(404).json({ message: 'No profession found out with given date range' });
        }

        return res.json({
            profession: bestProfession.profession,
            totalEarned: bestProfession.totalEarned
        });

    } catch (error) {
        console.error("Error while fetching best profession", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getBestProfession
}