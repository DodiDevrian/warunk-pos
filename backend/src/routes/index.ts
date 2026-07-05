import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as auth from '../controllers/authController.js';
import * as category from '../controllers/categoryController.js';
import * as product from '../controllers/productController.js';
import * as partner from '../controllers/partnerController.js';
import * as sale from '../controllers/saleController.js';
import * as purchase from '../controllers/purchaseController.js';
import * as inventory from '../controllers/inventoryController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as report from '../controllers/reportController.js';
import * as user from '../controllers/userController.js';
import * as setting from '../controllers/settingController.js';

const router = Router();
const ADMIN = 'administrator';
const OWNER = 'owner';
const KASIR = 'kasir';

// ---- Auth (public) ----
router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPassword);

// ---- Everything below requires a valid token ----
router.use(authenticate);

router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);
router.post('/auth/change-password', auth.changePassword);

// ---- Dashboard ----
router.get('/dashboard/stats', dashboard.stats);
router.get('/dashboard/sales-chart', dashboard.salesChart);
router.get('/dashboard/top-products', dashboard.topProducts);
router.get('/dashboard/payment-breakdown', dashboard.paymentBreakdown);
router.get('/dashboard/recent-activity', dashboard.recentActivity);

// ---- Categories ----
router.get('/categories', category.list);
router.post('/categories', authorize(ADMIN), category.create);
router.put('/categories/:id', authorize(ADMIN), category.update);
router.delete('/categories/:id', authorize(ADMIN), category.remove);

// ---- Products ----
router.get('/products', product.list);
router.get('/products/barcode/:code', product.getByBarcode);
router.get('/products/:id', product.getOne);
router.post('/products', authorize(ADMIN), upload.single('image'), product.create);
router.put('/products/:id', authorize(ADMIN), upload.single('image'), product.update);
router.delete('/products/:id', authorize(ADMIN), product.remove);

// ---- Suppliers ----
router.get('/suppliers', partner.listSuppliers);
router.get('/suppliers/:id/history', partner.supplierHistory);
router.post('/suppliers', authorize(ADMIN), partner.createSupplier);
router.put('/suppliers/:id', authorize(ADMIN), partner.updateSupplier);
router.delete('/suppliers/:id', authorize(ADMIN), partner.removeSupplier);

// ---- Customers ----
router.get('/customers', partner.listCustomers);
router.get('/customers/:id/history', partner.customerHistory);
router.post('/customers', partner.createCustomer);
router.put('/customers/:id', partner.updateCustomer);
router.delete('/customers/:id', authorize(ADMIN), partner.removeCustomer);

// ---- Inventory ----
router.get('/inventory/movements', inventory.listMovements);
router.get('/inventory/low-stock', inventory.lowStock);
router.post('/inventory/adjust', authorize(ADMIN, KASIR), inventory.adjust);

// ---- Sales (POS) ----
router.get('/sales', sale.list);
router.get('/sales/:id', sale.getOne);
router.post('/sales', authorize(ADMIN, KASIR), sale.create);

// ---- Purchases ----
router.get('/purchases', purchase.list);
router.get('/purchases/:id', purchase.getOne);
router.post('/purchases', authorize(ADMIN), purchase.create);

// ---- Reports (owner + admin) ----
router.get('/reports/sales', authorize(ADMIN, OWNER), report.salesReport);
router.get('/reports/purchases', authorize(ADMIN, OWNER), report.purchaseReport);
router.get('/reports/products', authorize(ADMIN, OWNER), report.productReport);
router.get('/reports/stock', authorize(ADMIN, OWNER), report.stockReport);
router.get('/reports/customers', authorize(ADMIN, OWNER), report.customerReport);
router.get('/reports/suppliers', authorize(ADMIN, OWNER), report.supplierReport);
router.get('/reports/profit-loss', authorize(ADMIN, OWNER), report.profitLossReport);

// ---- Users (admin) ----
router.get('/users/roles', authorize(ADMIN), user.listRoles);
router.get('/users', authorize(ADMIN), user.list);
router.post('/users', authorize(ADMIN), user.create);
router.put('/users/:id', authorize(ADMIN), user.update);
router.delete('/users/:id', authorize(ADMIN), user.remove);
router.put('/profile', upload.single('avatar'), user.updateProfile);

// ---- Settings ----
router.get('/settings', setting.get);
router.put('/settings', authorize(ADMIN), upload.single('logo'), setting.update);
router.get('/notifications', setting.listNotifications);
router.post('/notifications/read-all', setting.markAllRead);

export default router;
