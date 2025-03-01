/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns after successfully depositing amount in client's balance
 */
const depositMoney = async (req, res) => {
    const { Profile, Job, Contract } = req.app.get('models');
    const { userId } = req.params;
    const { amount } = req.body;

    if (amount <= 0) {
        return res.status(400).json({ message: 'Deposit amount must be greater than 0' });
    }

    try {
        const client = await Profile.findOne({ 
            where: { 
                id: userId, 
                type: 'client'
            }
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        } 

        /** Fetching all the balance associated with unpaid jobs having in_progress contracts */
        const unpaidJobs = await Job.findAll({
            where: { paid: null },
            include: {
                model: Contract,
                where: {
                    ClientId: userId,
                    status: 'in_progress',
                },
            },
        });

        const totalUnpaid = unpaidJobs.reduce((sum, job) => sum + job.price, 0);
        const maxDeposit = totalUnpaid * 0.25;

        if (amount > maxDeposit) {
            return res.status(400).json({
                message: `Deposit cannot exceed 25% of the total unpaid jobs as max allowed is Rs${maxDeposit}`,
            });
        }

        await Profile.update(
            { balance: client.balance + amount },
            { where: { id: userId } }
        );

        return res.status(200).json({ message: 'Deposit successful' });
    } catch (error) {
        console.error("Error while depositing amount in client's balance", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    depositMoney,
}
