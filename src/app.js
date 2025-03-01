const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile');
const {getAllContracts} = require('./services/contracts.service')
const {getAllUnpaidJobs, jobPaymentByClient} = require('./services/jobs.service')
const {depositMoney} = require('./services/balances.service')
const {getBestProfession, getBestClients} = require('./services/admin.service')

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
app.get('/contracts', getProfile, getAllContracts);

/**
 * @returns all the unpaid jobs for a active contract user's
 */
app.get('/jobs/unpaid', getProfile, getAllUnpaidJobs);

/**
 * @return after successfull payment for the job by client
 */
app.post('/jobs/:job_id/pay', getProfile, jobPaymentByClient);

/**
 * @returns after successfully depositing amount in client's balance
 */
app.post('/balances/deposit/:userId', getProfile, depositMoney);

/**
 * @returns best profession based on date range
 */
app.get('/admin/best-profession', getProfile, getBestProfession);

/**
 * @returns best clients based on date range
 */
app.get('/admin/best-clients', getProfile, getBestClients);


module.exports = app;
