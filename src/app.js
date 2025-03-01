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

    return res.json(contract);
});


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

        if(!contracts.length) {
            return res.status(404).json({message: "Contracts not found"});
        }

        return res.json(contracts);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


/**
 * @returns all the unpaid jobs for a active contract user's
 */
app.get('/jobs/unpaid', getProfile, async(req, res) => {
    const {Job, Contract} = req.app.get('models');
    const profileId = req.profile.id;

    try {
        const unpaidJobs = await Job.findAll({
            where: {
                [Sequelize.Op.or]: [
                    { paid: false },
                    { paid: null }
                ],
            },
            include: {
                model: Contract,
                where: {
                    status: 'in_progress',
                    [req.profile.type === 'client' ? 'ClientId': 'ContractorId']: profileId
                }
            }
        });
        
        if(!unpaidJobs.length) {
            return res.status(404).json({message: "No unpaid jobs found"});
        }
        
        return res.json(unpaidJobs);
    } catch (error) {
        console.error('Error fetching unpaid jobs: ', error);
        return res.status(500).json({message: 'Internal Server Error'});
    }
});

module.exports = app;
