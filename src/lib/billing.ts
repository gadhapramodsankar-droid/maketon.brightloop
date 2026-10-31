import { prisma } from '@/lib/prisma';

export async function runBillingCycle() {
    const activeSubs = await prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: {
            customer: true,
            plan: true,
            discount: true,
            items: {
                include: {
                    product: true,
                },
            },
        },
    });

    const now = new Date();

    for (const sub of activeSubs) {
        const dueDate = new Date();
        // Dynamically adjust cycle expiration/due date per subscription plan duration
        switch (sub.plan.interval) {
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
            default: // MONTHLY
                dueDate.setMonth(dueDate.getMonth() + 1);
                break;
        }

        // 1. Calculate items subtotal factoring in line item discounts
        let itemsSubtotal = 0;
        for (const item of sub.items) {
            const discountPercent = item.product.discountPercent || 0;
            const effectiveUnitPrice = item.unitPrice * (1 - discountPercent / 100);
            itemsSubtotal += effectiveUnitPrice * item.quantity;
        }

        // Include the base interval plan fee if configured
        const subtotal = itemsSubtotal + (sub.plan.price || 0);

        // 2. Apply subscription-level coupon discount
        let discountAmount = 0;
        if (sub.discount) {
            if (sub.discount.isPercentage) {
                discountAmount = (subtotal * sub.discount.value) / 100;
            } else {
                discountAmount = Math.min(subtotal, sub.discount.value);
            }
        }

        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = (taxableAmount * sub.taxRate) / 100;
        const totalAmount = taxableAmount + taxAmount;

        // 3. Generate sequential invoice number
        const invoiceCount = await prisma.invoice.count();
        const invoiceNumber = `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

        await prisma.invoice.create({
            data: {
                invoiceNumber,
                subscriptionId: sub.id,
                customerId: sub.customerId,
                status: 'CONFIRMED',
                issueDate: now,
                dueDate,
                subtotal,
                discountAmount,
                taxAmount,
                totalAmount,
                paidAmount: 0,
            },
        });
    }
}