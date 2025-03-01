const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile');
const { Sequelize } = require('sequelize');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models');
    const {id: contractId} = req.params;
    const profileId = req.profile.id;

    const contract = await Contract.findOne({
        where: {
            id: contractId,
            [req.profile.type === 'client' ? 'ClientId': 'ContractorId']: profileId
        }
    });
    
    if(!contract) return res.status(404).end();

    res.json(contract);
})


/**
 * @returns all the non-terminated contracts
 */
app.get('/contracts', getProfile, async (req, res) => {
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

        if(!contracts) {
            return res.status(404).json({message: "Contracts not found"});
        }

        res.json(contracts);

    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

module.exports = app;
