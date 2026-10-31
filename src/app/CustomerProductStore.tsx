'use client';

import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Package, Tag, X } from 'lucide-react';
import { checkoutCustomerCart } from './actions';

interface ProductItem {
    id: string;
    name: string;
    salesPrice: number;
    discountPercent: number;
    imageUrl: string | null;
    inStock: boolean;
    type: string;
}

export default function CustomerProductStore({ products }: { products: ProductItem[] }) {
    const [cart, setCart] = useState<Array<{ product: ProductItem; quantity: number }>>([]);
    const [showCartDrawer, setShowCartDrawer] = useState(false);

    const addToCart = (product: ProductItem) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        // Automatically open drawer on initial add so the customer immediately sees their cart
        setShowCartDrawer(true);
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as Array<{ product: ProductItem; quantity: number }>
        );
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalCartValue = cart.reduce((acc, item) => {
        const finalPrice = item.product.salesPrice * (1 - (item.product.discountPercent || 0) / 100);
        return acc + finalPrice * item.quantity;
    }, 0);

    const cartPayload = JSON.stringify(
        cart.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
    );

    return (
        <div className="space-y-6 relative">
            {/* Top Banner with Cart Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Products Catalog</h2>
                    <p className="text-xs text-slate-500">Select items, add to cart, and generate instant invoice billing.</p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowCartDrawer(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
                >
                    <ShoppingCart className="w-4 h-4" />
                    <span>View Cart</span>
                    {totalCartCount > 0 && (
                        <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-full text-xs font-black ml-1">
                            {totalCartCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Floating Bottom Quick Cart Bar (Visible whenever items are in cart) */}
            {totalCartCount > 0 && !showCartDrawer && (
                <div className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs">
                            {totalCartCount}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Total in Cart</p>
                            <p className="text-sm font-mono font-bold text-emerald-400">${totalCartValue.toFixed(2)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCartDrawer(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                        Review Cart
                    </button>
                </div>
            )}

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => {
                    const finalPrice = product.salesPrice * (1 - (product.discountPercent || 0) / 100);
                    const inCartItem = cart.find((i) => i.product.id === product.id);

                    return (
                        <div
                            key={product.id}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
                        >
                            <div>
                                <div className="h-44 bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden relative">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-12 h-12 text-slate-300" />
                                    )}
                                    {product.discountPercent > 0 && (
                                        <span className="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                            <Tag className="w-3 h-3" /> -{product.discountPercent}%
                                        </span>
                                    )}
                                </div>

                                <div className="p-5 space-y-2">
                                    <span className="text-[11px] font-bold tracking-wide uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                        {product.type}
                                    </span>
                                    <h3 className="font-bold text-slate-900 text-base">{product.name}</h3>

                                    <div className="pt-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-mono font-black text-slate-900 text-xl">
                                                ${finalPrice.toFixed(2)}
                                            </span>
                                            {product.discountPercent > 0 && (
                                                <span className="font-mono text-xs line-through text-slate-400">
                                                    ${product.salesPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 pt-0">
                                {product.inStock ? (
                                    inCartItem ? (
                                        <div className="flex items-center justify-between bg-slate-100 rounded-xl p-1.5 border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(product.id, -1)}
                                                className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowCartDrawer(true)}
                                                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                                            >
                                                {inCartItem.quantity} in cart (view)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(product.id, 1)}
                                                className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => addToCart(product)}
                                            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm transition cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add to Cart
                                        </button>
                                    )
                                ) : (
                                    <button
                                        disabled
                                        className="w-full bg-slate-100 text-slate-400 text-xs font-medium py-2.5 rounded-xl cursor-not-allowed"
                                    >
                                        Out of Stock
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Cart Drawer Modal */}
            {showCartDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowCartDrawer(false)}
                    />

                    {/* Drawer Container */}
                    <div className="relative z-10 bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto">
                        <div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-slate-900 text-base">Your Cart</h3>
                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">
                                        {totalCartCount} items
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCartDrawer(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {cart.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
                                    <p className="text-sm font-semibold text-slate-500">Your cart is currently empty.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 mt-4">
                                    {cart.map(({ product, quantity }) => {
                                        const finalPrice = product.salesPrice * (1 - (product.discountPercent || 0) / 100);
                                        return (
                                            <div key={product.id} className="py-4 flex justify-between items-center gap-3">
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-xs text-slate-900">{product.name}</h4>
                                                    <span className="text-xs font-mono text-slate-500">
                                                        ${finalPrice.toFixed(2)} × {quantity} = ${(finalPrice * quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(product.id, -1)}
                                                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(product.id, 1)}
                                                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(product.id)}
                                                        className="p-1 text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="border-t border-slate-100 pt-4 space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                                    <span>Total Amount Due:</span>
                                    <span className="font-mono text-xl text-emerald-600">${totalCartValue.toFixed(2)}</span>
                                </div>

                                <form action={checkoutCustomerCart}>
                                    <input type="hidden" name="cartItems" value={cartPayload} />
                                    <button
                                        type="submit"
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Place Order & Generate Invoice
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}