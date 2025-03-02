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
                findOne: jest.fn(),
            },
        },
        close: jest.fn(),
    },
}));

describe('GET /contracts/:id', () => {
    let server;

    beforeAll(() => {
        server = http.createServer(app);
    });

    afterAll(() => {
        server.close();
        sequelize.close();
    });

    it('should return a contract if found', async () => {
        const mockContract = { id: 1, ClientId: 1, ContractorId: 2 };
        sequelize.models.Contract.findOne.mockResolvedValue(mockContract);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/contracts/1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockContract);
    });

    it('should return 404 if contract not found', async () => {
        sequelize.models.Contract.findOne.mockResolvedValue(null);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/contracts/999');

        expect(res.statusCode).toEqual(404);
    });

    it('should search by ContractorId if profile type is contractor', async () => {
        const mockContract = { id: 1, ClientId: 1, ContractorId: 2 };
        sequelize.models.Contract.findOne.mockResolvedValue(mockContract);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 2, type: 'contractor' };
            next();
        });

        const res = await request(server)
            .get('/contracts/1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockContract);
    });

    it('should search by ClientId if profile type is client', async () => {
        const mockContract = { id: 1, ClientId: 1, ContractorId: 2 };
        sequelize.models.Contract.findOne.mockResolvedValue(mockContract);

        getProfile.mockImplementationOnce((req, res, next) => {
            req.profile = { id: 1, type: 'client' };
            next();
        });

        const res = await request(server)
            .get('/contracts/1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockContract);
    });
});
