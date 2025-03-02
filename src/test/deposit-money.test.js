const request = require('supertest');
const http = require('http');
const app = require('../app');
const { sequelize } = require('../model');
const { getProfile } = require('../middleware/getProfile');

jest.mock('../middleware/getProfile', () => ({
    getProfile: jest.fn(),
}));

jest.mock('../model', () => ({
    sequelize: {
        transaction: jest.fn((callback) => callback()),
        models: {
            Profile: {
                findOne: jest.fn(),
                update: jest.fn(),
            },
            Job: {
                findAll: jest.fn(),
            },
        },
        close: jest.fn(),
    },
}));

describe('POST /balances/deposit/:userId', () => {
    let server;

    beforeAll(() => {
        server = http.createServer(app);
    });

    afterAll(() => {
        server.close();
        sequelize.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        sequelize.transaction.mockImplementation(async (callback) => {
            const t = { id: 'mock-transaction' };
            return await callback(t);
        });

        getProfile.mockImplementation((req, res, next) => {
            req.profile = { id: '1', type: 'client' };
            next();
        });
    });

    it('should successfully deposit amount in client balance', async () => {
        sequelize.models.Profile.findOne.mockResolvedValue({ id: '1', balance: 100 });
        sequelize.models.Profile.update.mockResolvedValue([1]);
        sequelize.models.Job.findAll.mockResolvedValue([{ price: 200 }]);

        const res = await request(server)
            .post('/balances/deposit/1')
            .send({ amount: 50 })
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Deposit successful' });

        expect(sequelize.models.Profile.update).toHaveBeenCalledWith(
            { balance: 150 },
            { where: { id: '1' } }
        );
    });

    it('should return 400 if deposit amount is invalid', async () => {
        const res = await request(server)
            .post('/balances/deposit/1')
            .send({ amount: 0 })
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(400);
        expect(res.body).toEqual({ message: 'Deposit amount must be greater than 0' });
    });

    it('should return 404 if client not found', async () => {
        sequelize.models.Profile.findOne.mockResolvedValue(null);

        const res = await request(server)
            .post('/balances/deposit/1')
            .send({ amount: 50 })
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({ message: 'Client not found' });
    });

    it('should return 400 if deposit exceeds 25% of unpaid jobs', async () => {
        sequelize.models.Profile.findOne.mockResolvedValue({ id: '1', balance: 100 });
        sequelize.models.Job.findAll.mockResolvedValue([{ price: 100 }]);

        const res = await request(server)
            .post('/balances/deposit/1')
            .send({ amount: 30 })
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(400);
        expect(res.body).toEqual({ message: 'Deposit cannot exceed 25% of the total unpaid jobs as max allowed is Rs25' });
    });

    it('should return 500 on internal server error', async () => {
        sequelize.models.Profile.findOne.mockRejectedValue(new Error('DB error'));

        const res = await request(server)
            .post('/balances/deposit/1')
            .send({ amount: 50 })
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'Internal server error' });
    });
});
