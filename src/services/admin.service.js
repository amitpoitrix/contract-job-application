const { Sequelize } = require('sequelize');

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns best profession
 */
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
            return res.status(404).json({ message: 'No profession found with given date range' });
        }

        return res.json({
            profession: bestProfession.profession,
            totalEarned: bestProfession.totalEarned
        });

    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns best clients
 */
const getBestClients = async (req, res) => {
    const { Profile } = req.app.get('models');
    const { start, end } = req.query;
    
    if (!start || !end) {
        return res.status(400).json({ message: 'Start and End date is not present. Please provide it in YYYY-MM-DD format' });
    }

    try {
        const bestClients = await Profile.findAll({
            where: { type: 'client' },
            attributes: [
                'id',
                [Sequelize.literal("firstName || ' ' || lastName"), 'fullName'],
                [Sequelize.literal(`(
                    SELECT SUM(Jobs.price) 
                    FROM Jobs 
                    INNER JOIN Contracts ON Jobs.ContractId = Contracts.id 
                    WHERE Contracts.ClientId = Profile.id 
                    AND Jobs.paid = 1
                    AND Jobs.paymentDate BETWEEN '${start}' AND '${end}'
                )`), 'paid']
            ],
            group: ['Profile.id'],
            order: [[Sequelize.literal('paid'), 'DESC']],
            limit: 2,
            raw: true
        });

        if(!bestClients.length) {
            return res.status(404).json({ message: 'No clients found with given date range' });
        }

        return res.json(bestClients);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getBestProfession,
    getBestClients
}