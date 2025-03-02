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
            Contract: {
                findAll: jest.fn(),
            },
        },
        close: jest.fn(),
    },
}));

describe('GET /contracts', () => {
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

    it('should return all non-terminated contracts for a client', async () => {
        const mockContracts = [
            { id: 1, ClientId: 1, status: 'new' },
            { id: 2, ClientId: 1, status: 'in_progress' },
        ];

        sequelize.models.Contract.findAll.mockResolvedValue(mockContracts);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/contracts');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockContracts);
    });

    it('should return all non-terminated contracts for a contractor', async () => {
        const mockContracts = [
            { id: 3, ContractorId: 2, status: 'new' },
        ];

        sequelize.models.Contract.findAll.mockResolvedValue(mockContracts);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 2, type: 'contractor' };
            next();
        });

        const res = await request(server)
            .get('/contracts');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockContracts);
    });

    it('should return 404 if no contracts found', async () => {
        sequelize.models.Contract.findAll.mockResolvedValue([]);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/contracts');

        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({ message: "Contracts not found" });
    });

    it('should return 500 on internal server error', async () => {
        sequelize.models.Contract.findAll.mockRejectedValue(new Error('DB error'));

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/contracts')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'Internal Server Error' });
    });
});
