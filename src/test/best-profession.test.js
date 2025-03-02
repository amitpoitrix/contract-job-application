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
            Profile: {
                findOne: jest.fn(),
            },
        },
        close: jest.fn(),
    },
}));

describe('GET /admin/best-profession', () => {
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
        getProfile.mockImplementation((req, res, next) => {
            req.profile = { id: '1', type: 'client' };
            next();
        });
    });

    it('should return the best profession based on date range', async () => {
        sequelize.models.Profile.findOne.mockResolvedValue({
            profession: 'Programmer',
            totalEarned: 5000,
        });

        const res = await request(server)
            .get('/admin/best-profession?start=2023-01-01&end=2023-12-31')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({
            profession: 'Programmer',
            totalEarned: 5000,
        });
    });

    it('should return 400 if start or end date is not provided', async () => {
        const res = await request(server)
            .get('/admin/best-profession?start=2023-01-01')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(400);
        expect(res.body).toEqual({ message: 'Start and End date is not present. Please provide it in YYYY-MM-DD format' });
    });

    it('should return 404 if no profession is found', async () => {
        sequelize.models.Profile.findOne.mockResolvedValue(null);

        const res = await request(server)
            .get('/admin/best-profession?start=2023-01-01&end=2023-12-31')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({ message: 'No profession found with given date range' });
    });

    it('should return 500 on internal server error', async () => {
        sequelize.models.Profile.findOne.mockRejectedValue(new Error('DB error'));

        const res = await request(server)
            .get('/admin/best-profession?start=2023-01-01&end=2023-12-31')
            .set('profile_id', '1');

        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'Internal server error' });
    });
});
