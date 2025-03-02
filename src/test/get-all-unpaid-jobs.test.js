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
        models: {
            Job: {
                findAll: jest.fn(),
            },
            Contract: {},
        },
        close: jest.fn(),
    },
}));

jest.setTimeout(10000);

describe('GET /jobs/unpaid', () => {
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
    });

    it('should return all unpaid jobs for a client', async () => {
        const mockUnpaidJobs = [
            { id: 1, paid: null, Contract: { id: 1, ClientId: 1, status: 'in_progress' } },
            { id: 2, paid: null, Contract: { id: 2, ClientId: 1, status: 'in_progress' } },
        ];

        sequelize.models.Job.findAll.mockResolvedValue(mockUnpaidJobs);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/jobs/unpaid')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockUnpaidJobs);
    });

    it('should return all unpaid jobs for a contractor', async () => {
        const mockUnpaidJobs = [
            { id: 3, paid: null, Contract: { id: 3, ContractorId: 2, status: 'in_progress' } },
        ];

        sequelize.models.Job.findAll.mockResolvedValue(mockUnpaidJobs);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 2, type: 'contractor' };
            next();
        });

        const res = await request(server)
            .get('/jobs/unpaid')
            .set('profile_id', '2');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockUnpaidJobs);
    });

    it('should return 404 if no unpaid jobs found', async () => {
        sequelize.models.Job.findAll.mockResolvedValue([]);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/jobs/unpaid')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({ message: 'No unpaid jobs found' });
    });

    it('should return 500 on internal server error', async () => {
        sequelize.models.Job.findAll.mockRejectedValue(new Error('DB error'));

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/jobs/unpaid')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'Internal Server Error' });
    });
});
