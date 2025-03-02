const {sequelize} = require('../model')

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns all unpaid jobs
 */
const getAllUnpaidJobs = async(req, res) => {
    const {Job, Contract} = req.app.get('models');
    const profileId = req.profile.id;

    try {
        const unpaidJobs = await Job.findAll({
            where: {
                paid: null
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
        return res.status(500).json({message: 'Internal Server Error'});
    }
}


/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns after successfull payment for the job by client
 */
const jobPaymentByClient = async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const { profile } = req;
    const { job_id } = req.params;

    try {
        const job = await Job.findOne({
            where: { 
                id: job_id, 
                paid: null 
            },
            include: {
                model: Contract,
                where: {
                    status: 'in_progress',
                    ClientId: profile.id,
                },
                include: [
                    { 
                        model: Profile, 
                        as: 'Client' 
                    },
                    { 
                        model: Profile,
                        as: 'Contractor' 
                    },
                ],
            },
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found or already paid' });
        }

        const client = job.Contract.Client;
        const contractor = job.Contract.Contractor;

        if (client.balance < job.price) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        await sequelize.transaction(async (t) => {
            await Profile.update(
                { balance: client.balance - job.price },
                { where: { id: client.id }, transaction: t }
            );

            await Profile.update(
                { balance: contractor.balance + job.price },
                { where: { id: contractor.id }, transaction: t }
            );

            await Job.update(
                { paid: true, paymentDate: new Date() },
                { where: { id: job.id }, transaction: t }
            );
        });

        return res.status(200).json({ message: 'Payment successful' });

    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    getAllUnpaidJobs,
    jobPaymentByClient
}