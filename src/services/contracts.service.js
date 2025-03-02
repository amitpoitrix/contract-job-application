const { Sequelize } = require('sequelize');

const getAllContracts = async (req, res) => {
    const {Contract} = req.app.get('models');
    const profileId = req.profile.id;

    try {
        const contracts = await Contract.findAll({
            where: {
                [req.profile.type === 'client' ? 'ClientId': 'ContractorId']: profileId,
                status: {
                    [Sequelize.Op.not]: 'terminated'
                }
            }
        });

        if(!contracts.length) {
            return res.status(404).json({message: "Contracts not found"});
        }

        return res.json(contracts);
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = {
    getAllContracts
}