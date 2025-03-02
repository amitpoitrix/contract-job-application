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
            Job: {
                findOne: jest.fn(),
                update: jest.fn(),
            },
            Contract: {},
            Profile: {
                update: jest.fn(),
            },
        },
        close: jest.fn(),
    },
}));

jest.setTimeout(10000);

describe('POST /jobs/:job_id/pay', () => {
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
    });

    it('should make a successful payment for the job by the client', async () => {
        const mockJob = {
            id: 1,
            price: 100,
            Contract: {
                status: 'in_progress',
                ClientId: 1,
                Client: { id: 1, balance: 200 },
                Contractor: { id: 2, balance: 50 },
            },
        };

        sequelize.models.Job.findOne.mockResolvedValue(mockJob);
        sequelize.models.Profile.update.mockResolvedValue([1]);
        sequelize.models.Job.update.mockResolvedValue([1]);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .post('/jobs/1/pay')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Payment successful' });

        expect(sequelize.models.Profile.update).toHaveBeenCalledWith(
            { balance: 100 },
            { where: { id: 1 }, transaction: expect.anything() }
        );

        expect(sequelize.models.Profile.update).toHaveBeenCalledWith(
            { balance: 150 },
            { where: { id: 2 }, transaction: expect.anything() }
        );

        expect(sequelize.models.Job.update).toHaveBeenCalledWith(
            { paid: true, paymentDate: expect.any(Date) },
            { where: { id: 1 }, transaction: expect.anything() }
        );
    });

    it('should return 404 if job is not found or already paid', async () => {
        sequelize.models.Job.findOne.mockResolvedValue(null);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .post('/jobs/1/pay')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({ message: 'Job not found or already paid' });
    });

    it('should return 400 if client has insufficient balance', async () => {
        const mockJob = {
            id: 1,
            price: 300,
            Contract: {
                status: 'in_progress',
                ClientId: 1,
                Client: { id: 1, balance: 100 },
                Contractor: { id: 2, balance: 50 },
            },
        };

        sequelize.models.Job.findOne.mockResolvedValue(mockJob);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .post('/jobs/1/pay')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(400);
        expect(res.body).toEqual({ message: 'Insufficient balance' });
    });

    it('should return 500 on internal server error', async () => {
        sequelize.models.Job.findOne.mockRejectedValue(new Error('DB error'));

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .post('/jobs/1/pay')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'Internal server error' });
    });
});
