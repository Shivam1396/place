const router = require('express').Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const { protect, allow } = require('../middleware/auth');
const auth = require('../controllers/authController');
const test = require('../controllers/testController');
const analytics = require('../controllers/analyticsController');
const interview = require('../controllers/interviewController');
const resume = require('../controllers/resumeController');
const chat = require('../controllers/chatController');
const companies = require('../config/companies');

// Auth
router.post('/auth/register', auth.register); fbbmsfgmsdfm
router.post('/auth/login', auth.login);
router.get('/auth/me', protect, auth.me);
router.put('/auth/profile', protect, auth.updateProfile);

router.get('/companies', (_, res) => res.json(Object.keys(companies)));

// Adaptive tests
router.post('/tests/start', protect, test.start);
router.post('/tests/:id/answer', protect, test.answer);
router.get('/tests/history', protect, test.history);

// Analytics
router.get('/analytics/student', protect, analytics.student);
router.get('/analytics/faculty', protect, allow('faculty', 'admin'), analytics.faculty);
router.get('/analytics/placement', protect, allow('faculty', 'admin'), analytics.placement);

// AI mock interview
router.post('/interview/start', protect, interview.start);
router.post('/interview/:id/reply', protect, interview.reply);
router.post('/interview/:id/finish', protect, interview.finish);
router.get('/interview/history', protect, interview.history);

// Resume ATS
router.get('/resume/roles', protect, resume.roles);
router.post('/resume/analyze', protect, upload.single('resume'), resume.analyze);
router.get('/resume/history', protect, resume.history);

// Chatbot
router.post('/chat', protect, chat.chat);

module.exports = router;
