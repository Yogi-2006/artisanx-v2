import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Clock, ShieldCheck, Mail, Heart, Share2, Copy, Check, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import api from '../../lib/api';
import ProductPassport from '../../components/product/ProductPassport';
import EnquiryForm from '../../components/buyer/EnquiryForm';
import BuyNowModal from '../../components/buyer/BuyNowModal';
import { useTranslation } from 'react-i18next';
import { useBuyerStore } from '../../stores/buyerStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BuyerProductPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { savedProducts, toggleSavedProduct, addRecentlyViewed } = useBuyerStore();
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [showEnquiryForm, setShowEnquiryForm] = useState(false);
    const [showBuyNowModal, setShowBuyNowModal] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchDetail() {
            try {
                // Using axios for public endpoint since catalogue detail is public
                // but we might want to use authenticated api if we add buyer-specific pricing later
                const response = await axios.get(`${API_URL}/products/catalogue/detail/${id}`);
                const data = response.data;
                setDetail(data);
                
                // Add to recently viewed
                if (data.product) {
                    addRecentlyViewed({
                        id: data.product.id,
                        title: data.product.title,
                        price: data.product.price,
                        image_url: data.images?.[0]?.image_url,
                        artisan_name: data.artisan?.artisan_name
                    });
                }

                // Track view analytics in background
                api.post('/analytics/track', {
                    product_id: id,
                    event_type: 'view'
                }).catch(e => console.error(e));

            } catch (err: any) {
                setError(err.response?.data?.detail || 'Product not found or unavailable.');
            } finally {
                setLoading(false);
            }
        }
        
        if (id) {
            fetchDetail();
        }
    }, [id, addRecentlyViewed]);

    const handleEnquiry = () => {
        setShowEnquiryForm(true);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest p-6">
                <div className="bg-surface p-8 rounded-3xl shadow-sm text-center w-full max-w-sm border border-outline-variant">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Unavailable</h2>
                    <p className="text-stone-600">{error}</p>
                    <button onClick={() => navigate('/buyer')} className="mt-6 px-6 py-2 bg-stone-100 rounded-full font-bold text-stone-700">Back to Home</button>
                </div>
            </div>
        );
    }

    const { product, artisan, images, passport } = detail;
    const mainImages = images.length > 0 ? images : [{ image_url: '' }];
    const isSaved = savedProducts.some(p => p.id === product.id);

    return (
        <div className="w-full relative pb-24 bg-surface-container-lowest min-h-screen">
            {/* Top Nav */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
                <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm transition-all"
                        >
                            <Share2 className="w-5 h-5 text-stone-600" />
                        </button>
                        
                        {showShareMenu && (
                            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left text-sm font-bold text-stone-700"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button 
                                    onClick={() => {
                                        window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this product on ArtisanX: ${window.location.href}`)}`, '_blank');
                                        setShowShareMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left text-sm font-bold text-stone-700"
                                >
                                    <svg className="w-4 h-4 text-green-500 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    WhatsApp
                                </button>
                                {navigator.share && (
                                    <button 
                                        onClick={() => {
                                            navigator.share({
                                                title: product.title,
                                                text: `Check out ${product.title} on ArtisanX`,
                                                url: window.location.href
                                            });
                                            setShowShareMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left text-sm font-bold text-stone-700"
                                    >
                                        <Share2 className="w-4 h-4 text-primary" />
                                        More Options
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => toggleSavedProduct(product)} 
                        className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm transition-all"
                    >
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-stone-600'}`} />
                    </button>
                </div>
            </div>

            {/* Image Gallery */}
            <div className="w-full aspect-[4/5] bg-stone-200 relative overflow-hidden">
                {mainImages[currentImageIdx].image_url ? (
                    <img src={mainImages[currentImageIdx].image_url} alt="Product" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
                )}
                {mainImages.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        {mainImages.map((_: any, idx: number) => (
                            <button 
                                key={idx} 
                                onClick={() => setCurrentImageIdx(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${currentImageIdx === idx ? 'bg-white w-4' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="px-6 py-6 -mt-6 relative bg-surface-container-lowest rounded-t-3xl text-on-surface">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800">{product.title}</h1>
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">{product.category}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">₹{product.price}</div>
                </div>
                
                <p className="text-stone-600 mt-4 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-6 border-y border-stone-200 py-6">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-stone-400" />
                        <div>
                            <div className="text-xs text-stone-500">MOQ</div>
                            <div className="font-bold text-stone-800">{product.moq || 1} units</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-stone-400" />
                        <div>
                            <div className="text-xs text-stone-500">Lead Time</div>
                            <div className="font-bold text-stone-800">{product.lead_time_days || 0} days</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center rounded bg-stone-100 text-stone-500 text-xs font-bold">Qty</div>
                        <div>
                            <div className="text-xs text-stone-500">Available</div>
                            <div className="font-bold text-stone-800">
                                {product.is_made_to_order ? 'Made to Order' : `${product.stock_quantity || 0} units`}
                            </div>
                        </div>
                    </div>
                </div>

                {(product.materials || product.dimensions || product.care_instructions) && (
                    <div className="mt-6 space-y-4">
                        <h3 className="font-bold text-stone-800 text-lg">Product Details</h3>
                        {product.materials && product.materials.list && product.materials.list.length > 0 && (
                            <div>
                                <div className="text-sm font-bold text-stone-700 mb-1">{t('products.materials')}</div>
                                <div className="flex flex-wrap gap-2">
                                    {product.materials.list.map((m: any, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-white border border-stone-200 rounded-full text-xs text-stone-600">{m.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {product.dimensions && (
                            <div>
                                <div className="text-sm font-bold text-stone-700">Dimensions</div>
                                <div className="text-sm text-stone-600">{product.dimensions}</div>
                            </div>
                        )}
                        {product.care_instructions && (
                            <div>
                                <div className="text-sm font-bold text-stone-700">Care Instructions</div>
                                <div className="text-sm text-stone-600">{product.care_instructions}</div>
                            </div>
                        )}
                    </div>
                )}

                {artisan && (
                    <div className="mt-8 bg-surface border border-outline-variant rounded-3xl p-5 shadow-sm">
                        <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-600" /> Artisan Profile</h3>
                        <div 
                            className="flex gap-4 items-center mb-4 cursor-pointer hover:bg-stone-50 p-2 -mx-2 rounded-xl transition-colors"
                            onClick={() => navigate(`/buyer/artisan/${artisan.id}`)}
                        >
                            <div className="w-16 h-16 rounded-full bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
                                {artisan.profile_photo_url ? (
                                    <img src={artisan.profile_photo_url} alt={artisan.artisan_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center leading-tight">No Photo</div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800">{artisan.artisan_name}</h4>
                                <div className="text-sm text-stone-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {artisan.location || 'Unknown Location'}</div>
                                <div className="text-xs text-on-secondary-container font-bold mt-1 bg-secondary-container px-2 py-0.5 rounded w-max">{artisan.craft_type || t('auth.artisan')}</div>
                            </div>
                        </div>
                        {artisan.craft_story && (
                            <p className="text-sm text-stone-600 leading-relaxed italic border-l-2 border-stone-200 pl-3">"{artisan.craft_story}"</p>
                        )}
                    </div>
                )}

                {passport && (
                    <div className="mt-8">
                        <h3 className="font-bold text-stone-800 text-lg mb-4">Product Passport</h3>
                        <ProductPassport passportData={passport.passport_data} qrCodeUrl={passport.qr_code_url} shareableUrl={passport.shareable_url} />
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 mobile-shell-width p-4 bg-surface/90 backdrop-blur-md border-t border-outline-variant flex gap-3 z-20">
                <button onClick={handleEnquiry} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-full font-bold hover:bg-stone-200 flex items-center justify-center gap-2 transition-all">
                    <Mail className="w-5 h-5" /> {t('buyer.send_enquiry')}
                </button>
                <button onClick={() => setShowBuyNowModal(true)} className="flex-1 py-3 bg-primary text-on-primary rounded-full font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-all">
                    <ShoppingCart className="w-5 h-5" /> {t('buy_now.title')}
                </button>
            </div>

            {showEnquiryForm && (
                <EnquiryForm 
                    productId={product.id} 
                    moq={product.moq || 1} 
                    onClose={() => setShowEnquiryForm(false)} 
                />
            )}
            
            {showBuyNowModal && (
                <BuyNowModal 
                    productId={product.id} 
                    price={product.price}
                    stockQuantity={product.stock_quantity}
                    onClose={() => setShowBuyNowModal(false)}
                />
            )}
        </div>
    );
}
