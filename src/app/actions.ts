'use server';

import { prisma } from '@/lib/prisma';
import { runBillingCycle } from '@/lib/billing';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redirect } from 'next/navigation';

// Helper: Password complexity validator (>8 chars, uppercase, lowercase, special char)
function validatePasswordComplexity(password: string): string | null {
    if (password.length <= 8) {
        return 'Password must be more than 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least one special character';
    }
    return null;
}

// 1. Customer Self-Registration
export async function registerCustomer(formData: FormData) {
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!name || !email || !password || !confirmPassword) {
        redirect('/register?error=Please fill in all fields');
    }

    if (password !== confirmPassword) {
        redirect('/register?error=Passwords do not match');
    }

    const complexityError = validatePasswordComplexity(password);
    if (complexityError) {
        redirect(`/register?error=${encodeURIComponent(complexityError)}`);
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        redirect('/register?error=An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
            role: 'CUSTOMER',
        },
    });

    const cookieStore = await cookies();
    cookieStore.set('session_user_id', newUser.id, { path: '/', httpOnly: true });
    cookieStore.set('user_role', newUser.role, { path: '/' });

    redirect('/');
}

// 2. Admin-Only Staff Creation
export async function createStaffMember(formData: FormData) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;

    if (!userId) {
        redirect('/login');
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.role !== 'ADMIN') {
        redirect('/?tab=account&error=Unauthorized: Only admins can add staff members');
    }

    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const tempPassword = formData.get('password') as string;

    if (!name || !email || !tempPassword) {
        redirect('/?tab=account&error=All fields are required');
    }

    const complexityError = validatePasswordComplexity(tempPassword);
    if (complexityError) {
        redirect(`/?tab=account&error=${encodeURIComponent(complexityError)}`);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        redirect('/?tab=account&error=A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
            role: 'STAFF',
        },
    });

    redirect('/?tab=account&success=Staff member created successfully');
}

// 3. Request Password Reset (Sends reset token)
export async function requestPasswordReset(formData: FormData) {
    const email = (formData.get('email') as string)?.trim().toLowerCase();

    if (!email) {
        redirect('/forgot-password?error=Please provide your email');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Return generic message for user enumeration prevention
        redirect('/forgot-password?success=If that email exists in our records, a reset link has been issued.');
    }

    // Invalidate any older tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiration

    await prisma.passwordResetToken.create({
        data: {
            token: resetToken,
            userId: user.id,
            expiresAt,
        },
    });

    console.log(`\n================ PASSWORD RESET DISPATCH ================`);
    console.log(`To: ${user.email}`);
    console.log(`Reset Link: http://localhost:3000/reset-password?token=${resetToken}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log(`=========================================================\n`);

    redirect('/forgot-password?success=Password reset instructions have been dispatched to your email.');
}

// 4. Reset Password with Token
export async function resetPasswordWithToken(formData: FormData) {
    const token = formData.get('token') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!token || !newPassword || !confirmPassword) {
        redirect(`/reset-password?token=${token}&error=Please fill in all fields`);
    }

    if (newPassword !== confirmPassword) {
        redirect(`/reset-password?token=${token}&error=Passwords do not match`);
    }

    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) {
        redirect(`/reset-password?token=${token}&error=${encodeURIComponent(complexityError)}`);
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
        redirect('/login?error=Invalid or expired password reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
    });

    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });

    redirect('/login?success=Password reset successfully. Please log in.');
}

// 5. Existing Password Update (Self-service inside portal)
export async function changePassword(formData: FormData) {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmNewPassword = formData.get('confirmNewPassword') as string;

    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;

    if (!userId) {
        redirect('/login');
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        redirect('/?tab=account&error=Please provide all password fields');
    }

    if (newPassword !== confirmNewPassword) {
        redirect('/?tab=account&error=New passwords do not match');
    }

    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) {
        redirect(`/?tab=account&error=${encodeURIComponent(complexityError)}`);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        redirect('/login');
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
        redirect('/?tab=account&error=Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
    });

    redirect('/?tab=account&success=Password updated successfully');
}

export async function loginUser(formData: FormData) {
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
        redirect('/login?error=Please fill all fields');
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        redirect('/login?error=Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        redirect('/login?error=Invalid email or password');
    }

    const cookieStore = await cookies();
    cookieStore.set('session_user_id', user.id, { path: '/', httpOnly: true });
    cookieStore.set('user_role', user.role, { path: '/' });

    redirect('/');
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete('session_user_id');
    cookieStore.delete('user_role');
    redirect('/login');
}

export async function createSimpleProduct(formData: FormData) {
    const name = formData.get('name') as string;
    const salesPrice = parseFloat(formData.get('salesPrice') as string);
    const discountPercent = parseFloat(formData.get('discountPercent') as string || '0');
    const imageUrl = (formData.get('imageUrl') as string)?.trim() || null;
    const inStock = formData.get('inStock') === 'true';

    await prisma.product.create({
        data: {
            name,
            salesPrice,
            costPrice: 0,
            discountPercent,
            imageUrl,
            inStock,
        },
    });

    revalidatePath('/?tab=items');
}

export async function updateProductDetails(formData: FormData) {
    const productId = formData.get('productId') as string;
    const name = formData.get('name') as string;
    const salesPrice = parseFloat(formData.get('salesPrice') as string);
    const discountPercent = parseFloat(formData.get('discountPercent') as string || '0');
    const imageUrl = (formData.get('imageUrl') as string)?.trim() || null;

    await prisma.product.update({
        where: { id: productId },
        data: {
            name,
            salesPrice,
            discountPercent,
            imageUrl,
        },
    });

    revalidatePath('/?tab=items');
}

export async function deleteProduct(formData: FormData) {
    const productId = formData.get('productId') as string;

    await prisma.subscriptionItem.deleteMany({
        where: { productId },
    });

    await prisma.product.delete({
        where: { id: productId },
    });

    revalidatePath('/?tab=items');
}

export async function toggleProductStock(formData: FormData) {
    const productId = formData.get('productId') as string;
    const currentStatus = formData.get('currentStatus') === 'true';

    await prisma.product.update({
        where: { id: productId },
        data: {
            inStock: !currentStatus,
        },
    });

    revalidatePath('/?tab=items');
}

export async function createCustomPlan(formData: FormData) {
    const name = formData.get('name') as string;
    const interval = formData.get('interval') as string;
    const price = parseFloat(formData.get('price') as string || '0');
    const minQuantity = parseInt(formData.get('minQuantity') as string || '1', 10);

    await prisma.plan.create({
        data: {
            name,
            interval,
            price,
            minQuantity,
        },
    });

    revalidatePath('/?tab=subscriptions');
}

export async function updatePlanPricing(formData: FormData) {
    const planId = formData.get('planId') as string;
    const name = formData.get('name') as string;
    const interval = formData.get('interval') as string;
    const price = parseFloat(formData.get('price') as string || '0');
    const minQuantity = parseInt(formData.get('minQuantity') as string, 10);

    await prisma.plan.update({
        where: { id: planId },
        data: {
            name,
            interval,
            price,
            minQuantity,
        },
    });

    revalidatePath('/?tab=subscriptions');
}

export async function deletePlan(formData: FormData) {
    const planId = formData.get('planId') as string;
    await prisma.plan.delete({ where: { id: planId } });
    revalidatePath('/?tab=subscriptions');
}

export async function updateSubscriptionItemPrice(formData: FormData) {
    const itemId = formData.get('itemId') as string;
    const unitPrice = parseFloat(formData.get('unitPrice') as string);

    const item = await prisma.subscriptionItem.findUnique({
        where: { id: itemId },
    });

    if (item) {
        const subtotal = unitPrice * item.quantity;
        await prisma.subscriptionItem.update({
            where: { id: itemId },
            data: {
                unitPrice,
                subtotal,
            },
        });
    }

    revalidatePath('/?tab=subscriptions');
}

export async function advanceSubStatus(subId: string, nextStatus: string) {
    await prisma.subscription.update({
        where: { id: subId },
        data: { status: nextStatus },
    });
    revalidatePath('/?tab=subscriptions');
}

export async function executeBillingRun() {
    await runBillingCycle();
    revalidatePath('/?tab=subscriptions');
}

export async function settleInvoicePayment(formData: FormData) {
    const invoiceId = formData.get('invoiceId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const method = (formData.get('method') as string) || 'Bank Transfer';

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return;

    const updatedPaid = invoice.paidAmount + amount;
    const isPaid = updatedPaid >= invoice.totalAmount;

    await prisma.payment.create({
        data: {
            invoiceId,
            amount,
            method,
            notes: 'Logged via settlement console',
        },
    });

    await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
            paidAmount: updatedPaid,
            status: isPaid ? 'PAID' : invoice.status,
        },
    });

    revalidatePath('/?tab=subscriptions');
}
// --- CUSTOMER CART CHECKOUT & DIRECT SUBSCRIPTION ACTIONS ---

export async function checkoutCustomerCart(formData: FormData) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;

    if (!userId) {
        redirect('/login');
    }

    const itemsJson = formData.get('cartItems') as string;
    if (!itemsJson) {
        redirect('/?tab=products&error=Cart is empty');
    }

    const cart: Array<{ productId: string; quantity: number }> = JSON.parse(itemsJson);
    if (cart.length === 0) {
        redirect('/?tab=products&error=Cart is empty');
    }

    const productIds = cart.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
    });

    let totalAmount = 0;
    for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
            const effectivePrice = prod.salesPrice * (1 - (prod.discountPercent || 0) / 100);
            totalAmount += effectivePrice * item.quantity;
        }
    }

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    await prisma.invoice.create({
        data: {
            invoiceNumber,
            customerId: userId,
            status: 'CONFIRMED',
            issueDate: now,
            dueDate,
            subtotal: totalAmount,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount,
            paidAmount: 0,
        },
    });

    revalidatePath('/?tab=subscriptions');
    redirect('/?tab=subscriptions&success=Order placed successfully. Complete your payment below.');
}

export async function enrollInSubscriptionPlan(formData: FormData) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_user_id')?.value;

    if (!userId) {
        redirect('/login');
    }

    const planId = formData.get('planId') as string;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    if (!plan) {
        redirect('/?tab=subscribe&error=Invalid plan selected');
    }

    const now = new Date();
    const subCount = await prisma.subscription.count();
    const subNumber = `SUB-${now.getFullYear()}-${String(subCount + 1).padStart(4, '0')}`;

    const sub = await prisma.subscription.create({
        data: {
            subNumber,
            customerId: userId,
            planId: plan.id,
            status: 'ACTIVE',
            startDate: now,
            taxRate: 0,
        },
    });

    const dueDate = new Date();
    switch (plan.interval) {
        case '3_MONTHS':
            dueDate.setMonth(dueDate.getMonth() + 3);
            break;
        case '6_MONTHS':
            dueDate.setMonth(dueDate.getMonth() + 6);
            break;
        case '9_MONTHS':
            dueDate.setMonth(dueDate.getMonth() + 9);
            break;
        case 'YEARLY':
            dueDate.setFullYear(dueDate.getFullYear() + 1);
            break;
        default:
            dueDate.setMonth(dueDate.getMonth() + 1);
            break;
    }

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    await prisma.invoice.create({
        data: {
            invoiceNumber,
            subscriptionId: sub.id,
            customerId: userId,
            status: 'CONFIRMED',
            issueDate: now,
            dueDate,
            subtotal: plan.price || 0,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: plan.price || 0,
            paidAmount: 0,
        },
    });

    revalidatePath('/?tab=subscriptions');
    redirect('/?tab=subscriptions&success=Subscription activated! View your invoice below.');
}