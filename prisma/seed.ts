import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.subscriptionItem.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.discount.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('Brightloop@2026', 10);

    const admin = await prisma.user.create({
        data: { email: 'admin@brightloop.com', name: 'System Admin', passwordHash, role: 'ADMIN' },
    });

    const staff = await prisma.user.create({
        data: { email: 'staff@brightloop.com', name: 'Sales Lead', passwordHash, role: 'STAFF' },
    });

    const customer = await prisma.user.create({
        data: { email: 'client@shop.com', name: 'Metro Retailers', passwordHash, role: 'CUSTOMER' },
    });

    const product = await prisma.product.create({
        data: {
            name: 'Enterprise ERP Suite',
            type: 'Cloud Business License',
            salesPrice: 1200.0,
            costPrice: 450.0,
            notes: 'Core business management system',
            variants: {
                create: [
                    { attribute: 'Brand', value: 'Odoo Edition', priceExtra: 560.0 },
                    { attribute: 'Brand', value: 'Default Edition', priceExtra: 0.0 }
                ]
            }
        }
    });

    const plan = await prisma.plan.create({
        data: {
            name: 'Standard Monthly Plan',
            interval: 'MONTHLY',
            minQuantity: 1,
            canPause: true
        }
    });

    const discount = await prisma.discount.create({
        data: {
            code: 'GROWTH10',
            isPercentage: true,
            value: 10,
            minPurchase: 1000,
            maxUses: 100
        }
    });

    await prisma.subscription.create({
        data: {
            subNumber: 'SUB-2026-0001',
            customerId: customer.id,
            planId: plan.id,
            status: 'ACTIVE',
            taxRate: 18.0,
            discountId: discount.id,
            items: {
                create: [
                    {
                        productId: product.id,
                        variantName: 'Odoo Edition',
                        unitPrice: 1760.0,
                        quantity: 2,
                        taxRate: 18.0,
                        subtotal: 3520.0
                    }
                ]
            }
        }
    });

    console.log('Database seeded successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());