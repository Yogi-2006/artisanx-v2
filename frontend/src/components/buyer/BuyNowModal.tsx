import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface BuyNowModalProps {
    productId: string;
    price: number;
    stockQuantity?: number | null;
    onClose: () => void;
}

export default function BuyNowModal({ productId, price, stockQuantity, onClose }: BuyNowModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    // If no stock field exists, cap at 1.
    const hasStockField = stockQuantity !== undefined && stockQuantity !== null;
    const maxQty = hasStockField ? stockQuantity : 1;
    
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/orders/direct', {
                product_id: productId,
                quantity: quantity,
                notes: notes
            });
            // Navigate to orders page or detail
            navigate(`/buyer/orders/${res.data.order_id}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || t('buy_now.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8">
                <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                    <h2 className="text-xl font-bold text-on-surface">{t('buy_now.title')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}
                    
                    {!hasStockField && (
                        <div className="p-4 bg-orange-50 text-orange-800 rounded-xl text-sm flex items-start gap-3 border border-orange-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-orange-500" />
                            {t('buy_now.no_stock_warning')}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">{t('buy_now.quantity')}</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                min="1" 
                                max={maxQty}
                                value={quantity} 
                                onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), maxQty))}
                                className="w-24 p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-center font-bold"
                            />
                            <span className="text-sm text-stone-500">
                                {hasStockField ? `${stockQuantity} available` : 'Max 1'}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">{t('buy_now.notes')}</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-4 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary min-h-[100px] resize-none text-sm"
                            placeholder={t('buy_now.notes_placeholder')}
                        />
                    </div>
                    
                    <div className="flex justify-between items-center py-4 border-t border-stone-100">
                        <span className="font-bold text-stone-600">{t('buy_now.total')}</span>
                        <span className="text-2xl font-bold text-primary">₹{(price * quantity).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-stone-100 text-stone-700 rounded-full font-bold hover:bg-stone-200 transition-colors"
                        >
                            {t('buy_now.cancel')}
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={loading || (hasStockField && (stockQuantity || 0) < quantity)}
                            className="flex-1 py-3 px-4 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('buy_now.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
