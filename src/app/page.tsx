import { prisma } from '@/lib/prisma';
import {
  executeBillingRun,
  settleInvoicePayment,
  advanceSubStatus,
  logoutUser,
  updatePlanPricing,
  createCustomPlan,
  deletePlan,
  createSimpleProduct,
  updateProductDetails,
  toggleProductStock,
  deleteProduct,
  updateSubscriptionItemPrice,
  changePassword,
  createStaffMember,
  enrollInSubscriptionPlan
} from './actions';
import CustomerProductStore from './CustomerProductStore';
import {
  Layers,
  FileText,
  AlertTriangle,
  ArrowRightCircle,
  RefreshCw,
  TrendingUp,
  Package,
  CreditCard,
  DollarSign,
  LogOut,
  UserCircle,
  CalendarDays,
  Save,
  PlusCircle,
  CheckCircle,
  XCircle,
  Trash2,
  ImageIcon,
  Clock,
  PieChart,
  Users,
  KeyRound,
  ShieldPlus,
  UserCheck,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const instant = false;

interface PageProps {
  searchParams: Promise<{ tab?: string; error?: string; success?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session_user_id')?.value;

  if (!userId) {
    redirect('/login');
  }

  const loggedInUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!loggedInUser) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || (loggedInUser.role === 'CUSTOMER' ? 'items' : 'items');
  const tabError = resolvedParams.error;
  const tabSuccess = resolvedParams.success;

  const isAdmin = loggedInUser.role === 'ADMIN';
  const isStaff = loggedInUser.role === 'STAFF';
  const isCustomer = loggedInUser.role === 'CUSTOMER';
  const canEdit = isAdmin || isStaff;

  const [subs, invoices, payments, products, plans, users, staffMembers] = await Promise.all([
    prisma.subscription.findMany({
      where: isCustomer ? { customerId: loggedInUser.id } : {},
      include: {
        customer: true,
        plan: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: isCustomer ? { customerId: loggedInUser.id } : {},
      include: { customer: true, payments: true, subscription: true },
      orderBy: { issueDate: 'desc' },
    }),
    prisma.payment.findMany({
      where: isCustomer ? { invoice: { customerId: loggedInUser.id } } : {},
      include: {
        invoice: {
          include: { customer: true },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.product.findMany({
      include: {
        subItems: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.plan.findMany({
      include: {
        subscriptions: {
          include: {
            items: true
          }
        }
      },
      orderBy: { price: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        invoices: true,
        subscriptions: true
      }
    }),
    prisma.user.findMany({
      where: { role: 'STAFF' },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const activeSubs = subs.filter(s => s.status === 'ACTIVE');
  const customerActivePlan = isCustomer && activeSubs.length > 0 ? activeSubs[0].plan : null;

  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalRevenue);
  const overdueInvoices = invoices.filter(inv => inv.status !== 'PAID' && new Date(inv.dueDate) < new Date());

  const subscriptionGrossRunRate = activeSubs.reduce((acc, s) => {
    const itemsTotal = s.items.reduce((sum, item) => sum + item.subtotal, 0);
    return acc + itemsTotal + (s.plan.price || 0);
  }, 0);

  const productAnalytics = products.map(prod => {
    const totalUnitsSold = prod.subItems.reduce((acc, item) => acc + item.quantity, 0);
    const nominalRevenue = totalUnitsSold * prod.salesPrice;
    const effectivePrice = prod.salesPrice * (1 - (prod.discountPercent || 0) / 100);
    const grossSales = totalUnitsSold * effectivePrice;
    const discountGiven = nominalRevenue - grossSales;
    const totalCost = totalUnitsSold * prod.costPrice;
    const grossProfit = grossSales - totalCost;
    const profitMargin = grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : '0.0';

    return {
      id: prod.id,
      name: prod.name,
      type: prod.type,
      salesPrice: prod.salesPrice,
      effectivePrice,
      discountPercent: prod.discountPercent || 0,
      discountGiven,
      inStock: prod.inStock,
      unitsSold: totalUnitsSold,
      grossSales,
      totalCost,
      grossProfit,
      profitMargin,
    };
  });

  const totalProductUnitsSold = productAnalytics.reduce((acc, p) => acc + p.unitsSold, 0);
  const totalProductGrossRevenue = productAnalytics.reduce((acc, p) => acc + p.grossSales, 0);
  const totalProductGrossProfit = productAnalytics.reduce((acc, p) => acc + p.grossProfit, 0);
  const totalProductDiscounts = productAnalytics.reduce((acc, p) => acc + p.discountGiven, 0);

  const intervalAnalytics = plans.map(plan => {
    const planActiveSubs = plan.subscriptions.filter(s => s.status === 'ACTIVE');
    const subscriberCount = plan.subscriptions.length;
    const activeSubscriberCount = planActiveSubs.length;
    const basePlanMRR = activeSubscriberCount * (plan.price || 0);
    const attachedItemsMRR = planActiveSubs.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.subtotal, 0);
    }, 0);
    const totalIntervalRunRate = basePlanMRR + attachedItemsMRR;

    return {
      id: plan.id,
      name: plan.name,
      interval: plan.interval,
      baseFee: plan.price || 0,
      subscriberCount,
      activeSubscriberCount,
      totalIntervalRunRate
    };
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation & Header with Top-Right Subscription Pill */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 text-white px-6 py-3.5 rounded-xl gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <UserCircle className="w-6 h-6 text-indigo-400" />
            <div>
              <p className="text-sm font-semibold">{loggedInUser.name}</p>
              <p className="text-xs text-slate-400 font-mono">{loggedInUser.email}</p>
            </div>
            <span className={`ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${isAdmin ? 'bg-indigo-900 text-indigo-200 border border-indigo-700' :
                isStaff ? 'bg-amber-900 text-amber-200 border border-amber-700' :
                  'bg-emerald-900 text-emerald-200 border border-emerald-700'
              }`}>
              {loggedInUser.role}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Top-Right Customer Subscription Link & Status Indicator */}
            {isCustomer && (
              customerActivePlan ? (
                <Link
                  href="/?tab=subscriptions"
                  className="flex items-center gap-1.5 text-xs bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Plan: {customerActivePlan.name}</span>
                </Link>
              ) : (
                <Link
                  href="/?tab=subscribe"
                  className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg shadow-sm transition animate-pulse"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>No Subscription — Get Plan</span>
                </Link>
              )
            )}

            <form action={logoutUser}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Global KPI Cards (Only for Admin & Staff) */}
        {!isCustomer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Total Settled Revenue</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">${totalRevenue.toFixed(2)}</p>
                <span className="text-xs text-slate-400 block mt-0.5">{payments.length} transactions</span>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Active Subscriptions</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{activeSubs.length}</p>
                <span className="text-xs text-slate-400 block mt-0.5">Recurring Subscriptions</span>
              </div>
              <Layers className="w-8 h-8 text-indigo-500" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Outstanding Receivable</p>
                <p className="text-2xl font-black text-amber-600 mt-1">${totalOutstanding.toFixed(2)}</p>
                <span className="text-xs text-slate-400 block mt-0.5">Unsettled invoices</span>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Overdue Invoices</p>
                <p className="text-2xl font-black text-rose-600 mt-1">{overdueInvoices.length}</p>
                <span className="text-xs text-rose-500 block mt-0.5">Exceeded net terms</span>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-6 rounded-xl shadow-sm gap-8">
          <Link
            href="/?tab=items"
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${activeTab === 'items'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {isCustomer ? <ShoppingBag className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            {isCustomer ? 'Browse Products' : 'Products Management'}
          </Link>

          {isCustomer && !customerActivePlan && (
            <Link
              href="/?tab=subscribe"
              className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${activeTab === 'subscribe'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" /> Get Subscription
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/?tab=revenue"
              className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${activeTab === 'revenue'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <TrendingUp className="w-4 h-4" /> Revenue & Analytics
            </Link>
          )}

          <Link
            href="/?tab=subscriptions"
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${activeTab === 'subscriptions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Layers className="w-4 h-4" /> {isCustomer ? 'My Subscriptions & Invoices' : 'Subscriptions & Billing'}
          </Link>

          <Link
            href="/?tab=account"
            className={`py-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${activeTab === 'account'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <KeyRound className="w-4 h-4" /> Account & Security
          </Link>
        </div>

        {/* Global Notifications */}
        {tabError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
            {tabError}
          </div>
        )}

        {tabSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-xs font-semibold">
            {tabSuccess}
          </div>
        )}

        {/* TAB 1: PRODUCTS (Interactive Store for Customers, Management for Admin/Staff) */}
        {activeTab === 'items' && (
          isCustomer ? (
            <CustomerProductStore products={products} />
          ) : (
            <div className="space-y-6">
              {isAdmin && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <PlusCircle className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">Add Product</h2>
                  </div>

                  <form action={createSimpleProduct} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Enterprise Cloud ERP"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="salesPrice"
                        required
                        placeholder="200.00"
                        className="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Discount (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="discountPercent"
                        defaultValue="0"
                        className="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Image URL</label>
                      <input
                        type="url"
                        name="imageUrl"
                        placeholder="https://..."
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow transition cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">Available Products</h2>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{products.length} Products</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                      <tr>
                        <th className="py-3 px-6">Product & Image</th>
                        <th className="py-3 px-6">Base Price & Discount %</th>
                        <th className="py-3 px-6">Discounted Final Price</th>
                        <th className="py-3 px-6">Status</th>
                        {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((product) => {
                        const finalPrice = product.salesPrice * (1 - (product.discountPercent || 0) / 100);

                        return (
                          <tr key={product.id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-6 min-w-[260px]">
                              {isAdmin ? (
                                <form id={`edit-form-${product.id}`} action={updateProductDetails} className="space-y-2">
                                  <input type="hidden" name="productId" value={product.id} />
                                  <div className="flex items-center gap-3">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                        <ImageIcon className="w-6 h-6" />
                                      </div>
                                    )}
                                    <div className="space-y-1 w-full">
                                      <input
                                        type="text"
                                        name="name"
                                        defaultValue={product.name}
                                        className="w-full text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800"
                                        required
                                      />
                                      <input
                                        type="url"
                                        name="imageUrl"
                                        defaultValue={product.imageUrl || ''}
                                        placeholder="Paste image URL..."
                                        className="w-full text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600"
                                      />
                                    </div>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-center gap-3">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                      <ImageIcon className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-slate-900 block">{product.name}</span>
                                    <span className="text-xs text-slate-400">{product.type}</span>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-6 min-w-[200px]">
                              {isAdmin ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center">
                                    <span className="text-xs text-slate-400 w-12">Price: $</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      name="salesPrice"
                                      form={`edit-form-${product.id}`}
                                      defaultValue={product.salesPrice}
                                      className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded text-slate-800"
                                      required
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <span className="text-xs text-slate-400 w-12">Disc: %</span>
                                    <input
                                      type="number"
                                      step="0.1"
                                      name="discountPercent"
                                      form={`edit-form-${product.id}`}
                                      defaultValue={product.discountPercent || 0}
                                      className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded text-slate-800"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs">
                                  <span className="font-mono text-slate-800 font-bold">${product.salesPrice.toFixed(2)}</span>
                                  {product.discountPercent > 0 && (
                                    <span className="text-emerald-600 block">-{product.discountPercent}% Off</span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-6 font-mono font-black text-slate-900 text-base">
                              ${finalPrice.toFixed(2)}
                            </td>

                            <td className="py-4 px-6">
                              {product.inStock ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle className="w-3.5 h-3.5" /> In Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3.5 h-3.5" /> Out of Stock
                                </span>
                              )}
                            </td>

                            {canEdit && (
                              <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                                {isAdmin && (
                                  <button
                                    type="submit"
                                    form={`edit-form-${product.id}`}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition cursor-pointer"
                                  >
                                    Save
                                  </button>
                                )}

                                <form action={toggleProductStock} className="inline-block">
                                  <input type="hidden" name="productId" value={product.id} />
                                  <input type="hidden" name="currentStatus" value={String(product.inStock)} />
                                  <button
                                    type="submit"
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${product.inStock
                                        ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                  >
                                    Mark {product.inStock ? 'Out' : 'In'}
                                  </button>
                                </form>

                                {isAdmin && (
                                  <form action={deleteProduct} className="inline-block">
                                    <input type="hidden" name="productId" value={product.id} />
                                    <button
                                      type="submit"
                                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </form>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 2: TAKE SUBSCRIPTION (Customer Tier Selection Page) */}
        {isCustomer && activeTab === 'subscribe' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 py-4">
              <h2 className="text-2xl font-black text-slate-900">Choose Your Subscription Plan</h2>
              <p className="text-xs text-slate-500">
                Unlock automated recurring renewals across 1-month, 3-months, 6-months, 9-months, or 1-year terms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition relative"
                >
                  <div className="space-y-4">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      {plan.interval === '3_MONTHS' ? 'Quarterly' :
                        plan.interval === '6_MONTHS' ? 'Semi-Annual' :
                          plan.interval === '9_MONTHS' ? '9 Months' :
                            plan.interval === 'YEARLY' ? 'Annual Tier' : 'Monthly'}
                    </span>

                    <h3 className="text-xl font-black text-slate-900 mt-2">{plan.name}</h3>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-slate-900">
                        ${(plan.price || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        / {plan.interval.replace('_', ' ').toLowerCase()}
                      </span>
                    </div>

                    <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Automated cycle billing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Pause or cancel at any cycle
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Itemized tax receipts & audit ledger
                      </li>
                    </ul>
                  </div>

                  <form action={enrollInSubscriptionPlan} className="pt-6">
                    <input type="hidden" name="planId" value={plan.id} />
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow transition cursor-pointer"
                    >
                      Subscribe Now
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTIONS & INVOICES */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isCustomer ? 'My Subscription & Invoices' : 'Subscription Engine'}
                </h2>
                {!isCustomer && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gross Active Subscription Run Rate: <strong className="text-indigo-600">${subscriptionGrossRunRate.toFixed(2)}</strong>
                  </p>
                )}
              </div>

              {canEdit && (
                <form action={executeBillingRun}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Trigger Automated Billing Cycle
                  </button>
                </form>
              )}
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  {isAdmin ? 'All Subscriptions' : 'Subscriptions in Account'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="py-3 px-6">Sub #</th>
                      {!isCustomer && <th className="py-3 px-6">Customer</th>}
                      <th className="py-3 px-6">Plan & Interval</th>
                      <th className="py-3 px-6">Recurring Plan Fee</th>
                      <th className="py-3 px-6">Status</th>
                      {canEdit && <th className="py-3 px-6">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No active subscriptions. {isCustomer && <Link href="/?tab=subscribe" className="text-indigo-600 font-bold underline">Click here to subscribe.</Link>}
                        </td>
                      </tr>
                    ) : (
                      subs.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-4 px-6 font-mono font-medium text-slate-700">{s.subNumber}</td>
                          {!isCustomer && <td className="py-4 px-6">{s.customer.name}</td>}
                          <td className="py-4 px-6">
                            <span className="font-semibold block">{s.plan.name}</span>
                            <span className="text-xs text-indigo-600 font-bold">{s.plan.interval}</span>
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-slate-800">${(s.plan.price || 0).toFixed(2)}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                s.status === 'PAUSED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                              {s.status}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="py-4 px-6">
                              {s.status === 'ACTIVE' && (
                                <form action={advanceSubStatus.bind(null, s.id, 'PAUSED')}>
                                  <button className="text-xs font-semibold text-amber-600 hover:text-amber-800 cursor-pointer">
                                    Pause Plan
                                  </button>
                                </form>
                              )}
                              {s.status === 'PAUSED' && (
                                <form action={advanceSubStatus.bind(null, s.id, 'ACTIVE')}>
                                  <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer">
                                    Resume Plan
                                  </button>
                                </form>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  {isCustomer ? 'My Invoices' : 'All Customer Invoices & Direct Settlement'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="py-3 px-6">Invoice #</th>
                      {!isCustomer && <th className="py-3 px-6">Customer</th>}
                      <th className="py-3 px-6">Due Date</th>
                      <th className="py-3 px-6">Total / Outstanding</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                          No invoices recorded yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const balance = inv.totalAmount - inv.paidAmount;
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-6 font-mono font-medium text-slate-700">{inv.invoiceNumber}</td>
                            {!isCustomer && <td className="py-4 px-6">{inv.customer.name}</td>}
                            <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                              {new Date(inv.dueDate).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6 font-semibold">
                              ${inv.totalAmount.toFixed(2)}
                              {balance > 0 && <span className="text-xs text-rose-500 block">Due: ${balance.toFixed(2)}</span>}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {inv.status !== 'PAID' ? (
                                <form action={settleInvoicePayment} className="flex items-center gap-2">
                                  <input type="hidden" name="invoiceId" value={inv.id} />
                                  <input type="hidden" name="amount" value={balance} />
                                  <select name="method" className="text-xs border border-slate-300 rounded px-2 py-1">
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Credit Card">Card</option>
                                  </select>
                                  <button
                                    type="submit"
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 py-1 rounded shadow cursor-pointer"
                                  >
                                    Pay (${balance.toFixed(2)})
                                  </button>
                                </form>
                              ) : (
                                <span className="text-xs text-emerald-600 font-medium">Cleared</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REVENUE (Admin Only) */}
        {isAdmin && activeTab === 'revenue' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Total Units Distributed</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{totalProductUnitsSold}</p>
                <span className="text-xs text-slate-400">Active subscription lines</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Gross Catalog Sales</p>
                <p className="text-2xl font-black text-indigo-600 mt-1">${totalProductGrossRevenue.toFixed(2)}</p>
                <span className="text-xs text-slate-400">Effective sales total</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Total Promo Absorption</p>
                <p className="text-2xl font-black text-amber-600 mt-1">-${totalProductDiscounts.toFixed(2)}</p>
                <span className="text-xs text-slate-400">Total discounts given</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Catalog Net Gross Profit</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">+${totalProductGrossProfit.toFixed(2)}</p>
                <span className="text-xs text-slate-400">After COGS deduction</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Itemized Sales & Gross Revenue Breakdown</h2>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
                  Financial Performance
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="py-3 px-6">Product Item</th>
                      <th className="py-3 px-6">Base Price</th>
                      <th className="py-3 px-6">Discount %</th>
                      <th className="py-3 px-6">Effective Unit Price</th>
                      <th className="py-3 px-6 text-center">Units Sold</th>
                      <th className="py-3 px-6">Gross Sales</th>
                      <th className="py-3 px-6">Total Profit</th>
                      <th className="py-3 px-6 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productAnalytics.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-600">${p.salesPrice.toFixed(2)}</td>
                        <td className="py-4 px-6 font-mono text-xs">
                          {p.discountPercent > 0 ? `${p.discountPercent}%` : '0%'}
                        </td>
                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800">${p.effectivePrice.toFixed(2)}</td>
                        <td className="py-4 px-6 text-center font-black text-slate-900">{p.unitsSold}</td>
                        <td className="py-4 px-6 font-black text-slate-900 font-mono">${p.grossSales.toFixed(2)}</td>
                        <td className="py-4 px-6 font-bold text-emerald-600 font-mono">+${p.grossProfit.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-md text-xs">
                            {p.profitMargin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ACCOUNT & SECURITY */}
        {activeTab === 'account' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {isAdmin && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <ShieldPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Provision Internal Staff Member</h2>
                    <p className="text-xs text-slate-500">Only the administrator can create and assign internal staff members.</p>
                  </div>
                </div>

                <form action={createStaffMember} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Staff Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Alex Taylor"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Staff Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="alex@brightloop.com"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Temporary Password</label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="••••••••••••"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow transition cursor-pointer"
                    >
                      + Provision Staff Account
                    </button>
                  </div>
                </form>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Current Internal Staff ({staffMembers.length})</h3>
                  <div className="divide-y divide-slate-100">
                    {staffMembers.map((staff) => (
                      <div key={staff.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-800">{staff.name}</span>
                          <span className="text-slate-400 font-mono">({staff.email})</span>
                        </div>
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">STAFF</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Security & Account Settings</h2>
                  <p className="text-xs text-slate-500">Manage credentials for {loggedInUser.name}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
                <p className="text-slate-500">Logged in as: <strong className="text-slate-800 font-semibold">{loggedInUser.name}</strong></p>
                <p className="text-slate-500">Email Address: <strong className="text-slate-800 font-mono">{loggedInUser.email}</strong></p>
                <p className="text-slate-500">Role: <span className="font-bold text-indigo-600 uppercase">{loggedInUser.role}</span></p>
              </div>

              <form action={changePassword} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Update Password</h3>
                <p className="text-[11px] text-slate-400">Must be more than 8 characters with at least one uppercase, lowercase, and special character.</p>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    placeholder="••••••••"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    required
                    placeholder="••••••••••••"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    required
                    placeholder="••••••••••••"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-lg shadow transition cursor-pointer"
                >
                  Save New Password
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}